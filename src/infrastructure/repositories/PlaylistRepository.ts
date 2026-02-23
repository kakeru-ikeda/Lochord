import { Playlist } from "../../domain/entities/Playlist";
import { Track } from "../../domain/entities/Track";
import { playlistNameFromPath } from "../../domain/rules/m3uPathResolver";
import {
  deletePlaylist,
  listPlaylists,
  loadPlaylist,
  savePlaylist,
} from "../tauri/m3uAdapter";
import { IPlaylistRepository } from "./IPlaylistRepository";

export class PlaylistRepository implements IPlaylistRepository {
  async listPlaylists(root: string): Promise<string[]> {
    return listPlaylists(root);
  }

  async loadPlaylist(path: string): Promise<Track[]> {
    return loadPlaylist(path);
  }

  async savePlaylist(path: string, tracks: Track[]): Promise<boolean> {
    return savePlaylist(path, tracks);
  }

  async deletePlaylist(path: string): Promise<boolean> {
    return deletePlaylist(path);
  }

  buildPlaylist(path: string, tracks: Track[]): Playlist {
    return {
      name: playlistNameFromPath(path),
      path,
      tracks,
    };
  }
}
