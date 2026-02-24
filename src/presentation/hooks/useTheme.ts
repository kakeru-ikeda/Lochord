import { useEffect } from "react";
import { useSettingsStore } from "../../application/store/useSettingsStore";

/**
 * colorTheme 設定を監視し、<html> の data-theme 属性を更新するフック。
 * - "dark"   → data-theme="dark"
 * - "light"  → data-theme="light"
 * - "system" → OS の prefers-color-scheme に追従
 */
export function useTheme() {
  const colorTheme = useSettingsStore((s) => s.settings.colorTheme);

  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (isDark: boolean) => {
      root.dataset.theme = isDark ? "dark" : "light";
    };

    if (colorTheme === "dark") {
      applyTheme(true);
      return;
    }

    if (colorTheme === "light") {
      applyTheme(false);
      return;
    }

    // system: media query に追従
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    applyTheme(mq.matches);

    const listener = (e: MediaQueryListEvent) => applyTheme(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, [colorTheme]);
}
