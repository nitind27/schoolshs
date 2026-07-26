"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { messages } from "./messages";
import { createTranslator } from "./translate";
import {
  DEFAULT_LOCALE,
  LEGACY_LOCALE_KEYS,
  LOCALE_EXPLICIT_KEY,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./types";

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function clearLegacyLocaleKeys() {
  for (const key of LEGACY_LOCALE_KEYS) {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

function readStoredLocale(): Locale {
  if (typeof window === "undefined") return DEFAULT_LOCALE;
  clearLegacyLocaleKeys();

  const explicit = localStorage.getItem(LOCALE_EXPLICIT_KEY) === "1";
  const stored = localStorage.getItem(LOCALE_STORAGE_KEY);

  // Only keep English/Gujarati if the user explicitly chose it in the language switcher
  if (explicit && (stored === "en" || stored === "gu")) return stored;

  // Force Gujarati for everyone else (including old silent English defaults)
  localStorage.setItem(LOCALE_STORAGE_KEY, DEFAULT_LOCALE);
  return DEFAULT_LOCALE;
}

function applyDocumentLocale(locale: Locale) {
  document.documentElement.lang = locale === "gu" ? "gu" : "en";
  document.documentElement.classList.toggle("locale-gu", locale === "gu");
  document.documentElement.classList.toggle("locale-en", locale !== "gu");
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const next = readStoredLocale();
    setLocaleState(next);
    applyDocumentLocale(next);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyDocumentLocale(locale);
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale, mounted]);

  const setLocale = useCallback((next: Locale) => {
    try {
      localStorage.setItem(LOCALE_EXPLICIT_KEY, "1");
      localStorage.setItem(LOCALE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    setLocaleState(next);
  }, []);

  const t = useMemo(() => createTranslator(messages[locale]), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}

export function useT() {
  return useLocale().t;
}
