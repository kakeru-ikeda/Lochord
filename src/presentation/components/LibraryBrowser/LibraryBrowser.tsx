import { useMemo, useState, useRef } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { Track } from "../../../domain/entities/Track";
import { formatDuration } from "../../../domain/rules/m3uPathResolver";
import { ChevronDown, ChevronRight, FolderOpen, Music, Plus, RefreshCw, Search } from "lucide-react";
import { useTranslation } from "../../hooks/useTranslation";
import { useRubberBandSelect } from "../../hooks/useRubberBandSelect";

interface AlbumGroup {
  folder: string;
  tracks: Track[];
}

interface DraggableTrackProps {
  track: Track;
  isSelected: boolean;
  onAdd: (track: Track) => void;
  onSelect: (track: Track, e: React.MouseEvent) => void;
  addTitle: string;
}

function DraggableTrack({ track, isSelected, onAdd, onSelect, addTitle }: DraggableTrackProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `library-${track.absolutePath}`,
    data: { track },
  });

  return (
    <div
      ref={setNodeRef}
      data-track-path={track.absolutePath}
      className={`library-track ${isDragging ? "dragging" : ""} ${isSelected ? "library-track-editing" : ""}`}
      onClick={(e) => onSelect(track, e)}
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
  selectedPaths: Set<string>;
  onAdd: (track: Track) => void;
  onSelect: (track: Track, e: React.MouseEvent) => void;
  trackCountLabel: (count: number) => string;
  addTitle: string;
}

function FolderNode({ group, selectedPaths, onAdd, onSelect, trackCountLabel, addTitle }: FolderNodeProps) {
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
            <DraggableTrack
              key={t.absolutePath}
              track={t}
              isSelected={selectedPaths.has(t.absolutePath)}
              onAdd={onAdd}
              onSelect={onSelect}
              addTitle={addTitle}
            />
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
  const selectTracksForEdit = useLochordStore((s) => s.selectTracksForEdit);
  const selectedTracksForEdit = useLochordStore((s) => s.selectedTracksForEdit);

  const [searchQuery, setSearchQuery] = useState("");
  const lastClickedPathRef = useRef<string | null>(null);
  const libraryContentRef = useRef<HTMLDivElement>(null);

  const selectedPathsSet = new Set(selectedTracksForEdit.map((t) => t.absolutePath));

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

  // Flat ordered list of all visible tracks for range selection
  const flatTracks = useMemo(() => albumGroups.flatMap((g) => g.tracks), [albumGroups]);

  const { selectionRect, handleMouseDown: handleRubberBandMouseDown } = useRubberBandSelect(
    libraryContentRef,
    flatTracks,
    (selected) => selectTracksForEdit(selected),
  );

  const handleAdd = (track: Track) => {
    if (!selectedPlaylistPath) {
      useLochordStore.setState({ errorMessage: t.library.selectPlaylistFirst });
      return;
    }
    // +ボタンを押したトラックが複数選択の中にある → 全選択を追加
    if (selectedPathsSet.has(track.absolutePath) && selectedTracksForEdit.length > 1) {
      for (const t of selectedTracksForEdit) {
        addTrackToPlaylist(t);
      }
    } else {
      addTrackToPlaylist(track);
    }
  };

  const handleTrackSelect = (track: Track, e: React.MouseEvent) => {
    const paths = flatTracks.map((t) => t.absolutePath);
    let newPaths: Set<string>;

    if (e.ctrlKey || e.metaKey) {
      newPaths = new Set(selectedPathsSet);
      if (newPaths.has(track.absolutePath)) {
        newPaths.delete(track.absolutePath);
      } else {
        newPaths.add(track.absolutePath);
      }
      lastClickedPathRef.current = track.absolutePath;
    } else if (e.shiftKey && lastClickedPathRef.current) {
      const lastIdx = paths.indexOf(lastClickedPathRef.current);
      const currIdx = paths.indexOf(track.absolutePath);
      const [from, to] = lastIdx <= currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      newPaths = new Set(paths.slice(from, to + 1));
    } else {
      newPaths = new Set([track.absolutePath]);
      lastClickedPathRef.current = track.absolutePath;
    }

    const newSelection = flatTracks.filter((t) => newPaths.has(t.absolutePath));
    selectTracksForEdit(newSelection);
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

      <div
        ref={libraryContentRef}
        className="library-content"
        onMouseDown={handleRubberBandMouseDown}
        onClick={(e) => { if (e.target === e.currentTarget) selectTracksForEdit([]); }}
      >
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
              selectedPaths={selectedPathsSet}
              onAdd={handleAdd}
              onSelect={handleTrackSelect}
              trackCountLabel={t.library.trackCount}
              addTitle={t.library.addToPlaylistTitle}
            />
          ))}
        {selectionRect && (
          <div
            className="rubber-band-rect"
            style={{
              left: selectionRect.left,
              top: selectionRect.top,
              width: selectionRect.width,
              height: selectionRect.height,
            }}
          />
        )}
      </div>
    </div>
  );
}
