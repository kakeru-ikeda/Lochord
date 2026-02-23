import React from "react";
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
import { Track } from "../../../domain/entities/Track";
import { formatDuration, playlistNameFromPath } from "../../../domain/rules/m3uPathResolver";
import { GripVertical, Save, Trash2 } from "lucide-react";

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

  const selectedPlaylist = playlists.find((p) => p.path === selectedPlaylistPath);
  const tracks = selectedPlaylist?.tracks ?? [];

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
        <h2 className="tracklist-title">{playlistName}</h2>
        <button className="save-btn" onClick={saveCurrentPlaylist}>
          <Save size={14} /> 保存
        </button>
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
