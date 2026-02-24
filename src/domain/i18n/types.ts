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
};
