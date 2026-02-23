import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  AppSettings,
  DEFAULT_SETTINGS,
  PathMode,
  SaveExtension,
  ColorTheme,
  Language,
} from "../../domain/entities/AppSettings";

interface SettingsState {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
  resolvePlaylistDir: (musicRoot: string) => string;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,

      updateSettings: (patch) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),

      resolvePlaylistDir: (musicRoot) => {
        const { playlistDir } = get().settings;
        if (playlistDir) return playlistDir;
        return `${musicRoot.replace(/\\/g, "/")}/Playlists`;
      },
    }),
    {
      name: "lochord-settings",
    }
  )
);

// Re-export types for convenience
export type { AppSettings, PathMode, SaveExtension, ColorTheme, Language };
