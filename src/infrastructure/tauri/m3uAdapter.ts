import { invoke } from "@tauri-apps/api/core";
import { Track } from "../../domain/entities/Track";

export interface PlaylistSaveOptions {
  path_mode: string;
  music_root: string | null;
  path_prefix: string | null;
  format: string;
}

export async function listPlaylists(root: string, playlistDir?: string | null): Promise<string[]> {
  return invoke<string[]>("list_playlists", {
    root,
    playlistDir: playlistDir ?? null,
  });
}

export async function loadPlaylist(path: string): Promise<Track[]> {
  return invoke<Track[]>("load_playlist", { path });
}

export async function savePlaylist(
  path: string,
  tracks: Track[],
  options?: PlaylistSaveOptions,
): Promise<boolean> {
  return invoke<boolean>("save_playlist", {
    path,
    tracks,
    options: options ?? null,
  });
}

export async function deletePlaylist(path: string): Promise<boolean> {
  return invoke<boolean>("delete_playlist", { path });
}
