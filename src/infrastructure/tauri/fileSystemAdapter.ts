import { invoke } from "@tauri-apps/api/core";
import { Track } from "../../domain/entities/Track";

export async function selectMusicRoot(): Promise<string | null> {
  return invoke<string | null>("select_music_root");
}

export async function selectDirectory(): Promise<string | null> {
  return invoke<string | null>("select_directory");
}

export async function scanMusicDirectory(
  path: string,
  extensions?: string[],
  excludePatterns?: string[],
): Promise<Track[]> {
  return invoke<Track[]>("scan_music_directory", {
    path,
    extensions: extensions ?? null,
    excludePatterns: excludePatterns ?? null,
  });
}

export async function openPath(path: string): Promise<void> {
  return invoke<void>("open_path", { path });
}

export async function revealItemInDir(path: string): Promise<void> {
  return invoke<void>("reveal_item_in_dir", { path });
}
