import { invoke } from "@tauri-apps/api/core";
import { Track } from "../../domain/entities/Track";

export async function selectMusicRoot(): Promise<string | null> {
  return invoke<string | null>("select_music_root");
}

export async function scanMusicDirectory(path: string): Promise<Track[]> {
  return invoke<Track[]>("scan_music_directory", { path });
}
