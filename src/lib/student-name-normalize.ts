/**
 * Normalize person-name parts so honorific suffixes stick to the stem
 * without a space: "Anjali Ben" → "AnjaliBen", "રાહુલ કુમાર" → "રાહુલકુમાર".
 */

const EN_SUFFIXES = [
  "kumari",
  "kumaari",
  "kumri",
  "kumar",
  "kumaar",
  "behn",
  "ben",
  "bhai",
  "bai",
  "devi",
] as const;

/** Gujarati honorifics — longest first */
const GU_SUFFIXES = [
  "કુમારી",
  "કુમાર",
  "કુમરી",
  "ભાઈ",
  "બેન",
  "બૈન",
  "બાઈ",
  "દેવી",
] as const;

const EN_SUFFIX_SET = new Set(EN_SUFFIXES.map((s) => s.toLowerCase()));

function collapseSpaces(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function titleCaseToken(word: string): string {
  if (!word) return "";
  if (/^[\u0A80-\u0AFF]+$/.test(word)) return word;
  // Keep already-joined CamelCase-ish tokens
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)+$/.test(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Join trailing English honorific onto previous token (no space). */
export function normalizeNamePartEn(value: string | null | undefined): string {
  const raw = collapseSpaces(String(value ?? ""));
  if (!raw) return "";

  const tokens = raw.split(" ").filter(Boolean);
  if (tokens.length === 1) {
    // AnjaliBen already glued, or bare Anjali — title-case stem if needed
    const compound = splitEnStemSuffix(tokens[0]);
    if (compound) {
      return titleCaseToken(compound.stem) + titleCaseToken(compound.suffix);
    }
    return titleCaseToken(tokens[0]);
  }

  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const lower = tok.toLowerCase();
    if (EN_SUFFIX_SET.has(lower) && out.length > 0) {
      out[out.length - 1] = out[out.length - 1] + titleCaseToken(tok);
    } else {
      out.push(titleCaseToken(tok));
    }
  }
  return out.join(" ");
}

function splitEnStemSuffix(word: string): { stem: string; suffix: string } | null {
  const w = word.trim();
  if (w.length < 5) return null;
  const lower = w.toLowerCase();
  for (const suffix of EN_SUFFIXES) {
    if (lower.endsWith(suffix) && lower.length > suffix.length + 2) {
      return {
        stem: w.slice(0, w.length - suffix.length),
        suffix: w.slice(w.length - suffix.length),
      };
    }
  }
  return null;
}

/** Join trailing Gujarati honorific onto previous token (no space). */
export function normalizeNamePartGu(value: string | null | undefined): string {
  const raw = collapseSpaces(String(value ?? ""));
  if (!raw) return "";

  const tokens = raw.split(" ").filter(Boolean);
  if (tokens.length === 1) {
    // Already glued અંજલીબેન — leave as-is
    return tokens[0];
  }

  const out: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const isSuffix = GU_SUFFIXES.some((s) => tok === s);
    if (isSuffix && out.length > 0) {
      out[out.length - 1] = out[out.length - 1] + tok;
    } else {
      out.push(tok);
    }
  }
  return out.join(" ");
}

export type NamePairFields = {
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  aadhaarName?: string | null;
  aadhaarNameGu?: string | null;
  motherName?: string | null;
  motherNameGu?: string | null;
  fatherName?: string | null;
  fatherNameGu?: string | null;
  guardianName?: string | null;
  guardianNameGu?: string | null;
};

const EN_NAME_KEYS = [
  "firstName",
  "middleName",
  "surname",
  "aadhaarName",
  "motherName",
  "fatherName",
  "guardianName",
] as const;

const GU_NAME_KEYS = [
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarNameGu",
  "motherNameGu",
  "fatherNameGu",
  "guardianNameGu",
] as const;

/** Normalize all English + Gujarati person-name fields on a student-like row. */
export function normalizeStudentNameFields<T extends NamePairFields>(row: T): T {
  const out: NamePairFields = { ...row };
  for (const key of EN_NAME_KEYS) {
    if (out[key] != null && String(out[key]).trim()) {
      out[key] = normalizeNamePartEn(out[key]);
    }
  }
  for (const key of GU_NAME_KEYS) {
    if (out[key] != null && String(out[key]).trim()) {
      out[key] = normalizeNamePartGu(out[key]);
    }
  }
  return out as T;
}

/**
 * Split an English name field into stem + honorific for better Gu transliteration.
 * "AnjaliBen" / "Anjali Ben" → { stem: "Anjali", suffix: "ben" }
 */
export function splitEnglishHonorific(text: string): {
  stem: string;
  suffix: string | null;
} {
  const normalized = normalizeNamePartEn(text);
  if (!normalized) return { stem: "", suffix: null };
  // Multi-word after normalize still has spaces between real name parts
  // (rare in firstName). Prefer trailing glued suffix on last token.
  const parts = normalized.split(" ");
  const last = parts[parts.length - 1];
  const compound = splitEnStemSuffix(last);
  if (!compound) return { stem: normalized, suffix: null };
  parts[parts.length - 1] = titleCaseToken(compound.stem);
  return {
    stem: parts.join(" "),
    suffix: compound.suffix.toLowerCase(),
  };
}

export function gujaratiHonorific(suffix: string | null | undefined): string {
  if (!suffix) return "";
  const key = suffix.toLowerCase();
  const map: Record<string, string> = {
    ben: "બેન",
    behn: "બેન",
    bhai: "ભાઈ",
    bai: "બાઈ",
    kumar: "કુમાર",
    kumaar: "કુમાર",
    kumari: "કુમારી",
    kumaari: "કુમારી",
    kumri: "કુમરી",
    devi: "દેવી",
  };
  return map[key] || "";
}
