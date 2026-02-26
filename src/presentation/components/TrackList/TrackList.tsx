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
import { useTranslation } from "../../hooks/useTranslation";
import { useRubberBandSelect } from "../../hooks/useRubberBandSelect";
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
  isSelected: boolean;
  onRemove: (absolutePath: string) => void;
  onSelect: (track: Track, e: React.MouseEvent) => void;
  removeTitle: string;
}

function SortableTrackRow({ track, index, isSelected, onRemove, onSelect, removeTitle }: SortableTrackRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: track.absolutePath });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-track-path={track.absolutePath}
      className={`track-row ${isSelected ? "track-row-editing" : ""}`}
      onClick={(e) => onSelect(track, e)}
    >
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
        onClick={(e) => {
          e.stopPropagation();
          onRemove(track.absolutePath);
        }}
        title={removeTitle}
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
  const selectTracksForEdit = useLochordStore((s) => s.selectTracksForEdit);
  const selectedTracksForEdit = useLochordStore((s) => s.selectedTracksForEdit);
  const saveExtension = useSettingsStore((s) => s.settings.saveExtension);

  const t = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastClickedPathRef = useRef<string | null>(null);
  const tracklistBodyRef = useRef<HTMLDivElement>(null);

  // Track selected paths as a Set for O(1) lookup
  const selectedPathsSet = new Set(selectedTracksForEdit.map((t) => t.absolutePath));

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

  const handleTrackSelect = (track: Track, e: React.MouseEvent) => {
    const paths = tracks.map((t) => t.absolutePath);
    let newPaths: Set<string>;

    if (e.ctrlKey || e.metaKey) {
      // Ctrl/Cmd+Click: toggle this track
      newPaths = new Set(selectedPathsSet);
      if (newPaths.has(track.absolutePath)) {
        newPaths.delete(track.absolutePath);
      } else {
        newPaths.add(track.absolutePath);
      }
      lastClickedPathRef.current = track.absolutePath;
    } else if (e.shiftKey && lastClickedPathRef.current) {
      // Shift+Click: range select
      const lastIdx = paths.indexOf(lastClickedPathRef.current);
      const currIdx = paths.indexOf(track.absolutePath);
      const [from, to] = lastIdx <= currIdx ? [lastIdx, currIdx] : [currIdx, lastIdx];
      newPaths = new Set(paths.slice(from, to + 1));
    } else {
      // Plain click: single select
      newPaths = new Set([track.absolutePath]);
      lastClickedPathRef.current = track.absolutePath;
    }

    const newSelection = tracks.filter((t) => newPaths.has(t.absolutePath));
    selectTracksForEdit(newSelection);
  };

  const selectedPlaylist = playlists.find((p) => p.path === selectedPlaylistPath);
  const tracks = selectedPlaylist?.tracks ?? [];
  const isDirty = selectedPlaylist?.isDirty ?? false;

  const { selectionRect, handleMouseDown: handleRubberBandMouseDown } = useRubberBandSelect(
    tracklistBodyRef,
    tracks,
    (selected) => selectTracksForEdit(selected),
  );

  // Compute total duration
  const totalSeconds = tracks.reduce((sum, t) => sum + (t.duration > 0 ? t.duration : 0), 0);
  const totalDuration = formatDuration(totalSeconds);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeIdx = tracks.findIndex((t) => t.absolutePath === active.id);
    const overIdx = tracks.findIndex((t) => t.absolutePath === over.id);

    // 複数選択中のトラックを掴んだ場合は選択グループをまとめて移動
    if (selectedPathsSet.has(String(active.id)) && selectedTracksForEdit.length > 1) {
      const selectedInOrder = tracks.filter((t) => selectedPathsSet.has(t.absolutePath));
      const unselected = tracks.filter((t) => !selectedPathsSet.has(t.absolutePath));

      let insertAt: number;
      if (!selectedPathsSet.has(String(over.id))) {
        const overInUnselected = unselected.findIndex((t) => t.absolutePath === over.id);
        // ドラッグ方向で挿入位置を決める
        insertAt = overIdx > activeIdx ? overInUnselected + 1 : overInUnselected;
      } else {
        // over 対象も選択済み → overIdx より前にある非選択アイテム数を数える
        insertAt = unselected.filter(
          (t) => tracks.findIndex((u) => u.absolutePath === t.absolutePath) < overIdx,
        ).length;
      }

      reorderTracks([
        ...unselected.slice(0, insertAt),
        ...selectedInOrder,
        ...unselected.slice(insertAt),
      ]);
    } else {
      reorderTracks(arrayMove(tracks, activeIdx, overIdx));
    }
  };

  if (!selectedPlaylistPath) {
    return (
      <div className="tracklist-empty-state">
        <p>{t.tracklist.selectPrompt}</p>
      </div>
    );
  }

  const playlistName = playlistNameFromPath(selectedPlaylistPath);

  return (
    <div className="tracklist">
      <div className="tracklist-header">
        <div className="tracklist-header-left">
          <h2 className="tracklist-title">{playlistName}</h2>
          {isDirty && <span className="tracklist-dirty-badge">{t.tracklist.unsaved}</span>}
          {tracks.length > 0 && (
            <span className="tracklist-stats">
              {t.tracklist.stats(tracks.length, totalDuration)}
            </span>
          )}
        </div>
        <div className="save-btn-group" ref={dropdownRef}>
          <button
            className={`save-btn save-btn-main ${isDirty ? "save-btn-dirty" : ""}`}
            onClick={saveCurrentPlaylist}
            title={t.tracklist.saveTitle}
          >
            <Save size={14} /> {t.tracklist.saveLabel}
          </button>
          <button
            className={`save-btn save-btn-dropdown-toggle ${isDirty ? "save-btn-dirty" : ""}`}
            onClick={() => setDropdownOpen((o) => !o)}
            title={t.tracklist.saveFormatTitle}
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
        <div className="tracklist-empty" onClick={() => selectTracksForEdit([])}>
          <p>{t.tracklist.emptyHint}</p>
        </div>
      ) : (
        <div
          ref={tracklistBodyRef}
          className="tracklist-body"
          onMouseDown={handleRubberBandMouseDown}
          onClick={(e) => { if (e.target === e.currentTarget) selectTracksForEdit([]); }}
        >
          <div className="track-header-row">
            <span className="track-drag-handle" />
            <span className="track-index">#</span>
            <span className="track-title">{t.tracklist.titleColumn}</span>
            <span className="track-duration">{t.tracklist.durationColumn}</span>
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
                  isSelected={selectedPathsSet.has(track.absolutePath)}
                  onRemove={removeTrackFromPlaylist}
                  onSelect={handleTrackSelect}
                  removeTitle={t.tracklist.removeTitle}
                />
              ))}
            </SortableContext>
          </DndContext>
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
      )}
    </div>
  );
}
