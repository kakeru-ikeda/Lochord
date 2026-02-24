import { useLochordStore } from "../../application/store/useLochordStore";
import { useTranslation } from "../hooks/useTranslation";
import { FolderOpen, Music } from "lucide-react";

export function OnboardingPage() {
  const selectMusicRoot = useLochordStore((s) => s.selectMusicRoot);
  const t = useTranslation();

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        <div className="onboarding-logo">
          <Music size={48} />
        </div>
        <h1 className="onboarding-title">Lochord</h1>
        <p className="onboarding-desc">
          {t.onboarding.description}
        </p>
        <p className="onboarding-hint">
          {t.onboarding.hint1}
          <br />
          {t.onboarding.hint2}
        </p>
        <button className="onboarding-btn" onClick={selectMusicRoot}>
          <FolderOpen size={18} />
          {t.onboarding.openFolder}
        </button>
      </div>
    </div>
  );
}
