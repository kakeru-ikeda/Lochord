import { useState, useEffect } from "react";
import { useLochordStore } from "../../../application/store/useLochordStore";
import { AudioTags } from "../../../domain/entities/AudioTags";
import { Track } from "../../../domain/entities/Track";
import { formatDuration } from "../../../domain/rules/m3uPathResolver";
import { useTranslation } from "../../hooks/useTranslation";
import { Music, Save, RotateCcw, ImagePlus, Trash2, Loader } from "lucide-react";

/** すべてのトラックで同じ値なら its value を、異なる場合は undefined を返す */
function commonValue<T>(tracks: Track[], getter: (t: Track) => T): T | undefined {
  if (tracks.length === 0) return undefined;
  const first = getter(tracks[0]);
  return tracks.every((t) => getter(t) === first) ? first : undefined;
}

function commonStr(tracks: Track[], getter: (t: Track) => string): { value: string; isMixed: boolean } {
  const v = commonValue(tracks, getter);
  if (v === undefined) return { value: "", isMixed: true };
  return { value: v ?? "", isMixed: false };
}

function commonNum(tracks: Track[], getter: (t: Track) => number): { value: string; isMixed: boolean } {
  const v = commonValue(tracks, getter);
  if (v === undefined) return { value: "", isMixed: true };
  return { value: v > 0 ? String(v) : "", isMixed: false };
}

export function MetadataEditor() {
  const selectedTrack = useLochordStore((s) => s.selectedTrackForEdit);
  const selectedTracks = useLochordStore((s) => s.selectedTracksForEdit);
  const isLoadingTags = useLochordStore((s) => s.isLoadingTags);
  const updateTrackMetadata = useLochordStore((s) => s.updateTrackMetadata);
  const updateMultipleTracksMetadata = useLochordStore((s) => s.updateMultipleTracksMetadata);

  const t = useTranslation();

  const isMultiMode = selectedTracks.length > 1;

  // Local form state
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [albumArtist, setAlbumArtist] = useState("");
  const [album, setAlbum] = useState("");
  const [genre, setGenre] = useState("");
  const [year, setYear] = useState("");
  const [trackNumber, setTrackNumber] = useState("");
  const [totalTracks, setTotalTracks] = useState("");
  const [discNumber, setDiscNumber] = useState("");
  const [totalDiscs, setTotalDiscs] = useState("");
  const [composer, setComposer] = useState("");
  const [comment, setComment] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [bpm, setBpm] = useState("");
  const [copyright, setCopyright] = useState("");
  const [publisher, setPublisher] = useState("");
  const [isrc, setIsrc] = useState("");
  const [coverArt, setCoverArt] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Multi-edit tracking
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set());
  const [mixedFields, setMixedFields] = useState<Set<string>>(new Set());

  const touch = (field: string) => {
    setTouchedFields((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  };

  const syncForm = (track: Track) => {
    setTitle(track.title ?? "");
    setArtist(track.artist ?? "");
    setAlbumArtist(track.albumArtist ?? "");
    setAlbum(track.album ?? "");
    setGenre(track.genre ?? "");
    setYear(track.year ? String(track.year) : "");
    setTrackNumber(track.trackNumber ? String(track.trackNumber) : "");
    setTotalTracks(track.totalTracks ? String(track.totalTracks) : "");
    setDiscNumber(track.discNumber ? String(track.discNumber) : "");
    setTotalDiscs(track.totalDiscs ? String(track.totalDiscs) : "");
    setComposer(track.composer ?? "");
    setComment(track.comment ?? "");
    setLyrics(track.lyrics ?? "");
    setBpm(track.bpm ? String(track.bpm) : "");
    setCopyright(track.copyright ?? "");
    setPublisher(track.publisher ?? "");
    setIsrc(track.isrc ?? "");
    setCoverArt(track.coverArt ?? "");
    setSaveMessage(null);
    setTouchedFields(new Set());
    setMixedFields(new Set());
  };

  const syncMultiForm = (tracks: Track[]) => {
    const mixed = new Set<string>();
    const applyField = (field: string, obj: { value: string; isMixed: boolean }, setter: (v: string) => void) => {
      setter(obj.value);
      if (obj.isMixed) mixed.add(field);
    };
    applyField("title", commonStr(tracks, (t) => t.title), setTitle);
    applyField("artist", commonStr(tracks, (t) => t.artist), setArtist);
    applyField("albumArtist", commonStr(tracks, (t) => t.albumArtist), setAlbumArtist);
    applyField("album", commonStr(tracks, (t) => t.album), setAlbum);
    applyField("genre", commonStr(tracks, (t) => t.genre), setGenre);
    applyField("year", commonNum(tracks, (t) => t.year), setYear);
    applyField("trackNumber", commonNum(tracks, (t) => t.trackNumber), setTrackNumber);
    applyField("totalTracks", commonNum(tracks, (t) => t.totalTracks), setTotalTracks);
    applyField("discNumber", commonNum(tracks, (t) => t.discNumber), setDiscNumber);
    applyField("totalDiscs", commonNum(tracks, (t) => t.totalDiscs), setTotalDiscs);
    applyField("composer", commonStr(tracks, (t) => t.composer), setComposer);
    applyField("comment", commonStr(tracks, (t) => t.comment), setComment);
    applyField("lyrics", commonStr(tracks, (t) => t.lyrics), setLyrics);
    applyField("bpm", commonNum(tracks, (t) => t.bpm), setBpm);
    applyField("copyright", commonStr(tracks, (t) => t.copyright), setCopyright);
    applyField("publisher", commonStr(tracks, (t) => t.publisher), setPublisher);
    applyField("isrc", commonStr(tracks, (t) => t.isrc), setIsrc);
    applyField("coverArt", commonStr(tracks, (t) => t.coverArt), setCoverArt);
    setSaveMessage(null);
    setTouchedFields(new Set());
    setMixedFields(mixed);
  };

  // Sync form when selection changes
  useEffect(() => {
    if (selectedTracks.length === 1 && selectedTrack) {
      syncForm(selectedTrack);
    } else if (selectedTracks.length > 1) {
      syncMultiForm(selectedTracks);
    } else {
      setTouchedFields(new Set());
      setMixedFields(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTrack, selectedTracks.length]);

  if (selectedTracks.length === 0) {
    return (
      <div className="metadata-editor metadata-editor-empty">
        <Music size={32} className="metadata-empty-icon" />
        <p>{t.metadata.selectPrompt}</p>
      </div>
    );
  }

  const num = (s: string) => (s ? parseInt(s, 10) || 0 : 0);

  const hasChangesSingle =
    !isMultiMode &&
    selectedTrack !== null &&
    (title !== (selectedTrack.title ?? "") ||
      artist !== (selectedTrack.artist ?? "") ||
      albumArtist !== (selectedTrack.albumArtist ?? "") ||
      album !== (selectedTrack.album ?? "") ||
      genre !== (selectedTrack.genre ?? "") ||
      year !== (selectedTrack.year ? String(selectedTrack.year) : "") ||
      trackNumber !== (selectedTrack.trackNumber ? String(selectedTrack.trackNumber) : "") ||
      totalTracks !== (selectedTrack.totalTracks ? String(selectedTrack.totalTracks) : "") ||
      discNumber !== (selectedTrack.discNumber ? String(selectedTrack.discNumber) : "") ||
      totalDiscs !== (selectedTrack.totalDiscs ? String(selectedTrack.totalDiscs) : "") ||
      composer !== (selectedTrack.composer ?? "") ||
      comment !== (selectedTrack.comment ?? "") ||
      lyrics !== (selectedTrack.lyrics ?? "") ||
      bpm !== (selectedTrack.bpm ? String(selectedTrack.bpm) : "") ||
      copyright !== (selectedTrack.copyright ?? "") ||
      publisher !== (selectedTrack.publisher ?? "") ||
      isrc !== (selectedTrack.isrc ?? "") ||
      coverArt !== (selectedTrack.coverArt ?? ""));

  const hasChanges = isMultiMode ? touchedFields.size > 0 : hasChangesSingle;

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);
    try {
      if (isMultiMode) {
        const partial: Partial<AudioTags> = {};
        if (touchedFields.has("title")) partial.title = title;
        if (touchedFields.has("artist")) partial.artist = artist;
        if (touchedFields.has("albumArtist")) partial.albumArtist = albumArtist;
        if (touchedFields.has("album")) partial.album = album;
        if (touchedFields.has("genre")) partial.genre = genre;
        if (touchedFields.has("year")) partial.year = num(year);
        if (touchedFields.has("trackNumber")) partial.trackNumber = num(trackNumber);
        if (touchedFields.has("totalTracks")) partial.totalTracks = num(totalTracks);
        if (touchedFields.has("discNumber")) partial.discNumber = num(discNumber);
        if (touchedFields.has("totalDiscs")) partial.totalDiscs = num(totalDiscs);
        if (touchedFields.has("composer")) partial.composer = composer;
        if (touchedFields.has("comment")) partial.comment = comment;
        if (touchedFields.has("lyrics")) partial.lyrics = lyrics;
        if (touchedFields.has("bpm")) partial.bpm = num(bpm);
        if (touchedFields.has("copyright")) partial.copyright = copyright;
        if (touchedFields.has("publisher")) partial.publisher = publisher;
        if (touchedFields.has("isrc")) partial.isrc = isrc;
        if (touchedFields.has("coverArt")) partial.coverArt = coverArt;
        await updateMultipleTracksMetadata(
          selectedTracks.map((tr) => tr.absolutePath),
          partial,
        );
        setSaveMessage(t.metadata.multiSaveSuccess(selectedTracks.length));
        setTouchedFields(new Set());
      } else {
        if (!selectedTrack) return;
        const tags: AudioTags = {
          title,
          artist,
          albumArtist,
          album,
          genre,
          year: num(year),
          trackNumber: num(trackNumber),
          totalTracks: num(totalTracks),
          discNumber: num(discNumber),
          totalDiscs: num(totalDiscs),
          composer,
          comment,
          lyrics,
          bpm: num(bpm),
          copyright,
          publisher,
          isrc,
          coverArt,
        };
        await updateTrackMetadata(selectedTrack.absolutePath, tags);
        setSaveMessage(t.metadata.saveSuccess);
      }
      setTimeout(() => setSaveMessage(null), 2000);
    } catch {
      setSaveMessage(t.metadata.saveError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (isMultiMode) {
      syncMultiForm(selectedTracks);
    } else if (selectedTrack) {
      syncForm(selectedTrack);
    }
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
          touch("coverArt");
        }
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleCoverRemove = () => {
    setCoverArt("");
    touch("coverArt");
  };

  /** Placeholder for mixed values (not yet touched) */
  const ph = (field: string) =>
    isMultiMode && mixedFields.has(field) && !touchedFields.has(field)
      ? t.metadata.multipleValues
      : undefined;

  /** Extra CSS class for touched fields in multi-mode */
  const mod = (field: string) =>
    isMultiMode && touchedFields.has(field) ? " metadata-input-touched" : "";

  return (
    <div className="metadata-editor">
      <div className="metadata-header">
        <Music size={14} />
        <span>
          {isMultiMode
            ? t.metadata.multiSelectHeader(selectedTracks.length)
            : t.metadata.header}
        </span>
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
              <span>
                {isMultiMode && mixedFields.has("coverArt") && !touchedFields.has("coverArt")
                  ? t.metadata.multipleValues
                  : t.metadata.coverArtSelect}
              </span>
            </div>
          )}
          <div className="metadata-cover-actions">
            <button className={`metadata-cover-btn${mod("coverArt")}`} onClick={handleCoverSelect} title={t.metadata.coverArtSelect}>
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
              className={`metadata-input${mod("title")}`}
              type="text"
              value={title}
              placeholder={ph("title")}
              onChange={(e) => { setTitle(e.target.value); touch("title"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.artist}</span>
            <input
              className={`metadata-input${mod("artist")}`}
              type="text"
              value={artist}
              placeholder={ph("artist")}
              onChange={(e) => { setArtist(e.target.value); touch("artist"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.albumArtist}</span>
            <input
              className={`metadata-input${mod("albumArtist")}`}
              type="text"
              value={albumArtist}
              placeholder={ph("albumArtist")}
              onChange={(e) => { setAlbumArtist(e.target.value); touch("albumArtist"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.album}</span>
            <input
              className={`metadata-input${mod("album")}`}
              type="text"
              value={album}
              placeholder={ph("album")}
              onChange={(e) => { setAlbum(e.target.value); touch("album"); }}
            />
          </label>

          <div className="metadata-row">
            <label className="metadata-label metadata-label-half">
              <span>{t.metadata.genre}</span>
              <input
                className={`metadata-input${mod("genre")}`}
                type="text"
                value={genre}
                placeholder={ph("genre")}
                onChange={(e) => { setGenre(e.target.value); touch("genre"); }}
              />
            </label>
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.year}</span>
              <input
                className={`metadata-input${mod("year")}`}
                type="text"
                value={year}
                placeholder={ph("year")}
                onChange={(e) => { setYear(e.target.value.replace(/\D/g, "")); touch("year"); }}
                maxLength={4}
              />
            </label>
          </div>

          <div className="metadata-row">
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.trackNumber}</span>
              <input
                className={`metadata-input${mod("trackNumber")}`}
                type="text"
                value={trackNumber}
                placeholder={ph("trackNumber")}
                onChange={(e) => { setTrackNumber(e.target.value.replace(/\D/g, "")); touch("trackNumber"); }}
                maxLength={4}
              />
            </label>
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.totalTracks}</span>
              <input
                className={`metadata-input${mod("totalTracks")}`}
                type="text"
                value={totalTracks}
                placeholder={ph("totalTracks")}
                onChange={(e) => { setTotalTracks(e.target.value.replace(/\D/g, "")); touch("totalTracks"); }}
                maxLength={4}
              />
            </label>
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.discNumber}</span>
              <input
                className={`metadata-input${mod("discNumber")}`}
                type="text"
                value={discNumber}
                placeholder={ph("discNumber")}
                onChange={(e) => { setDiscNumber(e.target.value.replace(/\D/g, "")); touch("discNumber"); }}
                maxLength={4}
              />
            </label>
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.totalDiscs}</span>
              <input
                className={`metadata-input${mod("totalDiscs")}`}
                type="text"
                value={totalDiscs}
                placeholder={ph("totalDiscs")}
                onChange={(e) => { setTotalDiscs(e.target.value.replace(/\D/g, "")); touch("totalDiscs"); }}
                maxLength={4}
              />
            </label>
          </div>

          <label className="metadata-label">
            <span>{t.metadata.composer}</span>
            <input
              className={`metadata-input${mod("composer")}`}
              type="text"
              value={composer}
              placeholder={ph("composer")}
              onChange={(e) => { setComposer(e.target.value); touch("composer"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.comment}</span>
            <input
              className={`metadata-input${mod("comment")}`}
              type="text"
              value={comment}
              placeholder={ph("comment")}
              onChange={(e) => { setComment(e.target.value); touch("comment"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.lyrics}</span>
            <textarea
              className={`metadata-input metadata-textarea${mod("lyrics")}`}
              value={lyrics}
              placeholder={ph("lyrics")}
              onChange={(e) => { setLyrics(e.target.value); touch("lyrics"); }}
              rows={4}
            />
          </label>

          <div className="metadata-row">
            <label className="metadata-label metadata-label-quarter">
              <span>{t.metadata.bpm}</span>
              <input
                className={`metadata-input${mod("bpm")}`}
                type="text"
                value={bpm}
                placeholder={ph("bpm")}
                onChange={(e) => { setBpm(e.target.value.replace(/\D/g, "")); touch("bpm"); }}
                maxLength={4}
              />
            </label>
            <label className="metadata-label metadata-label-threequarter">
              <span>{t.metadata.isrc}</span>
              <input
                className={`metadata-input${mod("isrc")}`}
                type="text"
                value={isrc}
                placeholder={ph("isrc")}
                onChange={(e) => { setIsrc(e.target.value); touch("isrc"); }}
                maxLength={12}
              />
            </label>
          </div>

          <label className="metadata-label">
            <span>{t.metadata.copyright}</span>
            <input
              className={`metadata-input${mod("copyright")}`}
              type="text"
              value={copyright}
              placeholder={ph("copyright")}
              onChange={(e) => { setCopyright(e.target.value); touch("copyright"); }}
            />
          </label>

          <label className="metadata-label">
            <span>{t.metadata.publisher}</span>
            <input
              className={`metadata-input${mod("publisher")}`}
              type="text"
              value={publisher}
              placeholder={ph("publisher")}
              onChange={(e) => { setPublisher(e.target.value); touch("publisher"); }}
            />
          </label>
        </div>

        {/* File info: single mode only */}
        {!isMultiMode && selectedTrack && (
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
        )}

        {/* Multi-mode: changed fields hint */}
        {isMultiMode && touchedFields.size > 0 && (
          <div className="metadata-multi-hint">
            {touchedFields.size === 1
              ? `1項目を変更済み — ${selectedTracks.length}曲に保存されます`
              : `${touchedFields.size}項目を変更済み — ${selectedTracks.length}曲に保存されます`}
          </div>
        )}
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
