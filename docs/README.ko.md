# Lochord

로컬 음악 라이브러리의 M3U8 플레이리스트를 GUI로 관리하는 데스크탑 앱.

![Lochord](https://img.shields.io/badge/Tauri-v2-blue) ![React](https://img.shields.io/badge/React-19-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue) ![Rust](https://img.shields.io/badge/Rust-1.77-orange)

**Language / 언어:** [English](../README.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [中文](README.zh.md)

## 기능

### 라이브러리

- 🎵 음악 루트 디렉토리 선택 (첫 실행 온보딩)
- 📂 음악 파일 스캔 · 폴더 트리 표시
- 🔍 라이브러리 내 텍스트 검색 필터
- 🖱️ 다중 트랙 선택 (러버밴드 드래그 · Shift/Ctrl 클릭)

### 플레이리스트

- 📋 플레이리스트 생성 · 목록 표시 · 삭제
- ➕ 트랙 추가 ([+] 버튼 또는 드래그 & 드롭)
- ↕️ 플레이리스트 내 트랙 삭제 · 순서 변경 (dnd-kit)
- 💾 M3U8 / M3U / TXT / CSV 형식으로 저장 (UTF-8)
- 📖 기존 M3U8 파일 불러오기 · 편집
- ⚡ 자동 저장 (설정에서 활성화)

### 메타데이터 편집기

- 🏷️ ID3 태그 편집 (제목 · 아티스트 · 앨범 아티스트 · 앨범 · 장르 · 연도)
- 🔢 트랙 번호 · 디스크 번호 · BPM 편집
- 📝 작곡가 · 코멘트 · 가사 · 저작권 · 퍼블리셔 · ISRC 편집
- 🖼️ 커버 아트 미리보기 및 변경
- 🗂️ 여러 트랙 일괄 편집

### 설정 · UI

- ⚙️ 설정 모달 (Ctrl+,)
  - 경로 형식: 상대 / 절대 / 루트 기준 상대 / 접두사 기준 상대
  - 플레이리스트 저장 디렉토리 커스터마이즈
  - 저장 확장자 선택 (m3u8 / m3u / txt / csv)
  - 스캔 대상 확장자 · 제외 패턴 커스터마이즈
- 🎨 컬러 테마 (다크 / 라이트 / 시스템 설정 따르기)
- 🌐 다국어 UI (한국어 / 일본어 / 영어 / 중국어)
- ⌨️ 키보드 단축키 (Ctrl+S: 저장 / Ctrl+N: 새로 만들기 / F5: 재스캔 / Ctrl+,: 설정)

## 지원 포맷

`flac` / `mp3` / `aac` / `wav` / `m4a` / `ogg` / `opus`

## 설치

### 필요 환경

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) (stable)
- Tauri 시스템 의존성:
  - **Linux**: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev`
  - **macOS**: Xcode Command Line Tools
  - **Windows**: WebView2 (Windows 10/11 기본 탑재)

### 설치 방법

```bash
# 리포지토리 클론
git clone https://github.com/kakeru-ikeda/Lochord.git
cd Lochord

# 프론트엔드 의존성 설치
npm install
```

## 개발

```bash
# 핫 리로드로 개발 서버 시작
npm run tauri dev
```

## 빌드

```bash
# 프로덕션 빌드
npm run tauri build
```

생성된 인스톨러는 `src-tauri/target/release/bundle/` 에 출력됩니다.

## 아키텍처

레이어드 아키텍처를 채택하고 있습니다. 자세한 내용은 [docs/design.md](docs/design.md) 를 참조하세요.

```
src/
├── presentation/   ← React Components / Pages
├── application/    ← Zustand Store / Use Cases
├── domain/         ← Types / Entities / Rules
└── infrastructure/ ← Tauri invoke / Rust Commands

src-tauri/src/
├── commands/
│   ├── fs.rs       ← 파일 시스템 · 스캔
│   └── m3u.rs      ← M3U8 읽기/쓰기
└── lib.rs
```

## 디렉토리 구성 (운용)

```
Music/                          ← 루트 (앱 시작 시 지정)
├── Playlists/                  ← M3U8 저장소 (자동 생성)
│   ├── 즐겨찾기.m3u8
│   └── 작업용 BGM.m3u8
├── Artist - Album (Year) [format]/
│   ├── 01. TrackTitle.flac
│   └── 02. TrackTitle.flac
└── ...
```

## 기술 스택

| 레이어            | 기술                           |
| ----------------- | ------------------------------ |
| 앱 프레임워크     | Tauri v2                       |
| 프론트엔드        | React 19 + TypeScript          |
| 상태 관리         | Zustand                        |
| 드래그 & 드롭     | dnd-kit                        |
| 아이콘            | lucide-react                   |
| 백엔드            | Rust                           |
| 플레이리스트 형식 | M3U8 / M3U / TXT / CSV (UTF-8) |
