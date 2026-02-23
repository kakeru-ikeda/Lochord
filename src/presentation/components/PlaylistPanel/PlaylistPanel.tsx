import React, { useState } from "react";import { useLochordStore } from "../../../application/store/useLochordStore";
import { playlistNameFromPath } from "../../../domain/rules/m3uPathResolver";
import { Music, Plus, Trash2 } from "lucide-react";

export function PlaylistPanel() {
  const playlists = useLochordStore((s) => s.playlists);
  const selectedPlaylistPath = useLochordStore((s) => s.selectedPlaylistPath);
  const selectPlaylist = useLochordStore((s) => s.selectPlaylist);
  const createPlaylist = useLochordStore((s) => s.createPlaylist);
  const deletePlaylist = useLochordStore((s) => s.deletePlaylist);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = async () => {
    if (newName.trim()) {
      await createPlaylist(newName.trim());
      setNewName("");
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleCreate();
    if (e.key === "Escape") {
      setIsCreating(false);
      setNewName("");
    }
  };

  return (
    <div className="playlist-panel">
      <div className="playlist-panel-header">
        <span className="playlist-panel-title">
          <Music size={14} /> Playlists
        </span>
      </div>

      <div className="playlist-list">
        {playlists.length === 0 && (
          <p className="playlist-empty">プレイリストなし</p>
        )}
        {playlists.map((pl) => {
          const name = playlistNameFromPath(pl.path);
          const isSelected = pl.path === selectedPlaylistPath;
          return (
            <div
              key={pl.path}
              className={`playlist-item ${isSelected ? "selected" : ""}`}
              onClick={() => selectPlaylist(pl.path)}
            >
              <span className="playlist-item-name">{name}</span>
              <button
                className="playlist-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`「${name}」を削除しますか？`)) {
                    deletePlaylist(pl.path);
                  }
                }}
                title="削除"
              >
                <Trash2 size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="playlist-panel-footer">
        {isCreating ? (
          <input
            className="playlist-new-input"
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!newName.trim()) {
                setIsCreating(false);
              }
            }}
            placeholder="プレイリスト名..."
          />
        ) : (
          <button
            className="playlist-create-btn"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} /> 新規作成
          </button>
        )}
      </div>
    </div>
  );
}
