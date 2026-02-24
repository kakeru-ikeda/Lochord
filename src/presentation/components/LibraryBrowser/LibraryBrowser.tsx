import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { Track } from "../../../domain/entities/Track";
import { formatDuration } from "../../../domain/rules/m3uPathResolver";
import { ChevronDown, ChevronRight, FolderOpen, Music, Plus, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";

interface AlbumGroup {
  folder: string;
  tracks: Track[];
}

interface DraggableTrackProps {
  track: Track;
  onAdd: (track: Track) => void;
  addTitle: string;
}

function DraggableTrack({ track, onAdd, addTitle }: DraggableTrackProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${track.absolutePath}`,
    data: { track },
  });

  return (
    <div
      ref={setNodeRef}
      className={`library-track ${isDragging ? "dragging" : ""}`}
      {...attributes}
      {...listeners}
    >
      <Music size={12} className="library-track-icon" />
      <span className="library-track-title">{track.title}</span>
      <span className="library-track-duration">{formatDuration(track.duration)}</span>
      <button
        className="library-track-add"
        onClick={(e) => {
          e.stopPropagation();
          onAdd(track);
        }}
        title={addTitle}
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

interface FolderNodeProps {
  group: AlbumGroup;
  onAdd: (track: Track) => void;
  trackCountLabel: (count: number) => string;
  addTitle: string;
}

function FolderNode({ group, onAdd, trackCountLabel, addTitle }: FolderNodeProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="library-folder">
      <div
        className="library-folder-header"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <FolderOpen size={14} />
        <span className="library-folder-name">{group.folder}</span>
        <span className="library-folder-count">{trackCountLabel(group.tracks.length)}</span>
      </div>
      {open && (
        <div className="library-folder-tracks">
          {group.tracks.map((t) => (
            <DraggableTrack key={t.absolutePath} track={t} onAdd={onAdd} addTitle={addTitle} />
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryBrowser() {
  const libraryTracks = useLochordStore((s) => s.libraryTracks);
  const musicRoot = useLochordStore((s) => s.musicRoot);
  const isScanning = useLochordStore((s) => s.isScanning);
  const scanLibrary = useLochordStore((s) => s.scanLibrary);
  const addTrackToPlaylist = useLochordStore((s) => s.addTrackToPlaylist);
  const selectedPlaylistPath = useLochordStore((s) => s.selectedPlaylistPath);

  const [searchQuery, setSearchQuery] = useState("");

  const t = useTranslation();

  const albumGroups = useMemo((): AlbumGroup[] => {
    const query = searchQuery.toLowerCase();
    const filtered = query
      ? libraryTracks.filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.artist.toLowerCase().includes(query) ||
            t.relativePath.toLowerCase().includes(query)
        )
      : libraryTracks;

    const map = new Map<string, Track[]>();
    for (const track of filtered) {
      const parts = track.relativePath.replace(/\\/g, "/").split("/");
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(track);
    }
    return Array.from(map.entries()).map(([folder, tracks]) => ({ folder, tracks }));
  }, [libraryTracks, searchQuery]);

  const handleAdd = (track: Track) => {
    if (!selectedPlaylistPath) {
      useLochordStore.setState({ errorMessage: t.library.selectPlaylistFirst });
      return;
    }
    addTrackToPlaylist(track);
  };

  return (
    <div className="library-browser">
      <div className="library-header">
        <span className="library-title">
          <FolderOpen size={14} /> {t.library.header}
        </span>
        <div className="library-search-wrapper">
          <Search size={12} className="library-search-icon" />
          <input
            className="library-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t.library.searchPlaceholder}
          />
        </div>
        {musicRoot && (
          <span className="library-root-path" title={musicRoot}>
            {musicRoot}
          </span>
        )}
        <button
          className="library-refresh-btn"
          onClick={scanLibrary}
          disabled={isScanning}
          title={t.library.rescanTitle}
        >
          <RefreshCw size={14} className={isScanning ? "spinning" : ""} />
        </button>
      </div>

      <div className="library-content">
        {isScanning && <p className="library-scanning">{t.library.scanning}</p>}
        {!isScanning && libraryTracks.length === 0 && (
          <p className="library-empty">{t.library.empty}</p>
        )}
        {!isScanning && libraryTracks.length > 0 && albumGroups.length === 0 && (
          <p className="library-empty">{t.library.noResults(searchQuery)}</p>
        )}
        {!isScanning &&
          albumGroups.map((group) => (
            <FolderNode
              key={group.folder}
              group={group}
              onAdd={handleAdd}
              trackCountLabel={t.library.trackCount}
              addTitle={t.library.addToPlaylistTitle}
            />
          ))}
      </div>
    </div>
  );
}
