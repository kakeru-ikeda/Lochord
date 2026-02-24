import { useState } from "react";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { playlistNameFromPath } from "../../../domain/rules/m3uPathResolver";
import { ConfirmDialog } from "../ConfirmDialog/ConfirmDialog";
import { useTranslation } from "../../hooks/useTranslation";
import { Music, Plus, Trash2 } from "lucide-react";

export function PlaylistPanel() {
  const playlists = useLochordStore((s) => s.playlists);
  const selectedPlaylistPath = useLochordStore((s) => s.selectedPlaylistPath);
  const selectPlaylist = useLochordStore((s) => s.selectPlaylist);
  const createPlaylist = useLochordStore((s) => s.createPlaylist);
  const deletePlaylist = useLochordStore((s) => s.deletePlaylist);

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ path: string; name: string } | null>(null);

  const t = useTranslation();

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

  const handleConfirmDelete = async () => {
    if (deleteTarget) {
      await deletePlaylist(deleteTarget.path);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="playlist-panel">
      <div className="playlist-panel-header">
        <span className="playlist-panel-title">
          <Music size={14} /> {t.playlist.header}
        </span>
      </div>

      <div className="playlist-list">
        {playlists.length === 0 && (
          <p className="playlist-empty">{t.playlist.empty}</p>
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
              <span className="playlist-item-name">
                {name}
                {pl.isDirty && <span className="playlist-dirty-dot">●</span>}
              </span>
              <button
                className="playlist-item-delete"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget({ path: pl.path, name });
                }}
                title={t.playlist.deleteButtonTitle}
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
            placeholder={t.playlist.namePlaceholder}
          />
        ) : (
          <button
            className="playlist-create-btn"
            onClick={() => setIsCreating(true)}
          >
            <Plus size={14} /> {t.playlist.newPlaylist}
          </button>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t.playlist.deleteDialogTitle}
        message={t.playlist.deleteMessage(deleteTarget?.name ?? "")}
        confirmLabel={t.playlist.deleteConfirm}
        cancelLabel={t.playlist.deleteCancel}
        danger
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
