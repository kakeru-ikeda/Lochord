import { useSettingsStore } from "../../application/store/useSettingsStore";
import { getTranslations } from "../../domain/i18n";
import type { Translations } from "../../domain/i18n";

/**
 * language 設定を監視し、対応する翻訳辞書を返す。
 * コンポーネント内で `const t = useTranslation()` として使う。
 */
export function useTranslation(): Translations {
  const language = useSettingsStore((s) => s.settings.language);
  return getTranslations(language);
}
