import { isGujaratiScript } from "@/lib/gujarati/gujarati-script";
import { getGujaratiSuggestions } from "@/lib/gujarati/gujarati-suggestions";
import { lookupCommonNameGu } from "@/lib/gujarati/common-name-gu";
import {
  gujaratiHonorific,
  normalizeNamePartEn,
  normalizeNamePartGu,
  splitEnglishHonorific,
} from "@/lib/student-name-normalize";

const LATIN_RE = /[A-Za-z]/;

function isPureGujarati(value: string): boolean {
  const gu = value.trim();
  if (!gu) return false;
  if (!isGujaratiScript(gu)) return false;
  if (LATIN_RE.test(gu)) return false;
  return true;
}

/** Prefer long-i (ી) when English stem ends with i/ee/y (Anjali, Priya, …). */
function preferLongI(stemEn: string, gu: string): string {
  if (!/[iy]$/i.test(stemEn.trim()) && !/ee$/i.test(stemEn.trim())) return gu;
  if (gu.endsWith("\u0ABF")) return `${gu.slice(0, -1)}\u0AC0`; // િ → ી
  return gu;
}

/** Server-side English → Gujarati via Google Translate (general text). */
export async function translateEnglishToGujarati(text: string): Promise<string> {
  const raw = text.trim();
  if (!raw) return "";

  const q = encodeURIComponent(raw);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=gu&dt=t&q=${q}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ScholarshipPortal/1.0)" },
      next: { revalidate: 0 },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return "";

    const data: unknown = await res.json();
    const translated = (data as [Array<[string]> | null])?.[0]?.[0]?.[0];
    return typeof translated === "string" ? translated.trim() : "";
  } catch {
    return "";
  }
}

function localBest(stem: string): string {
  const lower = stem.trim().toLowerCase();
  if (!lower) return "";
  try {
    const sug = getGujaratiSuggestions(lower, 5);
    for (const item of sug) {
      if (isPureGujarati(item.gujarati)) return preferLongI(stem, item.gujarati);
    }
  } catch {
    /* ignore */
  }
  return "";
}

function resolveStemGu(stem: string): string {
  const dict = lookupCommonNameGu(stem);
  if (dict) return dict;
  return localBest(stem);
}

function glueHonorific(gu: string, honor: string): string {
  if (!honor) return gu;
  if (gu.endsWith(honor)) return gu;
  const parts = gu.split(/\s+/).filter(Boolean);
  if (!parts.length) return honor;
  // Glue onto last token only — keep spaces between real name parts
  parts[parts.length - 1] = parts[parts.length - 1] + honor;
  return parts.join(" ");
}

/**
 * Person-name English → Gujarati (transliteration, NOT meaning).
 * Dictionary → local phonetic engine. Google is skipped for names because it
 * often returns meanings (Lucky→નસીબદાર, Prince→રાજ).
 * Honorifics glued with NO space: Anjali Ben → અંજલીબેન.
 */
export async function translateEnglishNameParts(text: string): Promise<string> {
  const normalized = normalizeNamePartEn(text);
  if (!normalized) return "";

  // Whole-field dictionary hit (e.g. Savitaben, AnjaliBen)
  const whole = lookupCommonNameGu(normalized);
  if (whole) return normalizeNamePartGu(whole);

  const { stem, suffix } = splitEnglishHonorific(normalized);
  const stemForTranslate = stem || normalized;

  let gu = "";
  if (stemForTranslate.includes(" ")) {
    const parts = stemForTranslate.split(/\s+/).map((w) => resolveStemGu(w));
    // Keep whatever we can resolve; blank parts stay as local/dict miss
    if (parts.some(Boolean)) {
      gu = stemForTranslate
        .split(/\s+/)
        .map((w, i) => parts[i] || resolveStemGu(w) || w)
        .filter((p) => isPureGujarati(p))
        .join(" ");
      // If some tokens failed, rebuild word-by-word forcing local
      if (!gu || gu.split(/\s+/).length !== stemForTranslate.split(/\s+/).length) {
        gu = stemForTranslate
          .split(/\s+/)
          .map((w) => resolveStemGu(w))
          .filter(Boolean)
          .join(" ");
      }
    }
  } else {
    gu = resolveStemGu(stemForTranslate);
  }

  if (!gu || !isPureGujarati(gu.replace(/\s+/g, ""))) return "";

  const honor = gujaratiHonorific(suffix);
  return normalizeNamePartGu(glueHonorific(gu, honor));
}
