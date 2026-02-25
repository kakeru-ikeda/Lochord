import { useState, useEffect } from "react";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { AudioTags } from "../../../domain/entities/AudioTags";
import { formatDuration } from "../../../domain/rules/m3uPathResolver";
import { useTranslation } from "../../hooks/useTranslation";
import { Music, Save, RotateCcw, ImagePlus, Trash2, Loader } from "lucide-react";

export function MetadataEditor() {
  const selectedTrack = useLochordStore((s) => s.selectedTrackForEdit);
  const isLoadingTags = useLochordStore((s) => s.isLoadingTags);
  const updateTrackMetadata = useLochordStore((s) => s.updateTrackMetadata);

  const t = useTranslation();

  // Local form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Sync form when selected track changes
  useEffect(() => {
    if (selectedTrack) {
      setTitle(selectedTrack.title);
      setArtist(selectedTrack.artist);
      setAlbum(selectedTrack.album ?? "");
      setGenre(selectedTrack.genre ?? "");
      setYear(selectedTrack.year ? String(selectedTrack.year) : "");
      setCoverArt(selectedTrack.coverArt ?? "");
      setSaveMessage(null);
    }
  }, [selectedTrack]);

  if (!selectedTrack) {
    return (
      <div className="metadata-editor metadata-editor-empty">
        <Music size={32} className="metadata-empty-icon" />
        <p>{t.metadata.selectPrompt}</p>
      </div>
    );
  }

  const hasChanges =
    title !== selectedTrack.title ||
    artist !== selectedTrack.artist ||
    album !== (selectedTrack.album ?? "") ||
    genre !== (selectedTrack.genre ?? "") ||
    year !== (selectedTrack.year ? String(selectedTrack.year) : "") ||
    coverArt !== (selectedTrack.coverArt ?? "");

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const tags: AudioTags = {
        title,
        artist,
        album,
        genre,
        year: year ? parseInt(year, 10) || 0 : 0,
        coverArt,
      };
      await updateTrackMetadata(selectedTrack.absolutePath, tags);
      setSaveMessage(t.metadata.saveSuccess);
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage(t.metadata.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setTitle(selectedTrack.title);
    setArtist(selectedTrack.artist);
    setAlbum(selectedTrack.album ?? "");
    setGenre(selectedTrack.genre ?? "");
    setYear(selectedTrack.year ? String(selectedTrack.year) : "");
    setCoverArt(selectedTrack.coverArt ?? "");
    setSaveMessage(null);
  };

  const handleCoverSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/bmp,image/gif";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setCoverArt(reader.result);
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCoverRemove = () => {
    setCoverArt("");
  };

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <Music size={14} />
        <span>{t.metadata.header}</span>
      </div>

      {isLoadingTags && (
        <div className="metadata-loading">
          <Loader size={16} className="spinning" />
        </div>
      )}

      <div className="metadata-body">
        {/* Cover Art */}
        <div className="metadata-cover-section">
          {coverArt ? (
            <img
              src={coverArt}
              alt={t.metadata.coverArt}
              className="metadata-cover-img"
              onClick={handleCoverSelect}
            />
          ) : (
            <div className="metadata-cover-placeholder" onClick={handleCoverSelect}>
              <ImagePlus size={24} />
              <span>{t.metadata.coverArtSelect}</span>
            </div>
          )}
          <div className="metadata-cover-actions">
            <button className="metadata-cover-btn" onClick={handleCoverSelect} title={t.metadata.coverArtSelect}>
              <ImagePlus size={12} /> {t.metadata.coverArtSelect}
            </button>
            {coverArt && (
              <button className="metadata-cover-btn metadata-cover-remove" onClick={handleCoverRemove} title={t.metadata.coverArtRemove}>
                <Trash2 size={12} /> {t.metadata.coverArtRemove}
              </button>
            )}
          </div>
        </div>

        {/* Text fields */}
        <div className="metadata-fields">
          <label className="metadata-label">
            <span>{t.metadata.title}</span>
            <input
              className="metadata-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.artist}</span>
            <input
              className="metadata-input"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.album}</span>
            <input
              className="metadata-input"
              type="text"
              value={album}
              onChange={(e) => setAlbum(e.target.value)}
            />
          </label>

          <div className="metadata-row">
            <label className="metadata-label metadata-label-half">
              <span>{t.metadata.genre}</span>
              <input
                className="metadata-input"
                type="text"
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
              />
            </label>
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.year}</span>
              <input
                className="metadata-input"
                type="text"
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/\D/g, ""))}
                maxLength={4}
              />
            </label>
          </div>
        </div>

        {/* File info (read-only) */}
        <div className="metadata-info">
          <div className="metadata-info-row">
            <span className="metadata-info-label">{t.metadata.duration}</span>
            <span className="metadata-info-value">{formatDuration(selectedTrack.duration)}</span>
          </div>
          <div className="metadata-info-row">
            <span className="metadata-info-label">{t.metadata.filePath}</span>
            <span className="metadata-info-value metadata-info-path" title={selectedTrack.absolutePath}>
              {selectedTrack.absolutePath}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="metadata-actions">
        {saveMessage && (
          <span className="metadata-save-message">{saveMessage}</span>
        )}
        <button
          className="metadata-btn metadata-btn-reset"
          onClick={handleReset}
          disabled={!hasChanges || isSaving}
        >
          <RotateCcw size={12} /> {t.metadata.reset}
        </button>
        <button
          className="metadata-btn metadata-btn-save"
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? (
            <><Loader size={12} className="spinning" /> {t.metadata.saving}</>
          ) : (
            <><Save size={12} /> {t.metadata.save}</>
          )}
        </button>
      </div>
    </div>
  );
}
