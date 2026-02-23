import { Track } from "../../domain/entities/Track";
import { Playlist } from "../../domain/entities/Playlist";
import { PlaylistSaveOptions } from "../tauri/m3uAdapter";

export interface IPlaylistRepository {
  listPlaylists(root: string, playlistDir?: string | null): Promise<string[]>;
  loadPlaylist(path: string): Promise<Track[]>;
  savePlaylist(path: string, tracks: Track[], options?: PlaylistSaveOptions): Promise<boolean>;
  deletePlaylist(path: string): Promise<boolean>;
  buildPlaylist(path: string, tracks: Track[]): Playlist;
}
