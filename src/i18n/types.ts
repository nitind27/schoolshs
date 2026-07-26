export type Locale = "en" | "gu";

/** Gujarati first — default language for the school ERP */
export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
  { code: "en", label: "English", nativeLabel: "English" },
];

/** App default language when user has not explicitly chosen one */
export const DEFAULT_LOCALE: Locale = "gu";

/** Bumped so old English defaults are cleared */
export const LOCALE_STORAGE_KEY = "shs_locale_v3";

/** Set when user picks a language in the switcher (keeps their choice) */
export const LOCALE_EXPLICIT_KEY = "shs_locale_explicit";

/** Legacy keys that previously defaulted to English */
export const LEGACY_LOCALE_KEYS = ["shs_locale", "shs_locale_v2"] as const;
