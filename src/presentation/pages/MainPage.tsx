import { useEffect, useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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
import type { Track } from "../../domain/entities/Track";

export function MainPage() {
  const musicRoot = useLochordStore((s) => s.musicRoot);
  const loadPlaylists = useLochordStore((s) => s.loadPlaylists);
  const scanLibrary = useLochordStore((s) => s.scanLibrary);
  const selectMusicRoot = useLochordStore((s) => s.selectMusicRoot);
  const addTrackToPlaylist = useLochordStore((s) => s.addTrackToPlaylist);
  const selectedTracksForEdit = useLochordStore((s) => s.selectedTracksForEdit);
  const saveCurrentPlaylist = useLochordStore((s) => s.saveCurrentPlaylist);
  const createPlaylist = useLochordStore((s) => s.createPlaylist);
  const errorMessage = useLochordStore((s) => s.errorMessage);
  const clearError = useLochordStore((s) => s.clearError);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDragTrack, setActiveDragTrack] = useState<Track | null>(null);

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

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 8px 以上動かさないとドラッグ開始しない → クリックと区別できる
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTrack(null);
    const { active } = event;
    const draggedTrack = active.data.current?.track;
    if (!draggedTrack) return;

    // ドラッグしたトラックが複数選択の中に含まれていれば全選択を追加
    const selectedPaths = new Set(selectedTracksForEdit.map((t) => t.absolutePath));
    if (selectedPaths.has(draggedTrack.absolutePath) && selectedTracksForEdit.length > 1) {
      for (const track of selectedTracksForEdit) {
        addTrackToPlaylist(track);
      }
    } else {
      addTrackToPlaylist(draggedTrack);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(e: DragStartEvent) => setActiveDragTrack(e.active.data.current?.track ?? null)}
      onDragEnd={handleDragEnd}
    >
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
      <DragOverlay dropAnimation={null}>
        {activeDragTrack && (() => {
          const selectedPaths = new Set(selectedTracksForEdit.map((t) => t.absolutePath));
          const count = selectedPaths.has(activeDragTrack.absolutePath) && selectedTracksForEdit.length > 1
            ? selectedTracksForEdit.length
            : 1;
          return (
            <div className="drag-overlay-track">
              <Music size={12} className="drag-overlay-icon" />
              <span className="drag-overlay-title">{activeDragTrack.title}</span>
              {count > 1 && (
                <span className="drag-overlay-badge">{count}</span>
              )}
            </div>
          );
        })()}
      </DragOverlay>

      {/* Settings modal */}
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </DndContext>
  );
}
