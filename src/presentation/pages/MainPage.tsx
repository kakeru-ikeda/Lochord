import { useEffect } from "react";
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
import { Music, X } from "lucide-react";

export function MainPage() {
  const musicRoot = useLochordStore((s) => s.musicRoot);
  const loadPlaylists = useLochordStore((s) => s.loadPlaylists);
  const scanLibrary = useLochordStore((s) => s.scanLibrary);
  const addTrackToPlaylist = useLochordStore((s) => s.addTrackToPlaylist);
  const errorMessage = useLochordStore((s) => s.errorMessage);
  const clearError = useLochordStore((s) => s.clearError);

  useEffect(() => {
    if (musicRoot) {
      scanLibrary();
      loadPlaylists();
    }
    // Zustand actions are stable references - safe to include in deps
  }, [musicRoot, scanLibrary, loadPlaylists]);

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
        </header>

        {/* Body */}
        <div className="main-body">
          {/* Left: Playlist panel */}
          <aside className="left-pane">
            <PlaylistPanel />
          </aside>

          {/* Center: Track list */}
          <main className="center-pane">
            <TrackList />
          </main>
        </div>

        {/* Bottom: Library browser */}
        <div className="bottom-pane">
          <LibraryBrowser />
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
    </DndContext>
  );
}
