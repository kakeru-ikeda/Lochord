import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useLochordStore } from "../../application/store/useLochordStore";
import { PlaylistPanel } from "../components/PlaylistPanel/PlaylistPanel";
import { TrackList } from "../components/TrackList/TrackList";
import { LibraryBrowser } from "../components/LibraryBrowser/LibraryBrowser";
import { MetadataEditor } from "../components/MetadataEditor/MetadataEditor";
import { SettingsModal } from "../components/SettingsModal/SettingsModal";
import { useTranslation } from "../hooks/useTranslation";
import { FolderOpen, Music, Settings, X } from "lucide-react";

export function MainPage() {
  const musicRoot = useLochordStore((s) => s.musicRoot);
  const loadPlaylists = useLochordStore((s) => s.loadPlaylists);
  const scanLibrary = useLochordStore((s) => s.scanLibrary);
  const selectMusicRoot = useLochordStore((s) => s.selectMusicRoot);
  const addTrackToPlaylist = useLochordStore((s) => s.addTrackToPlaylist);
  const saveCurrentPlaylist = useLochordStore((s) => s.saveCurrentPlaylist);
  const createPlaylist = useLochordStore((s) => s.createPlaylist);
  const errorMessage = useLochordStore((s) => s.errorMessage);
  const clearError = useLochordStore((s) => s.clearError);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const t = useTranslation();

  useEffect(() => {
    if (musicRoot) {
      scanLibrary();
      loadPlaylists();
    }
    // Zustand actions are stable references - safe to include in deps
  }, [musicRoot, scanLibrary, loadPlaylists]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ctrl+S / Cmd+S — save playlist
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveCurrentPlaylist();
      }
      // Ctrl+N / Cmd+N — new playlist (prompt)
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        const name = prompt(t.playlist.newNamePrompt);
        if (name?.trim()) createPlaylist(name.trim());
      }
      // F5 — rescan library
      if (e.key === "F5") {
        e.preventDefault();
        scanLibrary();
      }
      // , (comma) — open settings
      if (e.key === "," && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        setSettingsOpen(true);
      }
    },
    [saveCurrentPlaylist, createPlaylist, scanLibrary]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active } = event;
    if (active.data.current?.track) {
      addTrackToPlaylist(active.data.current.track);
    }
  };

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="main-layout">
        {/* Header */}
        <header className="app-header">
          <span className="app-logo">
            <Music size={18} /> Lochord
          </span>
          {musicRoot && (
            <span className="app-root-indicator" title={musicRoot}>
              📂 {musicRoot}
            </span>
          )}
          <div className="app-header-actions">
            <button
              className="change-dir-btn"
              onClick={selectMusicRoot}
              title={t.header.changeFolderTitle}
            >
              <FolderOpen size={14} />
              {t.header.changeFolder}
            </button>
            <button
              className="settings-btn"
              onClick={() => setSettingsOpen(true)}
              title={t.header.settingsTitle}
            >
              <Settings size={16} />
            </button>
          </div>
        </header>

        {/* Body */}
        <div className="main-body">
          {/* Left: Playlist panel */}
          <aside className="left-pane">
            <PlaylistPanel />
          </aside>

          {/* Center: Track list + Library */}
          <main className="center-pane">
            <div className="center-upper">
              <TrackList />
            </div>
            <div className="center-lower">
              <LibraryBrowser />
            </div>
          </main>

          {/* Right: Metadata editor */}
          <aside className="right-pane">
            <MetadataEditor />
          </aside>
        </div>

        {/* Error toast */}
        {errorMessage && (
          <div className="error-toast">
            <span>{errorMessage}</span>
            <button onClick={clearError}>
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      <DragOverlay />

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </DndContext>
  );
}
