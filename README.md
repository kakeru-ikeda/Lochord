# Lochord

A desktop app to manage local music library playlists (M3U8) with a GUI.

![Lochord](https://img.shields.io/badge/Tauri-v2-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Rust](https://img.shields.io/badge/Rust-1.77-orange)

**Language / 言語:** [English](README.md) | [日本語](docs/README.ja.md) | [한국어](docs/README.ko.md) | [中文](docs/README.zh.md)

## Features

### Library

- 🎵 Select music root directory (first-launch onboarding)
- 📂 Scan music files and display as a folder tree
- 🔍 Text search / filter within the library
- 🖱️ Multi-track selection (rubber-band drag, Shift/Ctrl click)

### Playlists

- 📋 Create, list, and delete playlists
- ➕ Add tracks via [+] button or drag & drop
- ↕️ Remove and reorder tracks within a playlist (dnd-kit)
- 💾 Save as M3U8 / M3U / TXT / CSV (UTF-8)
- 📖 Load and edit existing M3U8 files
- ⚡ Auto-save (enable in Settings)

### Metadata Editor

- 🏷️ Edit ID3 tags: title, artist, album artist, album, genre, year
- 🔢 Edit track number, disc number, BPM
- 📝 Edit composer, comment, lyrics, copyright, publisher, ISRC
- 🖼️ Preview and change cover art
- 🗂️ Batch edit multiple tracks at once

### Settings & UI

- ⚙️ Settings modal (Ctrl+,)
  - Path format: relative / absolute / relative from root / relative from prefix
  - Customizable playlist save directory
  - Save extension: m3u8 / m3u / txt / csv
  - Customizable scan extensions and exclude patterns
- 🎨 Color theme: Dark / Light / Follow system
- 🌐 Multilingual UI: English / Japanese / Korean / Chinese
- ⌨️ Keyboard shortcuts: Ctrl+S (save) / Ctrl+N (new) / F5 (rescan) / Ctrl+, (settings)

## Supported Formats

`flac` / `mp3` / `aac` / `wav` / `m4a` / `ogg` / `opus`

## Setup

### Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Tauri system dependencies:
  - **Linux**: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2 (included in Windows 10/11)

### Install

```bash
# Clone the repository
git clone https://github.com/kakeru-ikeda/Lochord.git
cd Lochord

# Install frontend dependencies
npm install
```

## Development

```bash
# Start dev server with hot reload
npm run tauri dev
```

## Build

```bash
# Production build
npm run tauri build
```

The generated installer will be output to `src-tauri/target/release/bundle/`.

## Architecture

Lochord uses a layered architecture. See [docs/design.md](docs/design.md) for details.

```
src/
├── presentation/   ← React Components / Pages
├── application/    ← Zustand Store / Use Cases
├── domain/         ← Types / Entities / Rules
└── infrastructure/ ← Tauri invoke / Rust Commands

src-tauri/src/
├── commands/
│   ├── fs.rs       ← File system & scan
│   └── m3u.rs      ← M3U8 read/write
└── lib.rs
```

## Directory Layout (runtime)

```
Music/                          ← Root (selected at launch)
├── Playlists/                  ← M3U8 storage (auto-created)
│   ├── Favorites.m3u8
│   └── Work BGM.m3u8
├── Artist - Album (Year) [format]/
│   ├── 01. TrackTitle.flac
│   └── 02. TrackTitle.flac
└── ...
```

## Tech Stack

| Layer            | Technology                     |
| ---------------- | ------------------------------ |
| App framework    | Tauri v2                       |
| Frontend         | React 19 + TypeScript          |
| State management | Zustand                        |
| Drag & drop      | dnd-kit                        |
| Icons            | lucide-react                   |
| Backend          | Rust                           |
| Playlist format  | M3U8 / M3U / TXT / CSV (UTF-8) |
