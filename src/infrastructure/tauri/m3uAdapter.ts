import { invoke } from "@tauri-apps/api/core";
import { Track } from "../../domain/entities/Track";

export async function listPlaylists(root: string): Promise<string[]> {
  return invoke<string[]>("list_playlists", { root });
}

export async function loadPlaylist(path: string): Promise<Track[]> {
  return invoke<Track[]>("load_playlist", { path });
}

export async function savePlaylist(
  path: string,
  tracks: Track[]
): Promise<boolean> {
  return invoke<boolean>("save_playlist", { path, tracks });
}

export async function deletePlaylist(path: string): Promise<boolean> {
  return invoke<boolean>("delete_playlist", { path });
}
