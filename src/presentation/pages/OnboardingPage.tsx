import { useLochordStore } from "../../application/store/useLochordStore";
import { FolderOpen, Music } from "lucide-react";

export function OnboardingPage() {
  const selectMusicRoot = useLochordStore((s) => s.selectMusicRoot);

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-logo">
          <Music size={48} />
        </div>
        <h1 className="onboarding-title">Lochord</h1>
        <p className="onboarding-desc">
          ローカル音楽ライブラリの M3U8 プレイリストマネージャー
        </p>
        <p className="onboarding-hint">
          まず音楽フォルダを選択してください。
          <br />
          選択したフォルダ内の <code>Playlists/</code> にプレイリストが保存されます。
        </p>
        <button className="onboarding-btn" onClick={selectMusicRoot}>
          <FolderOpen size={18} />
          音楽フォルダを選択
        </button>
      </div>
    </div>
  );
}
