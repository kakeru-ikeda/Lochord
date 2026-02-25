# メタデータエディタ 設計書

## 概要

楽曲ファイルに埋め込まれたメタデータ（タイトル・アーティスト・アルバム・ジャンル・年・カバー画像）をアプリ内で直接編集できる機能を追加する。

ライブラリ（プレイリスト未追加）・プレイリスト内のどちらのトラックも編集対象とする。

## レイアウト変更

### Before

```
+---------------------------------------+
|              Header                    |
+--------+------------------------------+
| Left:  |     Center:                  |
|Playlist|     TrackList                |
| Panel  |                              |
+--------+------------------------------+
|         Bottom: LibraryBrowser        |
+---------------------------------------+
```

### After

LibraryBrowser を bottom-pane から center-pane 内に移動し、右側に固定のメタデータエディタパネルを追加する。

```
+-----------------------------------------------------+
|                      Header                          |
+--------+----------------------+----------------------+
| Left:  |   Center:            |   Right:             |
|Playlist|   TrackList (上部)   |   MetadataEditor     |
| Panel  |                      |   (固定表示)         |
|        +----------------------+                      |
|        |   LibraryBrowser     |   トラック未選択時は  |
|        |   (下部)             |   プレースホルダー    |
+--------+----------------------+----------------------+
```

- `main-body` を 3 カラム構成に変更（left-pane / center-pane / right-pane）
- `bottom-pane` を廃止し、`center-pane` 内で TrackList と LibraryBrowser を縦分割
- `right-pane` は常時表示（幅 320px 固定）

## 層ごとの変更

### 1. Domain 層

#### `Track` 型の拡張 (`src/domain/entities/Track.ts`)

```ts
export type Track = {
  title: string;
  artist: string;
  album: string; // 追加
  genre: string; // 追加
  year: number; // 追加 (0 = 不明)
  coverArt: string; // 追加 (base64 data URI, 空文字 = なし)
  duration: number;
  relativePath: string;
  absolutePath: string;
};
```

#### `AudioTags` 型 (新規: `src/domain/entities/AudioTags.ts`)

Rust コマンドとの受け渡し用の型。

```ts
export type AudioTags = {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number;
  coverArt: string; // base64 data URI
};
```

### 2. Infrastructure 層

#### Rust 側 (`src-tauri/src/commands/fs.rs`)

既に `lofty` クレート (0.22) が依存に含まれており、`read_audio_metadata()` で title/artist/duration を読んでいる。

以下のコマンドを追加する。

| コマンド           | 引数                            | 戻り値      | 説明                                |
| ------------------ | ------------------------------- | ----------- | ----------------------------------- |
| `read_audio_tags`  | `path: String`                  | `AudioTags` | 全メタデータ + カバー画像を読み取り |
| `write_audio_tags` | `path: String, tags: AudioTags` | `()`        | メタデータをファイルに書き込み      |

**`read_audio_tags`** の処理:

1. `lofty::Probe::open(path)` でファイルを開く
2. `primary_tag()` からタイトル・アーティスト・アルバム・ジャンル・年を取得
3. `pictures()` からカバー画像を取得し、base64 エンコードして `data:image/jpeg;base64,...` 形式で返す
4. `AudioTags` 構造体にまとめて返す

**`write_audio_tags`** の処理:

1. `lofty::Probe::open(path)` でファイルを開く
2. `primary_tag_mut()` でタグを取得（なければ作成）
3. `set_title()`, `set_artist()`, `set_album()`, `set_genre()`, `set_year()` でテキストフィールドを書き込み
4. カバー画像が渡された場合は `set_pictures()` で埋め込み
5. `tag.save_to_path(path)` で保存

**`Track` 構造体の拡張** (Rust側):

```rust
pub struct Track {
    pub title: String,
    pub artist: String,
    pub album: String,      // 追加
    pub genre: String,      // 追加
    pub year: i64,          // 追加
    pub cover_art: String,  // 追加 (base64, スキャン時は空)
    pub duration: i64,
    pub relative_path: String,
    pub absolute_path: String,
}
```

> **注意**: ライブラリスキャン時 (`scan_music_directory`) にはカバー画像は読まない (パフォーマンス上の理由)。カバー画像はメタデータエディタで個別のトラックを選択した時にのみ `read_audio_tags` で取得する。

#### TypeScript 側 (`src/infrastructure/tauri/audioTagsAdapter.ts`, 新規)

```ts
import { invoke } from "@tauri-apps/api/core";
import { AudioTags } from "../../domain/entities/AudioTags";

export async function readAudioTags(path: string): Promise<AudioTags> {
  return invoke<AudioTags>("read_audio_tags", { path });
}

export async function writeAudioTags(
  path: string,
  tags: AudioTags,
): Promise<void> {
  return invoke<void>("write_audio_tags", { path, tags });
}
```

### 3. Application 層 (Store)

`useLochordStore` に以下を追加。

```ts
// 追加 state
selectedTrackForEdit: Track | null;

// 追加 actions
selectTrackForEdit: (track: Track | null) => void;
updateTrackMetadata: (absolutePath: string, tags: AudioTags) => Promise<void>;
```

**`selectTrackForEdit`**:

- `selectedTrackForEdit` をセットする
- `readAudioTags(track.absolutePath)` を呼んでカバー画像含むフルタグを取得し、取得完了後に `selectedTrackForEdit` を更新する

**`updateTrackMetadata`**:

1. `writeAudioTags(absolutePath, tags)` でファイルに書き込み
2. `libraryTracks` 内の該当トラックの title/artist/album/genre/year を更新
3. `playlists` 内の該当トラック（複数プレイリストに存在する可能性）も同様に更新
4. `selectedTrackForEdit` も更新

### 4. Presentation 層

#### 新規コンポーネント: `MetadataEditor` (`src/presentation/components/MetadataEditor/MetadataEditor.tsx`)

右側固定パネル。以下の要素で構成:

```
+-------------------------------+
|  🎵 メタデータ編集             |
+-------------------------------+
|  [カバー画像プレビュー]        |
|  (クリックで画像選択)          |
|                               |
|  タイトル: [______________]   |
|  アーティスト: [__________]   |
|  アルバム: [______________]   |
|  ジャンル: [______________]   |
|  年: [____]                   |
|                               |
|  ファイルパス: /path/to/file  |
|  再生時間: 3:42               |
|                               |
|        [保存]  [リセット]     |
+-------------------------------+
```

**動作仕様**:

- トラック未選択時: 「楽曲を選択してください」プレースホルダー表示
- トラック選択時: カバー画像を含むフルメタデータをロード、フォームに展開
- 編集中は「保存」ボタンが有効化 (変更検出)
- 「保存」クリックで `updateTrackMetadata` を呼び出し
- 「リセット」で変更を破棄し、元のデータに戻す
- カバー画像クリックで `tauri-plugin-dialog` のファイル選択ダイアログを開き、png/jpg を選択可能

#### 既存コンポーネントの変更

**`TrackList` - `SortableTrackRow`**:

- 行クリックで `selectTrackForEdit(track)` を呼ぶ
- 現在編集中のトラックの行にハイライトクラスを付与

**`LibraryBrowser` - `DraggableTrack`**:

- 行クリックで `selectTrackForEdit(track)` を呼ぶ
- 現在編集中のトラックの行にハイライトクラスを付与

**`MainPage`**:

- レイアウトを 3 カラム構成に変更
- `bottom-pane` を廃止、`center-pane` 内で TrackList と LibraryBrowser を flex-column で縦分割
- `right-pane` に `MetadataEditor` を配置

### 5. i18n

`Translations` 型に `metadata` セクションを追加。

```ts
metadata: {
  header: string;
  selectPrompt: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: string;
  coverArt: string;
  coverArtSelect: string;
  coverArtRemove: string;
  filePath: string;
  duration: string;
  save: string;
  reset: string;
  saving: string;
  saveSuccess: string;
  saveError: string;
}
```

## ファイル変更一覧

| パス                                                            | 変更種別 |
| --------------------------------------------------------------- | -------- |
| `src/domain/entities/Track.ts`                                  | 修正     |
| `src/domain/entities/AudioTags.ts`                              | **新規** |
| `src/domain/i18n/types.ts`                                      | 修正     |
| `src/domain/i18n/translations/en.ts`                            | 修正     |
| `src/domain/i18n/translations/ja.ts`                            | 修正     |
| `src/domain/i18n/translations/ko.ts`                            | 修正     |
| `src/domain/i18n/translations/zh.ts`                            | 修正     |
| `src-tauri/src/commands/fs.rs`                                  | 修正     |
| `src-tauri/src/lib.rs`                                          | 修正     |
| `src/infrastructure/tauri/audioTagsAdapter.ts`                  | **新規** |
| `src/application/store/useLochordStore.ts`                      | 修正     |
| `src/presentation/components/MetadataEditor/MetadataEditor.tsx` | **新規** |
| `src/presentation/pages/MainPage.tsx`                           | 修正     |
| `src/presentation/components/TrackList/TrackList.tsx`           | 修正     |
| `src/presentation/components/LibraryBrowser/LibraryBrowser.tsx` | 修正     |
| `src/styles.css`                                                | 修正     |

## スコープ・優先度

| 優先度 | 機能                                                      |
| ------ | --------------------------------------------------------- |
| P0     | タイトル・アーティスト・アルバムの編集 & ファイル書き込み |
| P0     | UI パネル (右側固定) + レイアウト変更                     |
| P0     | ライブラリ / プレイリスト双方からの選択連携               |
| P1     | ジャンル・年の編集                                        |
| P1     | カバー画像の読み込み・プレビュー表示                      |
| P2     | カバー画像の変更・埋め込み書き込み                        |

## リスク・注意事項

- `lofty` の `write` は元のファイルを直接変更する。バックアップオプションは将来的に検討。
- ライブラリスキャン時のカバー画像読み込みを省略することでスキャン性能を維持する。
- `lofty 0.22` の API に依存。将来のメジャーバージョンアップ時に API 変更の可能性あり。
