"use client";

import { useEffect } from "react";
import { THEME_STORAGE_KEY, isThemeId } from "@/lib/themes";

export function applySchoolTheme(themeId: string) {
  if (!isThemeId(themeId)) return;
  document.documentElement.dataset.theme = themeId;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
  } catch {
    /* ignore */
  }
}

/** Loads the school template and paints it before the next navigation. */
export function SchoolThemeProvider() {
  useEffect(() => {
    let cancelled = false;
    fetch("/api/school/theme")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.themeId) return;
        applySchoolTheme(String(data.themeId));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
