import { Track } from "../../domain/entities/Track";
import { Playlist } from "../../domain/entities/Playlist";

export interface IPlaylistRepository {
  listPlaylists(root: string): Promise<string[]>;
  loadPlaylist(path: string): Promise<Track[]>;
  savePlaylist(path: string, tracks: Track[]): Promise<boolean>;
  deletePlaylist(path: string): Promise<boolean>;
  buildPlaylist(path: string, tracks: Track[]): Playlist;
}
