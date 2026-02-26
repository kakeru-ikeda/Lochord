export type PathMode = "relative" | "absolute" | "relative-from-root" | "relative-from-prefix";
export type SaveExtension = "m3u8" | "m3u" | "txt" | "csv";
export type ColorTheme = "dark" | "light" | "system";
export type Language = "ja" | "en" | "ko" | "zh";

export interface AppSettings {
  // Playlist
  pathMode: PathMode;
  pathPrefix: string | null; // prefix for "relative-from-prefix" mode
  playlistDir: string | null; // null = {musicRoot}/Playlists/
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
  pathPrefix: null,
  playlistDir: null,
  saveExtension: "m3u8",
  autoSave: false,
  colorTheme: "system",
  language: "ja",
  scanExtensions: ["flac", "mp3", "aac", "wav", "m4a", "ogg", "opus"],
  excludePatterns: [],
};
