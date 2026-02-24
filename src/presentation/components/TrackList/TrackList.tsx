import React, { useRef, useEffect, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { useSettingsStore } from "../../../application/store/useSettingsStore";
import { Track } from "../../../domain/entities/Track";
import { SaveExtension } from "../../../domain/entities/AppSettings";
import { formatDuration, playlistNameFromPath } from "../../../domain/rules/m3uPathResolver";
import { ChevronDown, GripVertical, Save, Trash2 } from "lucide-react";

const FORMAT_OPTIONS: { value: SaveExtension; label: string }[] = [
  { value: "m3u8", label: "M3U8" },
  { value: "m3u", label: "M3U" },
  { value: "txt", label: "TXT" },
  { value: "csv", label: "CSV" },
];

interface SortableTrackRowProps {
  track: Track;
  index: number;
  onRemove: (absolutePath: string) => void;
}

function SortableTrackRow({ track, index, onRemove }: SortableTrackRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.absolutePath });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="track-row">
      <span className="track-drag-handle" {...attributes} {...listeners}>
        <GripVertical size={14} />
      </span>
      <span className="track-index">{index + 1}</span>
      <span className="track-title">
        {track.title}
        {track.artist && (
          <span className="track-artist"> — {track.artist}</span>
        )}
      </span>
      <span className="track-duration">{formatDuration(track.duration)}</span>
      <button
        className="track-remove-btn"
        onClick={() => onRemove(track.absolutePath)}
        title="削除"
      >
        <Trash2 size={12} />
      </button>
    </div>
  );
}

export function TrackList() {
  const playlists = useLochordStore((s) => s.playlists);
  const selectedPlaylistPath = useLochordStore((s) => s.selectedPlaylistPath);
  const reorderTracks = useLochordStore((s) => s.reorderTracks);
  const removeTrackFromPlaylist = useLochordStore((s) => s.removeTrackFromPlaylist);
  const saveCurrentPlaylist = useLochordStore((s) => s.saveCurrentPlaylist);
  const saveCurrentPlaylistAs = useLochordStore((s) => s.saveCurrentPlaylistAs);
  const saveExtension = useSettingsStore((s) => s.settings.saveExtension);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSaveAs = async (ext: SaveExtension) => {
    setDropdownOpen(false);
    await saveCurrentPlaylistAs(ext);
  };

  const selectedPlaylist = playlists.find((p) => p.path === selectedPlaylistPath);
  const tracks = selectedPlaylist?.tracks ?? [];
  const isDirty = selectedPlaylist?.isDirty ?? false;

  // Compute total duration
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration > 0 ? t.duration : 0), 0);
  const totalDuration = formatDuration(totalSeconds);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = tracks.findIndex((t) => t.absolutePath === active.id);
      const newIndex = tracks.findIndex((t) => t.absolutePath === over.id);
      reorderTracks(arrayMove(tracks, oldIndex, newIndex));
    }
  };

  if (!selectedPlaylistPath) {
    return (
      <div className="tracklist-empty-state">
        <p>← プレイリストを選択してください</p>
      </div>
    );
  }

  const playlistName = playlistNameFromPath(selectedPlaylistPath);

  return (
    <div className="tracklist">
      <div className="tracklist-header">
        <div className="tracklist-header-left">
          <h2 className="tracklist-title">{playlistName}</h2>
          {isDirty && <span className="tracklist-dirty-badge">●未保存</span>}
          {tracks.length > 0 && (
            <span className="tracklist-stats">
              {tracks.length}曲 / {totalDuration}
            </span>
          )}
        </div>
        <div className="save-btn-group" ref={dropdownRef}>
          <button
            className={`save-btn save-btn-main ${isDirty ? "save-btn-dirty" : ""}`}
            onClick={saveCurrentPlaylist}
            title="保存 (Ctrl+S)"
          >
            <Save size={14} /> 保存
          </button>
          <button
            className={`save-btn save-btn-dropdown-toggle ${isDirty ? "save-btn-dirty" : ""}`}
            onClick={() => setDropdownOpen((o) => !o)}
            title="保存形式を選択"
          >
            <ChevronDown size={12} />
          </button>
          {dropdownOpen && (
            <div className="save-dropdown-menu">
              {FORMAT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`save-dropdown-item ${saveExtension === opt.value ? "active" : ""}`}
                  onClick={() => handleSaveAs(opt.value)}
                >
                  {opt.label}
                  {saveExtension === opt.value && (
                    <span className="save-dropdown-check">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {tracks.length === 0 ? (
        <div className="tracklist-empty">
          <p>曲を追加してください（ライブラリの [+] ボタン、またはドラッグ&amp;ドロップ）</p>
        </div>
      ) : (
        <div className="tracklist-body">
          <div className="track-header-row">
            <span className="track-drag-handle" />
            <span className="track-index">#</span>
            <span className="track-title">タイトル</span>
            <span className="track-duration">時間</span>
            <span className="track-remove-btn" />
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={tracks.map((t) => t.absolutePath)}
              strategy={verticalListSortingStrategy}
            >
              {tracks.map((track, i) => (
                <SortableTrackRow
                  key={track.absolutePath}
                  track={track}
                  index={i}
                  onRemove={removeTrackFromPlaylist}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
