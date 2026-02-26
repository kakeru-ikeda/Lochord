import { Track } from "../../domain/entities/Track";
import { AudioTags } from "../../domain/entities/AudioTags";
import { Playlist } from "../../domain/entities/Playlist";
import { SaveExtension } from "../../domain/entities/AppSettings";
import { scanMusicDirectory, selectMusicRoot } from "../../infrastructure/tauri/fileSystemAdapter";
import { readAudioTags, writeAudioTags } from "../../infrastructure/tauri/audioTagsAdapter";
import { PlaylistRepository } from "../../infrastructure/repositories/PlaylistRepository";
import { useSettingsStore } from "./useSettingsStore";
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
  saveCurrentPlaylistAs: (ext: SaveExtension) => Promise<void>;

  // UI state
  errorMessage: string | null;
  clearError: () => void;

  // Metadata editing
  selectedTrackForEdit: Track | null;
  selectedTracksForEdit: Track[];
  isLoadingTags: boolean;
  selectTrackForEdit: (track: Track | null) => void;
  selectTracksForEdit: (tracks: Track[]) => Promise<void>;
  updateTrackMetadata: (absolutePath: string, tags: AudioTags) => Promise<void>;
  updateMultipleTracksMetadata: (absolutePaths: string[], tags: Partial<AudioTags>) => Promise<void>;
}

/** Helper: auto-save if enabled */
function maybeAutoSave(get: () => LochordState) {
  const { autoSave } = useSettingsStore.getState().settings;
  if (autoSave) {
    // Fire-and-forget save
    get().saveCurrentPlaylist();
  }
}

/** Build save options from current settings */
function buildSaveOptions(musicRoot: string | null) {
  const { settings } = useSettingsStore.getState();
  return {
    path_mode: settings.pathMode,
    music_root: musicRoot,
    path_prefix: settings.pathPrefix,
    format: settings.saveExtension,
  };
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

      // Metadata editing
      selectedTrackForEdit: null,
      selectedTracksForEdit: [],
      isLoadingTags: false,

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
          const { scanExtensions, excludePatterns } = useSettingsStore.getState().settings;
          const tracks = await scanMusicDirectory(musicRoot, scanExtensions, excludePatterns);
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
          // Pass the resolved playlistDir so list_playlists can find playlists
          // saved in a custom directory or with non-m3u extensions
          const { resolvePlaylistDir } = useSettingsStore.getState();
          const playlistDir = resolvePlaylistDir(musicRoot);
          const paths = await repo.listPlaylists(musicRoot, playlistDir);
          const updatedPlaylists = await Promise.all(
            paths.map(async (p) => {
              // Check if we already have this playlist loaded in memory
              const found = existing.find((pl) => pl.path === p);
              if (found) return found;
              try {
                const tracks = await repo.loadPlaylist(p);
                return { ...repo.buildPlaylist(p, tracks), isDirty: false };
              } catch {
                return { ...repo.buildPlaylist(p, []), isDirty: false };
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
              p.path === path ? { ...p, tracks, isDirty: false } : p
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

        const { resolvePlaylistDir } = useSettingsStore.getState();
        const { saveExtension } = useSettingsStore.getState().settings;
        const playlistDir = resolvePlaylistDir(musicRoot);
        const ext = saveExtension;
        const path = `${playlistDir}/${safeName}.${ext}`;

        // Check for duplicate (normalize all paths once for comparison)
        const existingPaths = playlists.map((p) => p.path.replace(/\\/g, "/"));
        if (existingPaths.includes(path.replace(/\\/g, "/"))) {
          set({ errorMessage: `「${safeName}」という名前のプレイリストは既に存在します` });
          return;
        }
        try {
          await repo.savePlaylist(path, [], buildSaveOptions(musicRoot));
          const newPlaylist: Playlist = { ...repo.buildPlaylist(path, []), isDirty: false };
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
            return { ...p, tracks: [...p.tracks, track], isDirty: true };
          }),
        });
        maybeAutoSave(get);
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
              isDirty: true,
            };
          }),
        });
        maybeAutoSave(get);
      },

      reorderTracks: (tracks) => {
        const { playlists, selectedPlaylistPath } = get();
        if (!selectedPlaylistPath) return;
        set({
          playlists: playlists.map((p) =>
            p.path === selectedPlaylistPath ? { ...p, tracks, isDirty: true } : p
          ),
        });
        maybeAutoSave(get);
      },

      saveCurrentPlaylist: async () => {
        const { playlists, selectedPlaylistPath, musicRoot } = get();
        if (!selectedPlaylistPath) return;
        const playlist = playlists.find((p) => p.path === selectedPlaylistPath);
        if (!playlist) return;
        try {
          await repo.savePlaylist(
            playlist.path,
            playlist.tracks,
            buildSaveOptions(musicRoot),
          );
          set({
            playlists: playlists.map((p) =>
              p.path === selectedPlaylistPath ? { ...p, isDirty: false } : p
            ),
          });
        } catch (e) {
          set({ errorMessage: `保存エラー: ${e}` });
        }
      },

      saveCurrentPlaylistAs: async (ext: SaveExtension) => {
        const { playlists, selectedPlaylistPath, musicRoot } = get();
        if (!selectedPlaylistPath) return;
        const playlist = playlists.find((p) => p.path === selectedPlaylistPath);
        if (!playlist) return;

        // 拡張子を差し替えた新しいパスを生成
        const newPath = playlist.path.replace(/\.[^./\\]+$/, `.${ext}`);

        try {
          // 新しいパス（新拡張子）で保存
          const { settings } = useSettingsStore.getState();
          await repo.savePlaylist(newPath, playlist.tracks, {
            path_mode: settings.pathMode,
            music_root: musicRoot,
            path_prefix: settings.pathPrefix,
            format: ext,
          });

          // パスが変わった場合は古いファイルを削除し、設定も更新
          if (newPath !== playlist.path) {
            try {
              await repo.deletePlaylist(playlist.path);
            } catch {
              // 削除失敗は無視（ファイルが存在しない場合など）
            }
            useSettingsStore.getState().updateSettings({ saveExtension: ext });
          }

          set({
            selectedPlaylistPath: newPath,
            playlists: playlists.map((p) =>
              p.path === selectedPlaylistPath
                ? { ...p, path: newPath, name: p.name, isDirty: false }
                : p
            ),
          });
        } catch (e) {
          set({ errorMessage: `保存エラー: ${e}` });
        }
      },

      clearError: () => set({ errorMessage: null }),

      selectTrackForEdit: (track) => {
        // Convenience wrapper for single-track selection
        get().selectTracksForEdit(track ? [track] : []);
      },

      selectTracksForEdit: async (tracks) => {
        if (tracks.length === 0) {
          set({ selectedTrackForEdit: null, selectedTracksForEdit: [], isLoadingTags: false });
          return;
        }
        if (tracks.length === 1) {
          const track = tracks[0];
          // Set immediately with basic info, then load full tags
          set({ selectedTrackForEdit: track, selectedTracksForEdit: [track], isLoadingTags: true });
          try {
            const tags = await readAudioTags(track.absolutePath);
            const loaded: Track = {
              ...track,
              title: tags.title,
              artist: tags.artist,
              albumArtist: tags.albumArtist,
              album: tags.album,
              genre: tags.genre,
              year: tags.year,
              trackNumber: tags.trackNumber,
              totalTracks: tags.totalTracks,
              discNumber: tags.discNumber,
              totalDiscs: tags.totalDiscs,
              composer: tags.composer,
              comment: tags.comment,
              lyrics: tags.lyrics,
              bpm: tags.bpm,
              copyright: tags.copyright,
              publisher: tags.publisher,
              isrc: tags.isrc,
              coverArt: tags.coverArt,
            };
            set({
              selectedTrackForEdit: loaded,
              selectedTracksForEdit: [loaded],
              isLoadingTags: false,
            });
          } catch {
            set({ isLoadingTags: false });
          }
        } else {
          // Multi-select: read tags from disk in parallel to get accurate coverArt etc.
          set({ selectedTrackForEdit: tracks[0], selectedTracksForEdit: tracks, isLoadingTags: true });
          try {
            const loadedTracks = await Promise.all(
              tracks.map(async (track) => {
                try {
                  const tags = await readAudioTags(track.absolutePath);
                  return { ...track, ...tags };
                } catch {
                  return track; // fallback to in-memory on error
                }
              })
            );
            set({
              selectedTrackForEdit: loadedTracks[0],
              selectedTracksForEdit: loadedTracks,
              isLoadingTags: false,
            });
          } catch {
            set({ isLoadingTags: false });
          }
        }
      },

      updateTrackMetadata: async (absolutePath, tags) => {
        try {
          await writeAudioTags(absolutePath, tags);

          // Update track data across the app
          const patch = {
            title: tags.title,
            artist: tags.artist,
            albumArtist: tags.albumArtist,
            album: tags.album,
            genre: tags.genre,
            year: tags.year,
            trackNumber: tags.trackNumber,
            totalTracks: tags.totalTracks,
            discNumber: tags.discNumber,
            totalDiscs: tags.totalDiscs,
            composer: tags.composer,
            comment: tags.comment,
            lyrics: tags.lyrics,
            bpm: tags.bpm,
            copyright: tags.copyright,
            publisher: tags.publisher,
            isrc: tags.isrc,
            coverArt: tags.coverArt,
          };

          const { libraryTracks, playlists, selectedTrackForEdit, selectedTracksForEdit } = get();

          // Update library tracks
          const updatedLibrary = libraryTracks.map((t) =>
            t.absolutePath === absolutePath ? { ...t, ...patch } : t
          );

          // Update all playlists containing this track
          const updatedPlaylists = playlists.map((pl) => ({
            ...pl,
            tracks: pl.tracks.map((t) =>
              t.absolutePath === absolutePath ? { ...t, ...patch } : t
            ),
          }));

          // Update the selected track for edit
          const updatedSelected =
            selectedTrackForEdit?.absolutePath === absolutePath
              ? { ...selectedTrackForEdit, ...patch }
              : selectedTrackForEdit;

          const updatedSelections = selectedTracksForEdit.map((t) =>
            t.absolutePath === absolutePath ? { ...t, ...patch } : t
          );

          set({
            libraryTracks: updatedLibrary,
            playlists: updatedPlaylists,
            selectedTrackForEdit: updatedSelected,
            selectedTracksForEdit: updatedSelections,
          });
        } catch (e) {
          set({ errorMessage: `メタデータ保存エラー: ${e}` });
        }
      },

      updateMultipleTracksMetadata: async (absolutePaths, partialTags) => {
        const { selectedTracksForEdit, libraryTracks, playlists } = get();

        type WriteResult = { absolutePath: string; patch: Partial<Track> };
        const results: WriteResult[] = [];
        const errors: string[] = [];

        for (const absolutePath of absolutePaths) {
          // Find current in-memory track data
          const track =
            selectedTracksForEdit.find((t) => t.absolutePath === absolutePath) ??
            libraryTracks.find((t) => t.absolutePath === absolutePath);
          if (!track) continue;

          // Merge: current track data + partial override
          const fullTags: AudioTags = {
            title: track.title,
            artist: track.artist,
            albumArtist: track.albumArtist,
            album: track.album,
            genre: track.genre,
            year: track.year,
            trackNumber: track.trackNumber,
            totalTracks: track.totalTracks,
            discNumber: track.discNumber,
            totalDiscs: track.totalDiscs,
            composer: track.composer,
            comment: track.comment,
            lyrics: track.lyrics,
            bpm: track.bpm,
            copyright: track.copyright,
            publisher: track.publisher,
            isrc: track.isrc,
            coverArt: track.coverArt,
            ...partialTags,
          };

          try {
            await writeAudioTags(absolutePath, fullTags);
            results.push({ absolutePath, patch: fullTags });
          } catch (e) {
            errors.push(`${absolutePath}: ${e}`);
          }
        }

        if (results.length === 0) {
          set({ errorMessage: `メタデータ保存エラー: ${errors.join(", ")}` });
          return;
        }

        // Build patch map
        const patchMap = new Map(results.map(({ absolutePath, patch }) => [absolutePath, patch]));

        const { selectedTrackForEdit, selectedTracksForEdit: currentSelections } = get();

        const updatedLibrary = libraryTracks.map((t) => {
          const p = patchMap.get(t.absolutePath);
          return p ? { ...t, ...p } : t;
        });

        const updatedPlaylists = playlists.map((pl) => ({
          ...pl,
          tracks: pl.tracks.map((t) => {
            const p = patchMap.get(t.absolutePath);
            return p ? { ...t, ...p } : t;
          }),
        }));

        const updatedSelected = selectedTrackForEdit && patchMap.has(selectedTrackForEdit.absolutePath)
          ? { ...selectedTrackForEdit, ...patchMap.get(selectedTrackForEdit.absolutePath) }
          : selectedTrackForEdit;

        const updatedSelections = currentSelections.map((t) => {
          const p = patchMap.get(t.absolutePath);
          return p ? { ...t, ...p } : t;
        });

        set({
          libraryTracks: updatedLibrary,
          playlists: updatedPlaylists,
          selectedTrackForEdit: updatedSelected,
          selectedTracksForEdit: updatedSelections,
        });

        if (errors.length > 0) {
          set({ errorMessage: `一部のメタデータ保存に失敗しました: ${errors.join(", ")}` });
        }
      },
    }),
    {
      name: "lochord-storage",
      partialize: (state) => ({
        musicRoot: state.musicRoot,
      }),
    }
  )
);
