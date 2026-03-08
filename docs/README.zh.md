# Lochord

用于通过 GUI 管理本地音乐库 M3U8 播放列表的桌面应用。

![Lochord](https://img.shields.io/badge/Tauri-v2-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Rust](https://img.shields.io/badge/Rust-1.77-orange)

**Language / 语言:** [English](../README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [中文](README.zh.md)

## 功能

### 音乐库

- 🎵 选择音乐根目录（首次启动引导）
- 📂 扫描音乐文件并以文件夹树形式显示
- 🔍 库内文本搜索过滤
- 🖱️ 多曲目选择（橡皮筋拖拽 · Shift/Ctrl 点击）

### 播放列表

- 📋 新建、列出和删除播放列表
- ➕ 通过 [+] 按钮或拖放添加曲目
- ↕️ 删除和重新排序播放列表中的曲目（dnd-kit）
- 💾 保存为 M3U8 / M3U / TXT / CSV 格式（UTF-8）
- 📖 加载并编辑现有 M3U8 文件
- ⚡ 自动保存（在设置中启用）

### 元数据编辑器

- 🏷️ 编辑 ID3 标签（标题 · 艺术家 · 专辑艺术家 · 专辑 · 流派 · 年份）
- 🔢 编辑曲目编号、碟片编号、BPM
- 📝 编辑作曲家、备注、歌词、版权、发行商、ISRC
- 🖼️ 预览和更改封面图片
- 🗂️ 批量编辑多个曲目

### 设置 · 界面

- ⚙️ 设置模态框（Ctrl+,）
  - 路径格式：相对 / 绝对 / 相对于根目录 / 相对于指定前缀
  - 自定义播放列表保存目录
  - 保存扩展名选择（m3u8 / m3u / txt / csv）
  - 自定义扫描扩展名和排除模式
- 🎨 颜色主题（深色 / 浅色 / 跟随系统）
- 🌐 多语言界面（中文 / 日语 / 英语 / 韩语）
- ⌨️ 键盘快捷键（Ctrl+S: 保存 / Ctrl+N: 新建 / F5: 重新扫描 / Ctrl+,: 设置）

## 支持格式

`flac` / `mp3` / `aac` / `wav` / `m4a` / `ogg` / `opus`

## 安装

### 系统要求

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Tauri 系统依赖：
  - **Linux**: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2（Windows 10/11 内置）

### 安装步骤

```bash
# 克隆仓库
git clone https://github.com/kakeru-ikeda/Lochord.git
cd Lochord

# 安装前端依赖
npm install
```

## 开发

```bash
# 启动开发服务器（热重载）
npm run tauri dev
```

## 构建

```bash
# 生产构建
npm run tauri build
```

生成的安装程序将输出到 `src-tauri/target/release/bundle/`。

## 架构

采用分层架构。详情请参阅 [docs/design.md](docs/design.md)。

```
src/
├── presentation/   ← React Components / Pages
├── application/    ← Zustand Store / Use Cases
├── domain/         ← Types / Entities / Rules
└── infrastructure/ ← Tauri invoke / Rust Commands

src-tauri/src/
├── commands/
│   ├── fs.rs       ← 文件系统 · 扫描
│   └── m3u.rs      ← M3U8 读写
└── lib.rs
```

## 目录结构（运行时）

```
Music/                          ← 根目录（启动时指定）
├── Playlists/                  ← M3U8 存储目录（自动创建）
│   ├── 我的最爱.m3u8
│   └── 工作背景音乐.m3u8
├── Artist - Album (Year) [format]/
│   ├── 01. TrackTitle.flac
│   └── 02. TrackTitle.flac
└── ...
```

## 技术栈

| 层次         | 技术                            |
| ------------ | ------------------------------- |
| 应用框架     | Tauri v2                        |
| 前端         | React 19 + TypeScript           |
| 状态管理     | Zustand                         |
| 拖放         | dnd-kit                         |
| 图标         | lucide-react                    |
| 后端         | Rust                            |
| 播放列表格式 | M3U8 / M3U / TXT / CSV（UTF-8） |
