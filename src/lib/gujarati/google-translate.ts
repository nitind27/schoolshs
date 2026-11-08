import { isGujaratiScript } from "@/lib/gujarati/gujarati-script";
import { getGujaratiSuggestions, transliterateLatinFull } from "@/lib/gujarati/gujarati-suggestions";
import { spellNarrationTokens } from "@/lib/gujarati/narration-spell";
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

function readTranslateChunks(data: unknown): string {
  const chunks = (data as [Array<[string]> | null] | null)?.[0];
  if (!Array.isArray(chunks)) return "";
  return chunks
    .map((part) => (typeof part?.[0] === "string" ? part[0] : ""))
    .join("")
    .trim();
}

function readAnyTranslate(data: unknown): string {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return "";
  if (typeof data[0][0] === "string") {
    return data
      .map((part) => (Array.isArray(part) && typeof part[0] === "string" ? part[0] : ""))
      .join("")
      .trim();
  }
  return readTranslateChunks(data);
}

async function fetchTranslate(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ScholarshipPortal/1.0)" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return "";
  return readAnyTranslate(await res.json());
}

const ENGLISH_WORDS = new Set([
  "the", "a", "an", "and", "or", "from", "for", "to", "of", "in", "on", "by", "with",
  "paid", "pay", "payment", "received", "receive", "cash", "fee", "fees", "bill",
  "student", "salary", "expense", "school", "amount", "rupees",
]);

function sameText(a: string, b: string): boolean {
  return a.trim().toLowerCase().replace(/\s+/g, " ") === b.trim().toLowerCase().replace(/\s+/g, " ");
}

function englishWordCount(text: string): number {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((word) => ENGLISH_WORDS.has(word)).length;
}

/** English letters typed as Gujarati (safai kharch…) → Gujarati script. */
async function transliteratePhoneticGujarati(text: string): Promise<string> {
  const url =
    "https://inputtools.google.com/request?text=" +
    encodeURIComponent(text) +
    "&itc=gu-t-i0-und&num=1&cp=0&cs=1&ie=utf-8&oe=utf-8";
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ScholarshipPortal/1.0)" },
    next: { revalidate: 0 },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return "";
  const data = (await res.json()) as [string, Array<[string, string[]]>];
  const candidate = data?.[1]?.[0]?.[1]?.[0];
  return typeof candidate === "string" ? candidate.trim() : "";
}

/**
 * Known school words win even when the spelling is slightly wrong
 * (saphai, kharcha, chukavyu). Unknown words stay with phonetic conversion.
 */
async function phoneticNarration(raw: string): Promise<string> {
  const tokens = spellNarrationTokens(raw);
  if (!tokens.length) return "";
  if (tokens.every((token) => token.gujarati)) {
    return tokens.map((token) => token.gujarati as string).join(" ");
  }

  let typedWords: string[] = [];
  try {
    const typed = await transliteratePhoneticGujarati(raw);
    if (typed) typedWords = typed.split(/\s+/).filter(Boolean);
  } catch {
    /* fill unknown words below */
  }

  const aligned = typedWords.length === tokens.length;
  const parts = await Promise.all(
    tokens.map(async (token, index) => {
      if (token.gujarati) return token.gujarati;
      const fromSentence = aligned ? typedWords[index] : "";
      if (fromSentence && !sameText(fromSentence, token.raw)) return fromSentence;
      try {
        const one = await transliteratePhoneticGujarati(token.raw);
        const first = one.split(/\s+/).filter(Boolean)[0] || "";
        if (first && !sameText(first, token.raw)) return first;
      } catch {
        /* local fallback */
      }
      const local = transliterateLatinFull(token.raw).trim();
      return local && !sameText(local, token.raw) ? local : token.raw;
    }),
  );
  const out = parts.join(" ").trim();
  return out && !sameText(out, raw) ? out : "";
}

async function translateMeaningToGujarati(raw: string): Promise<string> {
  const q = encodeURIComponent(raw);
  const attempts = [
    `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=gu&q=${q}`,
    `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=gu&dt=t&q=${q}`,
  ];
  for (const url of attempts) {
    try {
      const out = await fetchTranslate(url);
      if (out && !sameText(out, raw)) return out;
    } catch {
      /* next source */
    }
  }
  try {
    const hasHindi = /[\u0900-\u097F]/.test(raw);
    const pair = hasHindi ? "hi|gu" : "en|gu";
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw.slice(0, 500))}&langpair=${pair}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return "";
    const data = (await res.json()) as { responseData?: { translatedText?: string } };
    const out = data.responseData?.translatedText?.trim() || "";
    if (!out || /MYMEMORY WARNING/i.test(out) || sameText(out, raw)) return "";
    return out;
  } catch {
    return "";
  }
}

/**
 * Puts narration into Gujarati script.
 * Phonetic typing (safai kharch na rokada chukavya) becomes ગુજરાતી અક્ષર.
 * English or Hindi sentences are translated by meaning.
 */
export async function translateTextToGujarati(text: string): Promise<string> {
  const raw = text.trim().slice(0, 1000);
  if (!raw) return "";

  const hindi = /[\u0900-\u097F]/.test(raw);
  const tokens = spellNarrationTokens(raw);
  const knownSchoolWords = tokens.filter((token) => {
    if (!token.gujarati) return false;
    return token.raw.toLowerCase().replace(/[^a-z]/g, "").length >= 4;
  }).length;
  const schoolLine = knownSchoolWords >= 2 && knownSchoolWords * 2 >= tokens.length;
  const englishSentence = englishWordCount(raw) >= 2 && !schoolLine;
  const phoneticFirst = !hindi && /[A-Za-z]/.test(raw) && (schoolLine || !englishSentence);

  const phonetic = () => phoneticNarration(raw);

  if (phoneticFirst) {
    const typed = await phonetic();
    if (typed) return typed;
    return translateMeaningToGujarati(raw);
  }

  const meaning = await translateMeaningToGujarati(raw);
  if (meaning) return meaning;
  if (/[A-Za-z]/.test(raw)) return phonetic();
  return "";
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

    return readTranslateChunks(await res.json());
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
