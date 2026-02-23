import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useSettingsStore } from "../../../application/store/useSettingsStore";
import {
  AppSettings,
  PathMode,
  SaveExtension,
  ColorTheme,
} from "../../../domain/entities/AppSettings";
import { X, RotateCcw, FolderOpen } from "lucide-react";

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TabKey = "playlist" | "scan" | "display";

const PATH_MODE_OPTIONS: { value: PathMode; label: string; desc: string }[] = [
  { value: "relative", label: "相対パス", desc: "プレイリストファイルからの相対パス（推奨）" },
  { value: "absolute", label: "絶対パス", desc: "OSのフルパス" },
  { value: "relative-from-root", label: "ルートからの相対", desc: "ミュージックルートからの相対パス" },
];

const FORMAT_OPTIONS: { value: SaveExtension; label: string; desc: string }[] = [
  { value: "m3u8", label: "M3U8", desc: "UTF-8 拡張M3Uプレイリスト" },
  { value: "m3u", label: "M3U", desc: "拡張M3Uプレイリスト" },
  { value: "txt", label: "TXT", desc: "パスのみのテキスト" },
  { value: "csv", label: "CSV", desc: "カンマ区切り（スプレッドシート向け）" },
];

const THEME_OPTIONS: { value: ColorTheme; label: string }[] = [
  { value: "system", label: "システム設定に従う" },
  { value: "dark", label: "ダーク" },
  { value: "light", label: "ライト" },
];

const DEFAULT_EXTENSIONS = ["flac", "mp3", "aac", "wav", "m4a", "ogg", "opus"];

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings = useSettingsStore((s) => s.settings);
  const updateSettings = useSettingsStore((s) => s.updateSettings);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

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
    { key: "playlist", label: "プレイリスト" },
    { key: "scan", label: "スキャン" },
    { key: "display", label: "表示" },
  ];

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <span className="settings-modal-title">⚙ 設定</span>
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
                  <label className="settings-label">パス形式</label>
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
                  <label className="settings-label">保存先ディレクトリ</label>
                  <div className="settings-dir-row">
                    <input
                      type="text"
                      className="settings-input"
                      value={draft.playlistDir ?? ""}
                      placeholder="デフォルト: {ミュージックルート}/Playlists/"
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
                      デフォルトにリセット
                    </button>
                  )}
                </div>

                {/* Save format */}
                <div className="settings-group">
                  <label className="settings-label">保存形式</label>
                  <select
                    className="settings-select"
                    value={draft.saveExtension}
                    onChange={(e) =>
                      updateDraft({ saveExtension: e.target.value as SaveExtension })
                    }
                  >
                    {FORMAT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} — {opt.desc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto save */}
                <div className="settings-group">
                  <label className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={draft.autoSave}
                      onChange={(e) => updateDraft({ autoSave: e.target.checked })}
                    />
                    トラック変更後に自動保存
                  </label>
                </div>
              </div>
            )}

            {activeTab === "scan" && (
              <div className="settings-section">
                {/* Scan extensions */}
                <div className="settings-group">
                  <label className="settings-label">スキャン対象の拡張子</label>
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
                      placeholder="拡張子を追加..."
                    />
                    <button className="settings-add-btn" onClick={addExtension}>
                      追加
                    </button>
                  </div>
                  <button
                    className="settings-link-btn"
                    onClick={() => updateDraft({ scanExtensions: [...DEFAULT_EXTENSIONS] })}
                  >
                    デフォルトにリセット
                  </button>
                </div>

                {/* Exclude patterns */}
                <div className="settings-group">
                  <label className="settings-label">除外パターン（ディレクトリ名）</label>
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
                      <span className="settings-hint">なし</span>
                    )}
                  </div>
                  <div className="settings-inline-add">
                    <input
                      className="settings-input-small"
                      value={newExclude}
                      onChange={(e) => setNewExclude(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addExclude()}
                      placeholder="除外名を追加..."
                    />
                    <button className="settings-add-btn" onClick={addExclude}>
                      追加
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "display" && (
              <div className="settings-section">
                {/* Theme */}
                <div className="settings-group">
                  <label className="settings-label">テーマ</label>
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
                  <label className="settings-label">言語</label>
                  <select
                    className="settings-select"
                    value={draft.language}
                    onChange={(e) =>
                      updateDraft({ language: e.target.value as "ja" | "en" })
                    }
                  >
                    <option value="ja">日本語</option>
                    <option value="en">English</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="settings-modal-footer">
          <button className="settings-reset-btn" onClick={handleReset} title="すべてデフォルトに戻す">
            <RotateCcw size={14} /> リセット
          </button>
          <div className="settings-footer-actions">
            <button className="settings-cancel-btn" onClick={onClose}>
              キャンセル
            </button>
            <button className="settings-save-btn" onClick={handleSave}>
              設定を保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
