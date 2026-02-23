import { Track } from "../../domain/entities/Track";
import { Playlist } from "../../domain/entities/Playlist";
import { scanMusicDirectory, selectMusicRoot } from "../../infrastructure/tauri/fileSystemAdapter";
import { PlaylistRepository } from "../../infrastructure/repositories/PlaylistRepository";
import { create } from "zustand";
import { persist } from "zustand/middleware";

const repo = new PlaylistRepository();

interface LochordState {
  // Music root
  musicRoot: string | null;
  setMusicRoot: (root: string) => void;

  // Library
  libraryTracks: Track[];
  isScanning: boolean;
  scanError: string | null;

  // Playlists
  playlists: Playlist[];
  selectedPlaylistPath: string | null;

  // Actions
  selectMusicRoot: () => Promise<void>;
  scanLibrary: () => Promise<void>;
  loadPlaylists: () => Promise<void>;
  selectPlaylist: (path: string) => Promise<void>;
  createPlaylist: (name: string) => Promise<void>;
  deletePlaylist: (path: string) => Promise<void>;
  addTrackToPlaylist: (track: Track) => void;
  removeTrackFromPlaylist: (absolutePath: string) => void;
  reorderTracks: (tracks: Track[]) => void;
  saveCurrentPlaylist: () => Promise<void>;

  // UI state
  errorMessage: string | null;
  clearError: () => void;
}

export const useLochordStore = create<LochordState>()(
  persist(
    (set, get) => ({
      musicRoot: null,
      libraryTracks: [],
      isScanning: false,
      scanError: null,
      playlists: [],
      selectedPlaylistPath: null,
      errorMessage: null,

      setMusicRoot: (root) => set({ musicRoot: root }),

      selectMusicRoot: async () => {
        try {
          const path = await selectMusicRoot();
          // null means the user cancelled the dialog – treat silently
          if (path === null) return;
          set({ musicRoot: path });
          // Auto scan after selecting root
          const state = get();
          await state.scanLibrary();
          await state.loadPlaylists();
        } catch (e) {
          set({ errorMessage: `ルート選択エラー: ${e}` });
        }
      },

      scanLibrary: async () => {
        const { musicRoot } = get();
        if (!musicRoot) return;
        set({ isScanning: true, scanError: null });
        try {
          const tracks = await scanMusicDirectory(musicRoot);
          set({ libraryTracks: tracks, isScanning: false });
        } catch (e) {
          set({
            isScanning: false,
            scanError: `スキャンエラー: ${e}`,
            errorMessage: `ライブラリスキャンに失敗しました: ${e}`,
          });
        }
      },

      loadPlaylists: async () => {
        const { musicRoot, playlists: existing } = get();
        if (!musicRoot) return;
        try {
          const paths = await repo.listPlaylists(musicRoot);
          const updatedPlaylists = await Promise.all(
            paths.map(async (p) => {
              // Check if we already have this playlist loaded in memory
              const found = existing.find((pl) => pl.path === p);
              if (found) return found;
              try {
                const tracks = await repo.loadPlaylist(p);
                return repo.buildPlaylist(p, tracks);
              } catch {
                return repo.buildPlaylist(p, []);
              }
            })
          );
          set({ playlists: updatedPlaylists });
        } catch (e) {
          set({ errorMessage: `プレイリスト読み込みエラー: ${e}` });
        }
      },

      selectPlaylist: async (path) => {
        const { playlists } = get();
        const existing = playlists.find((p) => p.path === path);
        if (!existing) return;
        // Reload tracks from disk
        try {
          const tracks = await repo.loadPlaylist(path);
          set({
            selectedPlaylistPath: path,
            playlists: playlists.map((p) =>
              p.path === path ? { ...p, tracks } : p
            ),
          });
        } catch (e) {
          set({
            selectedPlaylistPath: path,
            errorMessage: `プレイリスト読み込みエラー: ${e}`,
          });
        }
      },

      createPlaylist: async (name) => {
        const { musicRoot, playlists } = get();
        if (!musicRoot) return;
        const safeName = name.trim();
        if (!safeName) return;
        // Normalize path separator for cross-platform compatibility
        const normalizedRoot = musicRoot.replace(/\\/g, "/");
        const path = `${normalizedRoot}/Playlists/${safeName}.m3u8`;
        // Check for duplicate (normalize all paths once for comparison)
        const existingPaths = playlists.map((p) => p.path.replace(/\\/g, "/"));
        if (existingPaths.includes(path)) {
          set({ errorMessage: `「${safeName}」という名前のプレイリストは既に存在します` });
          return;
        }
        try {
          await repo.savePlaylist(path, []);
          const newPlaylist = repo.buildPlaylist(path, []);
          set({
            playlists: [...playlists, newPlaylist],
            selectedPlaylistPath: path,
          });
        } catch (e) {
          set({ errorMessage: `プレイリスト作成エラー: ${e}` });
        }
      },

      deletePlaylist: async (path) => {
        const { playlists, selectedPlaylistPath } = get();
        try {
          await repo.deletePlaylist(path);
          const updated = playlists.filter((p) => p.path !== path);
          set({
            playlists: updated,
            selectedPlaylistPath:
              selectedPlaylistPath === path
                ? updated[0]?.path ?? null
                : selectedPlaylistPath,
          });
        } catch (e) {
          set({ errorMessage: `プレイリスト削除エラー: ${e}` });
        }
      },

      addTrackToPlaylist: (track) => {
        const { playlists, selectedPlaylistPath } = get();
        if (!selectedPlaylistPath) return;
        set({
          playlists: playlists.map((p) => {
            if (p.path !== selectedPlaylistPath) return p;
            // Avoid duplicates
            const exists = p.tracks.some(
              (t) => t.absolutePath === track.absolutePath
            );
            if (exists) return p;
            return { ...p, tracks: [...p.tracks, track] };
          }),
        });
      },

      removeTrackFromPlaylist: (absolutePath) => {
        const { playlists, selectedPlaylistPath } = get();
        if (!selectedPlaylistPath) return;
        set({
          playlists: playlists.map((p) => {
            if (p.path !== selectedPlaylistPath) return p;
            return {
              ...p,
              tracks: p.tracks.filter((t) => t.absolutePath !== absolutePath),
            };
          }),
        });
      },

      reorderTracks: (tracks) => {
        const { playlists, selectedPlaylistPath } = get();
        if (!selectedPlaylistPath) return;
        set({
          playlists: playlists.map((p) =>
            p.path === selectedPlaylistPath ? { ...p, tracks } : p
          ),
        });
      },

      saveCurrentPlaylist: async () => {
        const { playlists, selectedPlaylistPath } = get();
        if (!selectedPlaylistPath) return;
        const playlist = playlists.find((p) => p.path === selectedPlaylistPath);
        if (!playlist) return;
        try {
          await repo.savePlaylist(playlist.path, playlist.tracks);
        } catch (e) {
          set({ errorMessage: `保存エラー: ${e}` });
        }
      },

      clearError: () => set({ errorMessage: null }),
    }),
    {
      name: "lochord-storage",
      partialize: (state) => ({
        musicRoot: state.musicRoot,
      }),
    }
  )
);
