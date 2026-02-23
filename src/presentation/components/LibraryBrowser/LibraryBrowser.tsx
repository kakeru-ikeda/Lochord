import { useMemo, useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { Track } from "../../../domain/entities/Track";
import { formatDuration } from "../../../domain/rules/m3uPathResolver";
import { ChevronDown, ChevronRight, FolderOpen, Music, Plus, RefreshCw } from "lucide-react";

interface AlbumGroup {
  folder: string;
  tracks: Track[];
}

interface DraggableTrackProps {
  track: Track;
  onAdd: (track: Track) => void;
}

function DraggableTrack({ track, onAdd }: DraggableTrackProps) {
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
        title="プレイリストに追加"
      >
        <Plus size={12} />
      </button>
    </div>
  );
}

interface FolderNodeProps {
  group: AlbumGroup;
  onAdd: (track: Track) => void;
}

function FolderNode({ group, onAdd }: FolderNodeProps) {
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
        <span className="library-folder-count">{group.tracks.length}曲</span>
      </div>
      {open && (
        <div className="library-folder-tracks">
          {group.tracks.map((t) => (
            <DraggableTrack key={t.absolutePath} track={t} onAdd={onAdd} />
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

  const albumGroups = useMemo((): AlbumGroup[] => {
    const map = new Map<string, Track[]>();
    for (const track of libraryTracks) {
      const parts = track.relativePath.replace(/\\/g, "/").split("/");
      const folder = parts.length > 1 ? parts.slice(0, -1).join("/") : "(root)";
      if (!map.has(folder)) map.set(folder, []);
      map.get(folder)!.push(track);
    }
    return Array.from(map.entries()).map(([folder, tracks]) => ({ folder, tracks }));
  }, [libraryTracks]);

  const handleAdd = (track: Track) => {
    if (!selectedPlaylistPath) {
      alert("先にプレイリストを選択してください");
      return;
    }
    addTrackToPlaylist(track);
  };

  return (
    <div className="library-browser">
      <div className="library-header">
        <span className="library-title">
          <FolderOpen size={14} /> ライブラリ
        </span>
        {musicRoot && (
          <span className="library-root-path" title={musicRoot}>
            {musicRoot}
          </span>
        )}
        <button
          className="library-refresh-btn"
          onClick={scanLibrary}
          disabled={isScanning}
          title="再スキャン"
        >
          <RefreshCw size={14} className={isScanning ? "spinning" : ""} />
        </button>
      </div>

      <div className="library-content">
        {isScanning && <p className="library-scanning">スキャン中...</p>}
        {!isScanning && libraryTracks.length === 0 && (
          <p className="library-empty">音楽ファイルが見つかりません</p>
        )}
        {!isScanning &&
          albumGroups.map((group) => (
            <FolderNode key={group.folder} group={group} onAdd={handleAdd} />
          ))}
      </div>
    </div>
  );
}
