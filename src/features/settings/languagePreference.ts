export const UI_LANGUAGE_OPTIONS = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "uz", label: "Uzbek", flag: "🇺🇿" },
  { code: "ru", label: "Russian", flag: "🇷🇺" },
  { code: "zh", label: "Chinese", flag: "🇨🇳" },
] as const;

export type UiLanguageCode = (typeof UI_LANGUAGE_OPTIONS)[number]["code"];

const STORAGE_KEY = "eduhub_ui_language";

export const UI_LANGUAGE_CHANGED_EVENT = "eduhub-ui-language-changed";

function isUiLanguageCode(value: string): value is UiLanguageCode {
  return UI_LANGUAGE_OPTIONS.some((option) => option.code === value);
}

export function getUiLanguage(): UiLanguageCode {
  if (typeof window === "undefined") return "en";
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && isUiLanguageCode(stored) ? stored : "en";
}

export function setUiLanguage(code: UiLanguageCode): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, code);
  document.documentElement.lang = code;
  window.dispatchEvent(new CustomEvent(UI_LANGUAGE_CHANGED_EVENT, { detail: { code } }));
  void import("@/i18n").then(({ default: i18n }) => {
    void i18n.changeLanguage(code);
  });
}

export function applyStoredUiLanguage(): void {
  if (typeof document === "undefined") return;
  document.documentElement.lang = getUiLanguage();
}

export function uiLanguageOption(code: UiLanguageCode) {
  return UI_LANGUAGE_OPTIONS.find((option) => option.code === code) ?? UI_LANGUAGE_OPTIONS[0];
}
