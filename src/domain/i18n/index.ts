import { ja } from "./translations/ja";
import { en } from "./translations/en";
import { ko } from "./translations/ko";
import { zh } from "./translations/zh";
import type { Language } from "../entities/AppSettings";

// ──────────────────────────────────────────
// Type definition (derived from the Japanese dictionary as the source of truth)
// ──────────────────────────────────────────
export type Translations = {
  header: {
    changeFolder: string;
    changeFolderTitle: string;
    settingsTitle: string;
  };
  playlist: {
    header: string;
    empty: string;
    newPlaylist: string;
    namePlaceholder: string;
    deleteButtonTitle: string;
    deleteDialogTitle: string;
    deleteMessage: (name: string) => string;
    deleteConfirm: string;
    deleteCancel: string;
    newNamePrompt: string;
  };
  tracklist: {
    selectPrompt: string;
    unsaved: string;
    stats: (count: number, duration: string) => string;
    saveTitle: string;
    saveLabel: string;
    saveFormatTitle: string;
    emptyHint: string;
    titleColumn: string;
    durationColumn: string;
    removeTitle: string;
  };
  library: {
    header: string;
    searchPlaceholder: string;
    rescanTitle: string;
    scanning: string;
    empty: string;
    noResults: (query: string) => string;
    trackCount: (count: number) => string;
    addToPlaylistTitle: string;
    selectPlaylistFirst: string;
  };
  onboarding: {
    description: string;
    hint1: string;
    hint2: string;
    openFolder: string;
  };
  settings: {
    title: string;
    tabs: {
      playlist: string;
      scan: string;
      display: string;
    };
    playlist: {
      pathModeLabel: string;
      pathModes: {
        relative: { label: string; desc: string };
        absolute: { label: string; desc: string };
        relativeFromRoot: { label: string; desc: string };
      };
      dirLabel: string;
      dirPlaceholder: string;
      dirReset: string;
      extensionLabel: string;
      autoSaveCheckbox: string;
    };
    scan: {
      extensionsLabel: string;
      extensionAddPlaceholder: string;
      extensionsReset: string;
      excludeLabel: string;
      excludeNone: string;
      excludeAddPlaceholder: string;
      addButton: string;
    };
    display: {
      themeLabel: string;
      themes: {
        system: string;
        dark: string;
        light: string;
      };
      languageLabel: string;
    };
    footer: {
      reset: string;
      cancel: string;
      save: string;
    };
  };
  metadata: {
    header: string;
    selectPrompt: string;
    title: string;
    artist: string;
    albumArtist: string;
    album: string;
    genre: string;
    year: string;
    trackNumber: string;
    totalTracks: string;
    discNumber: string;
    totalDiscs: string;
    composer: string;
    comment: string;
    lyrics: string;
    bpm: string;
    copyright: string;
    publisher: string;
    isrc: string;
    coverArt: string;
    coverArtSelect: string;
    coverArtRemove: string;
    filePath: string;
    duration: string;
    save: string;
    reset: string;
    saving: string;
    saveSuccess: string;
    saveError: string;
  };
};

const dictionaries: Record<Language, Translations> = { ja, en, ko, zh };

export function getTranslations(language: Language): Translations {
  return dictionaries[language] ?? ja;
}
