# Lochord 設計書（Phase 2: 設定UI・UX改善）

## 概要

Phase 1 で実装した基本機能に、ユーザー設定UI・UX改善を追加する。  
設定は `Zustand persist` でローカルに永続化し、Rust側のコマンドにも設定値を渡す方式を採用する。

---

## 1. 設定項目一覧

### 1-1. プレイリスト設定

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `pathMode` | `"relative" \| "absolute" \| "relative-from-root"` | `"relative"` | M3Uに書くパス形式 |
| `playlistDir` | `string \| null` | `null` (= `{musicRoot}/Playlists/`) | プレイリスト保存先ディレクトリ（null の場合デフォルト） |
| `saveExtension` | `"m3u8" \| "m3u" \| "txt" \| "csv"` | `"m3u8"` | 保存ファイル拡張子・出力形式 |
| `autoSave` | `boolean` | `false` | トラック操作後に自動保存するか |

### 1-2. UIテーマ設定

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `colorTheme` | `"dark" \| "light" \| "system"` | `"system"` | カラーテーマ |
| `language` | `"ja" \| "en"` | `"ja"` | 表示言語（Phase 2 は UI 文言のみ） |

### 1-3. スキャン設定

| 設定キー | 型 | デフォルト | 説明 |
|---|---|---|---|
| `scanExtensions` | `string[]` | `["flac","mp3","aac","wav","m4a","ogg","opus"]` | スキャン対象の拡張子 |
| `excludePatterns` | `string[]` | `[]` | スキャン除外ディレクトリ名パターン（例: `["sample","bonus"]`） |

---

## 2. パスモードの詳細仕様

### relative（デフォルト・現行動作）
プレイリストファイルから音楽ファイルへの相対パス。  
`Playlists/` からの移動ポータビリティが高い。

```
#EXTINF:253,Artist - Title
../Artist - Album (2024)/01. Title.flac
```

### absolute
OS のフルパス。異なるフォルダへのプレイリスト移動時に壊れるが、  
メディアプレイヤーによっては絶対パスのみ対応のものがある。

```
#EXTINF:253,Artist - Title
/home/user/Music/Artist - Album (2024)/01. Title.flac
```

### relative-from-root
ミュージックルートを起点とした相対パス（ポータブルなライブラリ共有向け）。

```
#EXTINF:253,Artist - Title
Artist - Album (2024)/01. Title.flac
```

---

## 3. 保存形式の詳細仕様

### m3u8（デフォルト）
拡張子 `.m3u8`、UTF-8 BOM なし、`#EXTM3U` ヘッダ付き。  
現在の実装そのまま。

### m3u
拡張子 `.m3u`、`#EXTM3U` ヘッダ付き。  
内容は m3u8 と同じ（UTF-8）。一部のプレイヤー向け互換。

### txt
拡張子 `.txt`、各行にパスのみ出力（`#EXTINF` なし）。  
シンプルなパスリストとして使える形式。

```
/home/user/Music/Artist/01. Title.flac
/home/user/Music/Artist/02. Title.flac
```

### csv
拡張子 `.csv`、ヘッダ行付き。  
スプレッドシートで開いて編集したいユーザー向け。

```csv
title,artist,duration_sec,path
Title A,Artist X,253,../Artist/01. Title.flac
Title B,Artist X,189,../Artist/02. Title.flac
```

---

## 4. 新規型定義

### `AppSettings` エンティティ

```typescript
// src/domain/entities/AppSettings.ts

export type PathMode = "relative" | "absolute" | "relative-from-root";
export type SaveExtension = "m3u8" | "m3u" | "txt" | "csv";
export type ColorTheme = "dark" | "light" | "system";
export type Language = "ja" | "en";

export interface AppSettings {
  // Playlist
  pathMode: PathMode;
  playlistDir: string | null;       // null = {musicRoot}/Playlists/
  saveExtension: SaveExtension;
  autoSave: boolean;

  // UI
  colorTheme: ColorTheme;
  language: Language;

  // Scan
  scanExtensions: string[];
  excludePatterns: string[];
}

export const DEFAULT_SETTINGS: AppSettings = {
  pathMode: "relative",
  playlistDir: null,
  saveExtension: "m3u8",
  autoSave: false,
  colorTheme: "system",
  language: "ja",
  scanExtensions: ["flac", "mp3", "aac", "wav", "m4a", "ogg", "opus"],
  excludePatterns: [],
};
```

---

## 5. 状態管理の変更

### `useSettingsStore` (新規)

```typescript
// src/application/store/useSettingsStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AppSettings, DEFAULT_SETTINGS } from "../../domain/entities/AppSettings";

interface SettingsState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  resolvePlaylistDir: (musicRoot: string) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
      resolvePlaylistDir: (musicRoot) => {
        const { playlistDir } = get().settings;
        if (playlistDir) return playlistDir;
        return `${musicRoot.replace(/\\/g, "/")}/Playlists`;
      },
    }),
    {
      name: "lochord-settings",
    }
  )
);
```

### `useLochordStore` への影響

`createPlaylist` でプレイリスト保存先を `useSettingsStore.resolvePlaylistDir` から取得するよう変更する。  
`saveCurrentPlaylist` で `pathMode` を Rust コマンドに渡す（後述）。

---

## 6. Rust コマンド変更

### `save_playlist` の拡張

現行の `save_playlist(path, tracks)` に `options: PlaylistSaveOptions` を追加する。

```rust
// src-tauri/src/commands/m3u.rs

#[derive(serde::Deserialize, Debug)]
pub struct PlaylistSaveOptions {
    pub path_mode: String,        // "relative" | "absolute" | "relative-from-root"
    pub music_root: Option<String>, // relative-from-root 時に使用
    pub format: String,           // "m3u8" | "m3u" | "txt" | "csv"
}

#[tauri::command]
pub async fn save_playlist(
    path: String,
    tracks: Vec<Track>,
    options: PlaylistSaveOptions,
) -> Result<bool, String> {
    // ...
}
```

### 新コマンド: `select_directory`

プレイリスト保存先ディレクトリをダイアログで選択する。

```rust
#[tauri::command]
pub async fn select_directory(app: tauri::AppHandle) -> Result<Option<String>, String> {
    use tauri_plugin_dialog::DialogExt;
    let result = app.dialog()
        .file()
        .set_directory("/")
        .blocking_pick_folder();
    Ok(result.map(|p| p.to_string_lossy().to_string()))
}
```

---

## 7. UIコンポーネント設計

### 7-1. 設定ダイアログ `SettingsModal`

**表示方法**: ヘッダ右端の歯車アイコン（⚙）ボタンをクリックでモーダル表示。

```
src/presentation/components/SettingsModal/
└── SettingsModal.tsx
```

**ダイアログ構成（タブ形式）**:

```
┌─────────────────────────────────────────────────┐
│ ⚙ 設定                                    [✕]  │
├──────────┬──────────────────────────────────────┤
│ プレイリスト│ パス形式                            │
│ スキャン  │  ● 相対パス（推奨）                  │
│ 表示     │  ○ 絶対パス                           │
│          │  ○ ルートからの相対パス                │
│          │                                      │
│          │ 保存先ディレクトリ                     │
│          │  [/home/user/Music/Playlists] [参照]  │
│          │  ☐ デフォルトにリセット               │
│          │                                      │
│          │ 保存形式                              │
│          │  [m3u8 ▼]                            │
│          │                                      │
│          │ 自動保存                              │
│          │  ☐ トラック変更後に自動保存            │
│          │                                      │
│          │        [キャンセル] [設定を保存]       │
└──────────┴──────────────────────────────────────┘
```

**スキャン タブ**:
```
拡張子フィルター
  ☑ flac  ☑ mp3  ☑ aac  ☑ wav  ☑ m4a  ☑ ogg  ☑ opus
  [+ 追加] [- 削除]

除外パターン（ディレクトリ名）
  [bonus     ×]  [sample    ×]  [+ 追加]
```

**表示 タブ**:
```
テーマ
  ● システム設定に従う  ○ ダーク  ○ ライト

言語
  [日本語 ▼]
```

---

### 7-2. ヘッダへの設定ボタン追加

```tsx
// MainPage.tsx ヘッダ部分に追加
<button className="settings-btn" onClick={() => setSettingsOpen(true)} title="設定">
  <Settings size={16} />
</button>
```

---

## 8. UX 改善提案

### 8-1. 未保存変更インジケーター（優先度: 高）

プレイリストに変更が加わった際、保存ボタン横に「●未保存」バッジを表示。  
`Playlist` エンティティに `isDirty: boolean` フラグを追加する。

```typescript
// Playlist.ts
export type Playlist = {
  name: string;
  path: string;
  tracks: Track[];
  isDirty: boolean;   // 追加
};
```

### 8-2. ライブラリ内検索・フィルター（優先度: 高）

`LibraryBrowser` の上部に検索バーを追加。  
タイトル・アーティスト名でインクリメンタルフィルタリング。

```
┌──────────────────────────────────────────────┐
│ 📂 ライブラリ  [🔍 検索...              ]    │
```

### 8-3. トラック数・合計時間の表示（優先度: 中）

TrackList のヘッダ部に統計情報を表示する。

```
[プレイリスト名]       13曲 / 52:47    [保存]
```

### 8-4. キーボードショートカット（優先度: 中）

| ショートカット | 操作 |
|---|---|
| `Ctrl+S` | 現在のプレイリストを保存 |
| `Ctrl+N` | 新規プレイリスト作成 |
| `Delete` | 選択トラックをプレイリストから削除 |
| `Ctrl+Z` | 直前のトラック操作を元に戻す（undo） |
| `F5` | ライブラリ再スキャン |
| `,` | 設定を開く |

### 8-5. 削除確認ダイアログ（優先度: 高）

プレイリスト削除時に確認モーダルを表示する。  
現在は即削除のため、誤操作リスクがある。

```
┌────────────────────────────────────┐
│ ⚠ プレイリストを削除しますか？     │
│                                    │
│  「お気に入り」を削除します。      │
│  この操作は元に戻せません。        │
│                                    │
│         [キャンセル]  [削除]       │
└────────────────────────────────────┘
```

### 8-6. プレイリストの並び替え（優先度: 低）

左ペインでプレイリスト名をドラッグして並び替えできるようにする。  
`dnd-kit` を流用可能。

### 8-7. トラスト済み拡張子の設定反映（優先度: 中）

スキャン設定の `scanExtensions` を Rust コマンド `scan_music_directory` に渡し、  
動的にフィルタできるようにする。

```typescript
// scanLibrary usecase に渡す
await scanMusicDirectory(musicRoot, settings.scanExtensions);
```

### 8-8. ステータスバー（優先度: 低）

画面下部にスキャン中・保存完了などのトースト的な状態表示領域を追加。  
現在のエラーモーダルを補完する。

### 8-9. プレイリストのエクスポート/インポート（優先度: 低）

- **エクスポート**: 選択プレイリストを任意の場所に別名保存
- **インポート**: `Playlists/` 外の .m3u / .m3u8 ファイルを取り込む

---

## 9. ディレクトリ構造の変更

```
src/
├── domain/
│   └── entities/
│       └── AppSettings.ts          ← 新規
├── application/
│   └── store/
│       ├── useLochordStore.ts      ← playlistDir, pathMode を settingsStore から参照するよう変更
│       └── useSettingsStore.ts     ← 新規
└── presentation/
    └── components/
        └── SettingsModal/
            └── SettingsModal.tsx   ← 新規

src-tauri/src/commands/
├── m3u.rs      ← save_playlist に options 追加, select_directory 追加
└── fs.rs       ← scan_music_directory に extensions パラメータ追加
```

---

## 10. 実装ステップ

```
Step 1  AppSettings 型・DEFAULT_SETTINGS 定義
Step 2  useSettingsStore 実装（永続化付き）
Step 3  Rust: save_playlist に PlaylistSaveOptions 追加
Step 4  Rust: select_directory コマンド追加
Step 5  Rust: scan_music_directory に extensions 引数追加
Step 6  SettingsModal UI 実装（タブ: プレイリスト / スキャン / 表示）
Step 7  MainPage ヘッダに⚙ボタン追加・SettingsModal 組み込み
Step 8  useLochordStore: createPlaylist を settingsStore 連携に変更
Step 9  UX 改善: isDirty フラグ・未保存インジケーター
Step 10 UX 改善: ライブラリ内検索バー
Step 11 UX 改善: 削除確認ダイアログ
Step 12 UX 改善: キーボードショートカット
Step 13 UX 改善: トラック数・合計時間表示
```

---

## 11. 後方互換性

- 既存の `lochord-storage` (musicRoot) はそのまま維持。
- 設定は別キー `lochord-settings` で保存するため、移行処理不要。
- `save_playlist` コマンドの `options` 引数はデフォルト値を持たせ、フロントエンド未対応時でも動作するよう Rust 側で `Option<PlaylistSaveOptions>` で受け取る。
