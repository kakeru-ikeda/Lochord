import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../../../application/store/useSettingsStore";
import {
  AppSettings,
  PathMode,
  ColorTheme,
  Language,
} from "../../../domain/entities/AppSettings";
import { useTranslation } from "../../hooks/useTranslation";
import { X, RotateCcw, FolderOpen } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabKey = "playlist" | "scan" | "display";

const DEFAULT_EXTENSIONS = ["flac", "mp3", "aac", "wav", "m4a", "ogg", "opus"];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const t = useTranslation();

  // path mode options derived from translations
  const PATH_MODE_OPTIONS: { value: PathMode; label: string; desc: string }[] = [
    { value: "relative", ...t.settings.playlist.pathModes.relative },
    { value: "absolute", ...t.settings.playlist.pathModes.absolute },
    { value: "relative-from-root", ...t.settings.playlist.pathModes.relativeFromRoot },
  ];

  // theme options derived from translations
  const THEME_OPTIONS: { value: ColorTheme; label: string }[] = [
    { value: "system", label: t.settings.display.themes.system },
    { value: "dark",   label: t.settings.display.themes.dark },
    { value: "light",  label: t.settings.display.themes.light },
  ];

  // Local draft state for editing
  const [draft, setDraft] = useState<AppSettings>({ ...settings });
  const [activeTab, setActiveTab] = useState<TabKey>("playlist");
  const [newExtension, setNewExtension] = useState("");
  const [newExclude, setNewExclude] = useState("");

  // Sync draft when opening
  useEffect(() => {
    if (open) {
      setDraft({ ...settings });
    }
  }, [open, settings]);

  if (!open) return null;

  const updateDraft = (patch: Partial<AppSettings>) => {
    setDraft((d) => ({ ...d, ...patch }));
  };

  const handleSave = () => {
    updateSettings(draft);
    onClose();
  };

  const handleReset = () => {
    resetSettings();
    setDraft({ ...useSettingsStore.getState().settings });
  };

  const handleBrowseDir = async () => {
    try {
      const selected = await invoke<string | null>("select_directory");
      if (selected) {
        updateDraft({ playlistDir: selected });
      }
    } catch (e) {
      console.error("Failed to select directory:", e);
    }
  };

  const addExtension = () => {
    const ext = newExtension.trim().toLowerCase().replace(/^\./, "");
    if (ext && !draft.scanExtensions.includes(ext)) {
      updateDraft({ scanExtensions: [...draft.scanExtensions, ext] });
    }
    setNewExtension("");
  };

  const removeExtension = (ext: string) => {
    updateDraft({ scanExtensions: draft.scanExtensions.filter((e) => e !== ext) });
  };

  const addExclude = () => {
    const pat = newExclude.trim();
    if (pat && !draft.excludePatterns.includes(pat)) {
      updateDraft({ excludePatterns: [...draft.excludePatterns, pat] });
    }
    setNewExclude("");
  };

  const removeExclude = (pat: string) => {
    updateDraft({ excludePatterns: draft.excludePatterns.filter((p) => p !== pat) });
  };

  const tabs: { key: TabKey; label: string }[] = [
    { key: "playlist", label: t.settings.tabs.playlist },
    { key: "scan",     label: t.settings.tabs.scan },
    { key: "display",  label: t.settings.tabs.display },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <span className="settings-modal-title">{t.settings.title}</span>
          <button className="settings-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-modal-body">
          {/* Tab bar */}
          <div className="settings-tabs">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={`settings-tab ${activeTab === t.key ? "active" : ""}`}
                onClick={() => setActiveTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="settings-content">
            {activeTab === "playlist" && (
              <div className="settings-section">
                {/* Path mode */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.playlist.pathModeLabel}</label>
                  {PATH_MODE_OPTIONS.map((opt) => (
                    <label key={opt.value} className="settings-radio">
                      <input
                        type="radio"
                        name="pathMode"
                        checked={draft.pathMode === opt.value}
                        onChange={() => updateDraft({ pathMode: opt.value })}
                      />
                      <span className="settings-radio-label">
                        {opt.label}
                        <span className="settings-radio-desc">{opt.desc}</span>
                      </span>
                    </label>
                  ))}
                </div>

                {/* Playlist directory */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.playlist.dirLabel}</label>
                  <div className="settings-dir-row">
                    <input
                      type="text"
                      className="settings-input"
                      value={draft.playlistDir ?? ""}
                      placeholder={t.settings.playlist.dirPlaceholder}
                      onChange={(e) =>
                        updateDraft({ playlistDir: e.target.value || null })
                      }
                    />
                    <button className="settings-browse-btn" onClick={handleBrowseDir}>
                      <FolderOpen size={14} />
                    </button>
                  </div>
                  {draft.playlistDir && (
                    <button
                      className="settings-link-btn"
                      onClick={() => updateDraft({ playlistDir: null })}
                    >
                      {t.settings.playlist.dirReset}
                    </button>
                  )}
                </div>


                {/* Auto save */}
                <div className="settings-group">
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.autoSave}
                      onChange={(e) => updateDraft({ autoSave: e.target.checked })}
                    />
                    {t.settings.playlist.autoSaveCheckbox}
                  </label>
                </div>
              </div>
            )}

            {activeTab === "scan" && (
              <div className="settings-section">
                {/* Scan extensions */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.scan.extensionsLabel}</label>
                  <div className="settings-tag-list">
                    {draft.scanExtensions.map((ext) => (
                      <span key={ext} className="settings-tag">
                        .{ext}
                        <button
                          className="settings-tag-remove"
                          onClick={() => removeExtension(ext)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="settings-inline-add">
                    <input
                      className="settings-input-small"
                      value={newExtension}
                      onChange={(e) => setNewExtension(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExtension()}
                      placeholder={t.settings.scan.extensionAddPlaceholder}
                    />
                    <button className="settings-add-btn" onClick={addExtension}>
                      {t.settings.scan.addButton}
                    </button>
                  </div>
                  <button
                    className="settings-link-btn"
                    onClick={() => updateDraft({ scanExtensions: [...DEFAULT_EXTENSIONS] })}
                  >
                    {t.settings.scan.extensionsReset}
                  </button>
                </div>

                {/* Exclude patterns */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.scan.excludeLabel}</label>
                  <div className="settings-tag-list">
                    {draft.excludePatterns.map((pat) => (
                      <span key={pat} className="settings-tag">
                        {pat}
                        <button
                          className="settings-tag-remove"
                          onClick={() => removeExclude(pat)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    {draft.excludePatterns.length === 0 && (
                      <span className="settings-hint">{t.settings.scan.excludeNone}</span>
                    )}
                  </div>
                  <div className="settings-inline-add">
                    <input
                      className="settings-input-small"
                      value={newExclude}
                      onChange={(e) => setNewExclude(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExclude()}
                      placeholder={t.settings.scan.excludeAddPlaceholder}
                    />
                    <button className="settings-add-btn" onClick={addExclude}>
                      {t.settings.scan.addButton}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "display" && (
              <div className="settings-section">
                {/* Theme */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.display.themeLabel}</label>
                  {THEME_OPTIONS.map((opt) => (
                    <label key={opt.value} className="settings-radio">
                      <input
                        type="radio"
                        name="theme"
                        checked={draft.colorTheme === opt.value}
                        onChange={() => updateDraft({ colorTheme: opt.value })}
                      />
                      <span className="settings-radio-label">{opt.label}</span>
                    </label>
                  ))}
                </div>

                {/* Language */}
                <div className="settings-group">
                  <label className="settings-label">{t.settings.display.languageLabel}</label>
                  <select
                    className="settings-select"
                    value={draft.language}
                    onChange={(e) =>
                      updateDraft({ language: e.target.value as Language })
                    }
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                    <option value="ko">한국어</option>
                    <option value="zh">中文（简体）</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <button className="settings-reset-btn" onClick={handleReset} title="Reset all to defaults">
            <RotateCcw size={14} /> {t.settings.footer.reset}
          </button>
          <div className="settings-footer-actions">
            <button className="settings-cancel-btn" onClick={onClose}>
              {t.settings.footer.cancel}
            </button>
            <button className="settings-save-btn" onClick={handleSave}>
              {t.settings.footer.save}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
