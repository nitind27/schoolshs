export type Locale = "en" | "gu";

export const LOCALES: { code: Locale; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "gu", label: "Gujarati", nativeLabel: "ગુજરાતી" },
];

export const LOCALE_STORAGE_KEY = "shs_locale";
