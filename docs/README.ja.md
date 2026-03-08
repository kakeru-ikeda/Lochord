# Lochord

ローカル音楽ライブラリの M3U8 プレイリストを GUI で管理するデスクトップアプリ。

![Lochord](https://img.shields.io/badge/Tauri-v2-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Rust](https://img.shields.io/badge/Rust-1.77-orange)

**Language / 言語:** [English](../README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [中文](README.zh.md)

## 機能

### ライブラリ

- 🎵 音楽ルートディレクトリの選択（初回オンボーディング）
- 📂 音楽ファイルのスキャン・フォルダツリー表示
- 🔍 ライブラリ内テキスト検索フィルター
- 🖱️ 複数トラック選択（ラバーバンド選択・Shift/Ctrl クリック）

### プレイリスト

- 📋 プレイリストの新規作成・一覧表示・削除
- ➕ プレイリストへの曲追加（[+]ボタン または ドラッグ&ドロップ）
- ↕️ プレイリスト内の曲の削除・並び替え（dnd-kit）
- 💾 M3U8 / M3U / TXT / CSV 形式で保存（UTF-8）
- 📖 既存 M3U8 の読み込み・編集
- ⚡ オートセーブ（設定で有効化）

### メタデータエディタ

- 🏷️ ID3 タグ編集（タイトル・アーティスト・アルバムアーティスト・アルバム・ジャンル・年）
- 🔢 トラック番号・ディスク番号・BPM の編集
- 📝 コンポーザー・コメント・歌詞・著作権・パブリッシャー・ISRC の編集
- 🖼️ カバーアートのプレビューおよび変更
- 🗂️ 複数トラック一括編集

### 設定・UI

- ⚙️ 設定モーダル（Ctrl+,）
  - パス形式: 相対 / 絶対 / ルートからの相対 / 所定パスからの相対
  - プレイリスト保存ディレクトリのカスタマイズ
  - 保存拡張子の選択（m3u8 / m3u / txt / csv）
  - スキャン対象拡張子・除外パターンのカスタマイズ
- 🎨 カラーテーマ（ダーク / ライト / システム設定に追従）
- 🌐 多言語 UI（日本語 / 英語 / 韓国語 / 中国語）
- ⌨️ キーボードショートカット（Ctrl+S: 保存 / Ctrl+N: 新規 / F5: 再スキャン / Ctrl+,: 設定）

## 対応フォーマット

`flac` / `mp3` / `aac` / `wav` / `m4a` / `ogg` / `opus`

## セットアップ

### 必要環境

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Tauri システム依存関係:
  - **Linux**: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2 (Windows 10/11 標準搭載)

### インストール

```bash
# リポジトリをクローン
git clone https://github.com/kakeru-ikeda/Lochord.git
cd Lochord

# フロントエンド依存関係のインストール
npm install
```

## 開発

```bash
# 開発サーバー起動（ホットリロード有効）
npm run tauri dev
```

## ビルド

```bash
# プロダクションビルド
npm run tauri build
```

生成されたインストーラーは `src-tauri/target/release/bundle/` に出力されます。

## アーキテクチャ

レイヤードアーキテクチャを採用しています。詳細は [docs/design.md](docs/design.md) を参照してください。

```
src/
├── presentation/   ← React Components / Pages
├── application/    ← Zustand Store / Use Cases
├── domain/         ← Types / Entities / Rules
└── infrastructure/ ← Tauri invoke / Rust Commands

src-tauri/src/
├── commands/
│   ├── fs.rs       ← ファイルシステム・スキャン
│   └── m3u.rs      ← M3U8 読み書き
└── lib.rs
```

## ディレクトリ構成（運用）

```
Music/                          ← ルート（アプリ起動時に指定）
├── Playlists/                  ← M3U8 置き場（自動生成）
│   ├── お気に入り.m3u8
│   └── 作業用BGM.m3u8
├── Artist - Album (Year) [format]/
│   ├── 01. TrackTitle.flac
│   └── 02. TrackTitle.flac
└── ...
```

## 技術スタック

| レイヤー             | 技術                            |
| -------------------- | ------------------------------- |
| アプリフレームワーク | Tauri v2                        |
| フロントエンド       | React 19 + TypeScript           |
| 状態管理             | Zustand                         |
| ドラッグ&ドロップ    | dnd-kit                         |
| アイコン             | lucide-react                    |
| バックエンド         | Rust                            |
| プレイリスト形式     | M3U8 / M3U / TXT / CSV（UTF-8） |
