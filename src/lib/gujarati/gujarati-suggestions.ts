import { EngineFactory } from "@bhashaime/core";
import { isGujaratiScript } from "@/lib/gujarati/gujarati-script";

export interface GujaratiSuggestion {
  gujarati: string;
  latin: string;
  preferred?: boolean;
}

function guEngine() {
  return EngineFactory.getEngine("gujarati");
}

export function transliterateLatinWord(word: string): string {
  if (!word) return "";
  try {
    return guEngine().transliterateText(word);
  } catch {
    return word;
  }
}

const CONSONANT = /[bcdfghjklmnpqrstvwxyz]/;
const VOWEL = /[aeiou]/;

/** Consonant pairs that form conjuncts — do not insert schwa between them */
const NO_SCHWA_PAIRS = new Set([
  "bh", "ch", "dh", "gh", "jh", "kh", "ph", "sh", "th", "wh",
  "br", "cr", "dr", "fr", "gr", "kr", "pr", "tr", "vr", "wr",
  "nd", "ng", "nj", "nk", "nm", "nn", "nt", "ny",
  "ld", "lk", "lm", "lp", "lt", "lv", "mb", "mp", "nd", "nk", "nt",
  "rd", "rk", "rm", "rn", "rp", "rt", "rv", "sk", "sp", "st", "sw",
  "rk", "sh", "sm", "sn", "sp", "st", "sw",
]);

/**
 * Honorific / patronymic suffixes often glued to the stem in English typing
 * (ravindrabhai, jasminben) — split before transliterating each part.
 */
const NAME_SUFFIXES = [
  "bhai", "ben", "behn", "bai", "kumari", "kumri", "kumar", "devi",
  "prasad", "chand", "nath", "das", "lal", "ram", "miya", "ji",
].sort((a, b) => b.length - a.length);

/** Better latin spellings for common name suffixes */
const SUFFIX_LATIN_VARIANTS: Record<string, string[]> = {
  bhai: ["bhaai", "bhaee"],
  ben: ["ben", "baen"],
  behn: ["behn", "baen"],
  bai: ["baai", "bai"],
  devi: ["devi", "devee"],
  kumar: ["kumar", "kumaar"],
  kumari: ["kumari", "kumaari"],
};

/** Fixed Gujarati spellings for honorific / patronymic suffixes (not personal names) */
const SUFFIX_GU_CANONICAL: Record<string, string> = {
  bhai: "\u0AAD\u0ABE\u0AC0", // ભાઈ
  ben: "\u0AAC\u0AC7\u0AA8", // બેન
  behn: "\u0AAC\u0AC7\u0AA8", // બેન
  bai: "\u0AAC\u0ABE\u0A88", // બાઈ
  devi: "\u0AA6\u0AC7\u0AB5\u0AC0", // દેવી
  kumar: "\u0A95\u0AC1\u0AAE\u0ABE\u0AB0", // કુમાર
  kumari: "\u0A95\u0AC1\u0AAE\u0ABE\u0AB0\u0AC0", // કુમારી
  kumri: "\u0A95\u0AC1\u0AAE\u0AB0\u0AC0", // કુમરી
  prasad: "\u0AAA\u0CCD\u0AB0\u0AB8\u0ABE\u0AA6", // પ્રસાદ
  chand: "\u0A9A\u0AA8\u0ACD\u0AA6", // ચંદ
  nath: "\u0AA8\u0ABE\u0AA5", // નાથ
  das: "\u0AA6\u0ABE\u0AB8", // દાસ
  lal: "\u0AB2\u0ABE\u0AB2", // લાલ
  ram: "\u0AB0\u0ABE\u0AAE", // રામ
};

function gujaratiForSuffix(suffix: string): string {
  const key = suffix.toLowerCase();
  if (SUFFIX_GU_CANONICAL[key]) return SUFFIX_GU_CANONICAL[key];
  for (const latin of [key, ...(SUFFIX_LATIN_VARIANTS[key] ?? [])]) {
    const gu = transliterateLatinWord(latin);
    if (gu) return gu;
  }
  return transliterateLatinWord(key);
}

/** Split *endra / *indra names at syllable boundary — narendra → naren + dra */
function transliterateSyllableClusterName(word: string): string | null {
  const w = word.toLowerCase();
  if (/(?:endra|indra|andra)$/i.test(w) && w.length >= 6) {
    const stem = w.slice(0, -3);
    if (stem.length >= 3) {
      return transliterateLatinWord(stem) + transliterateLatinWord("dra");
    }
  }
  return null;
}

function isConsonant(c: string): boolean {
  return CONSONANT.test(c);
}

function isVowel(c: string): boolean {
  return VOWEL.test(c);
}

export function splitCompoundLatinWord(
  word: string
): { stem: string; suffix: string } | null {
  const w = word.toLowerCase().trim();
  if (w.length < 5) return null;
  for (const suffix of NAME_SUFFIXES) {
    if (w.endsWith(suffix) && w.length > suffix.length + 2) {
      return { stem: w.slice(0, -suffix.length), suffix };
    }
  }
  return null;
}

/** Preferred latin spelling for common Indian-English short vowel patterns */
function preferredLatinVariant(word: string): string {
  const w = word.toLowerCase().trim();
  if (/^ni(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) return "nee" + w.slice(2);
  if (/^ri(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) return "ree" + w.slice(2);
  if (/^si(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) return "see" + w.slice(2);
  if (/^di(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) return "dee" + w.slice(2);
  return w;
}

function promotePreferredLatinVariant(
  original: string,
  items: GujaratiSuggestion[]
): GujaratiSuggestion[] {
  const alt = preferredLatinVariant(original);
  if (alt === original || items.length === 0) return items;
  const idx = items.findIndex((s) => s.latin === alt);
  if (idx <= 0) return items;
  const picked = { ...items[idx], preferred: true };
  const rest = items
    .filter((_, i) => i !== idx)
    .map((s) => ({ ...s, preferred: false }));
  return [picked, ...rest];
}

/**
 * Build latin spelling variants for any word — schwa insertion, vowel length,
 * common name suffixes, and Indian-English consonant swaps. No static name list.
 */
function generateLatinVariants(word: string, depth = 0): string[] {
  const w = word.toLowerCase().trim();
  if (!w) return [];

  const out = new Set<string>([w]);
  const add = (s: string) => {
    const v = s.toLowerCase().trim();
    if (v && v.length >= 1 && v.length <= 40) out.add(v);
  };

  // Schwa (a / aa) between consecutive consonants — parmar → paramaar → પરમાર
  for (let i = 1; i < w.length; i++) {
    if (isConsonant(w[i - 1]) && isConsonant(w[i])) {
      const pair = w[i - 1] + w[i];
      if (NO_SCHWA_PAIRS.has(pair)) continue;
      add(w.slice(0, i) + "a" + w.slice(i));
      add(w.slice(0, i) + "aa" + w.slice(i));
    }
  }

  // Compound name: stem + suffix (ravindrabhai → ravindra + bhai)
  const compound = depth === 0 ? splitCompoundLatinWord(w) : null;
  if (compound) {
    add(compound.stem);
    add(compound.suffix);
    for (const sv of SUFFIX_LATIN_VARIANTS[compound.suffix] ?? []) {
      add(compound.stem + sv);
    }
    for (const stemV of generateLatinVariants(compound.stem, depth + 1).slice(0, 12)) {
      add(stemV + compound.suffix);
      for (const sv of SUFFIX_LATIN_VARIANTS[compound.suffix] ?? [compound.suffix]) {
        add(stemV + sv);
      }
    }
  }

  // Standalone suffix spelling fixes
  if (SUFFIX_LATIN_VARIANTS[w]) {
    for (const v of SUFFIX_LATIN_VARIANTS[w]) add(v);
  }

  // Schwa between doubled consonants — bhatt → bhatat / bhaatt
  for (let i = 1; i < w.length; i++) {
    if (w[i] === w[i - 1] && isConsonant(w[i])) {
      add(w.slice(0, i) + "a" + w.slice(i));
      add(w.slice(0, i) + "aa" + w.slice(i));
    }
  }

  // Double final short 'a' — mehta → mehtaa (not narendra → narendraa)
  if (
    w.endsWith("a") &&
    !w.endsWith("aa") &&
    !/(?:ndra|indr|endr|andr|esh|dev|raj|esh|ini|ani|eni)$/i.test(w)
  ) {
    add(w + "a");
  }

  // Trailing vowel only after consonant cluster at end — bhatt → bhattaa, not nitin → nitinaa
  if (
    w.length >= 2 &&
    isConsonant(w[w.length - 1]) &&
    isConsonant(w[w.length - 2])
  ) {
    add(w + "a");
    add(w + "aa");
  }

  // Gujarati names often end in long 'aa' after h/t/dh sounds — mehta, shah, chauhan
  if (/(?:ht|hd|hn|hr|sh|dh|th|bh|gh|kh|kt|tt|dd|nn|ll|mm|rr)$/i.test(w)) {
    add(w + "a");
    add(w + "aa");
  }

  // Vowel in 'hta' names — mehta → mehataa
  if (/hta$/i.test(w)) {
    const root = w.slice(0, -2);
    add(root + "ata");
    add(root + "ataa");
  }

  // Double final 'tt' — bhatt → bhaat / bhaatt
  if (/att$/i.test(w) && w.length >= 4) {
    const root = w.slice(0, -2);
    add(root + "aat");
    add(root + "aatt");
  }

  // Final 'ki' long vowel — solanki → solankee
  if (/ki$/i.test(w)) {
    add(w.slice(0, -2) + "kee");
    add(w.slice(0, -2) + "kii");
  }

  // Final 'ai' — desai → desaai
  if (/ai$/i.test(w)) {
    add(w.slice(0, -2) + "aai");
  }

  // Common Gujarati / Indian name suffix alternates
  const suffixRules: Array<[string, string[]]> = [
    ["mar", ["maar", "amar", "amaar"]],
    ["mer", ["meer", "amer", "ameer"]],
    ["mir", ["meer", "amir", "ameer"]],
    ["mor", ["moor", "amor"]],
    ["kar", ["kaar", "akar", "aakar"]],
    ["dar", ["daar", "adar", "aadar"]],
    ["bar", ["baar", "abar"]],
    ["tal", ["taal", "atal"]],
    ["val", ["vaal", "aval"]],
    ["nal", ["naal", "anal"]],
    ["pur", ["poor", "apur"]],
    ["esh", ["aash", "eesh", "aesh"]],
    ["esh", ["eesh", "ish"]],
    ["ani", ["aani", "aanee"]],
    ["devi", ["devi", "devee"]],
  ];
  for (const [suffix, replacements] of suffixRules) {
    if (w.endsWith(suffix) && w.length > suffix.length) {
      const stem = w.slice(0, -suffix.length);
      for (const r of replacements) add(stem + r);
    }
  }

  // Vowel length at each vowel position
  for (let i = 0; i < w.length; i++) {
    if (isVowel(w[i])) {
      add(w.slice(0, i) + w[i] + w[i] + w.slice(i + 1));
    }
  }

  // Single 'a' → 'aa' (not global replace — one position at a time)
  for (let i = 0; i < w.length; i++) {
    if (w[i] === "a") add(w.slice(0, i) + "aa" + w.slice(i + 1));
  }

  // First-syllable short 'i' → long 'ee' — nitin → neetin, nilesh → neelesh
  if (/^ni(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) {
    add("nee" + w.slice(2));
  }
  if (/^ri(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) {
    add("ree" + w.slice(2));
  }
  if (/^si(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) {
    add("see" + w.slice(2));
  }
  if (/^di(?=[bcdfghjklmnpqrstvwxyz])/i.test(w) && w.length >= 4) {
    add("dee" + w.slice(2));
  }

  // -endra / -indra names keep final 'a' — do not append extra vowel
  if (/(?:endra|indra|andra|undra)$/i.test(w)) {
    add(w.replace(/a$/i, "")); // narendra → narendr
  }

  // Safe vowel digraph swaps
  if (/ee/.test(w)) add(w.replace(/ee/g, "i"));
  if (/oo/.test(w)) add(w.replace(/oo/g, "u"));
  if (/i/.test(w)) add(w.replace(/i/g, "ee"));
  if (/u/.test(w)) add(w.replace(/u/g, "oo"));

  // Indian-English consonant digraph swaps
  const digraphSwaps: Array<[RegExp, string]> = [
    [/ph/g, "f"],
    [/bh/g, "b"],
    [/dh/g, "d"],
    [/th/g, "t"],
    [/gh/g, "g"],
    [/kh/g, "k"],
    [/sh/g, "s"],
    [/ch/g, "c"],
    [/v/g, "w"],
    [/w/g, "v"],
  ];
  for (const [re, repl] of digraphSwaps) {
    if (re.test(w)) add(w.replace(re, repl));
  }

  return [...out].filter((v) => !/[aeiou]{4,}/.test(v));
}

/** Rank Gujarati output quality — prefer readable syllables over stacked consonants */
function scoreGujaratiOutput(
  gujarati: string,
  sourceLatin: string,
  originalLatin: string
): number {
  let score = 0;

  const matras = gujarati.match(/[\u0ABE-\u0ACC\u0AE0-\u0AE1\u0AC2\u0AC7-\u0ACB]/g);
  score += (matras?.length ?? 0) * 4;

  const standaloneVowels = gujarati.match(/[\u0A85-\u0A94]/g);
  score += (standaloneVowels?.length ?? 0) * 3;

  const halants = gujarati.match(/\u0ACD/g);
  score -= (halants?.length ?? 0) * 5;

  // Penalize awkward latin spellings (too many vowels in a row)
  if (/[aeiou]{3,}/.test(sourceLatin)) score -= 6;
  for (const run of sourceLatin.match(/[aeiou]+/g) ?? []) {
    if (run.length >= 3) score -= 4;
  }

  // Prefer minimal change from what the user typed
  const lenDelta = sourceLatin.length - originalLatin.length;
  if (lenDelta > 0) score -= lenDelta * 0.5;
  if (lenDelta < 0) score -= 4;

  const origVowels = originalLatin.match(/[aeiou]/g)?.length ?? 0;
  const srcVowels = sourceLatin.match(/[aeiou]/g)?.length ?? 0;
  const extraVowels = srcVowels - origVowels;
  if (extraVowels > 0) score -= extraVowels * 2;

  // Reward schwa 'aa' inserted between consonants (not after an existing vowel)
  if (/[^aeiou]aa[^aeiou]/.test(sourceLatin) && sourceLatin !== originalLatin) {
    score += 3;
  }
  if (/[aeiou]aa/.test(sourceLatin) && sourceLatin !== originalLatin) {
    score -= 2;
  }

  // Penalize vowel inserted right after an existing vowel in latin (paraamar-style)
  if (
    sourceLatin !== originalLatin &&
    /[aeiou][aeiou]/.test(sourceLatin) &&
    !/[aeiou]{2}/.test(originalLatin)
  ) {
    score -= 3;
  }

  // Suffix-aware boosts — common Gujarati name ending patterns (fully dynamic)
  const suffixBoosts: Array<[RegExp, RegExp, number]> = [
    [/mar$/, /maar|amaar/, 3],
    [/esh$/, /aa|ee/, 2],
    [/od$/, /aa|dh|th/, 2],
    [/ki$/, /kee|kii$/, 3],
    [/ht$/, /ataa$|htaa$/, 3],
    [/tt$/, /aatt$|aat$/, 3],
    [/sh$/, /aa$|aah$/, 2],
    [/ar$/, /aar$|umaar$/, 2],
    [/ai$/, /aai$/, 3],
    [/an$/, /aan$|haan$/, 2],
  ];
  for (const [origEnd, variantPattern, boost] of suffixBoosts) {
    if (
      origEnd.test(originalLatin) &&
      variantPattern.test(sourceLatin) &&
      sourceLatin !== originalLatin
    ) {
      score += boost;
    }
  }

  // Only lengthening the first syllable vowel (paatel from patel) — usually wrong
  if (sourceLatin !== originalLatin) {
    const origChunk = originalLatin.match(/^([^aeiou]*)([aeiou]+)(.*)$/);
    const srcChunk = sourceLatin.match(/^([^aeiou]*)([aeiou]+)(.*)$/);
    if (
      origChunk &&
      srcChunk &&
      origChunk[1] === srcChunk[1] &&
      origChunk[3] === srcChunk[3] &&
      origChunk[3].length >= 3 &&
      srcChunk[2].length > origChunk[2].length
    ) {
      score -= 5;
    }
  }

  // Avoid consonant-swap noise on 'sh' names (shah → saahah)
  if (
    sourceLatin !== originalLatin &&
    /^sh/i.test(originalLatin) &&
    !/^sh/i.test(sourceLatin)
  ) {
    score -= 6;
  }

  // Prefer natural -esh name variants (rajesh → raajesh, not rajesaah)
  if (/esh$/i.test(originalLatin)) {
    if (/aajesh$/i.test(sourceLatin) || /^raa/i.test(sourceLatin)) score += 5;
    if (/esaah$/i.test(sourceLatin)) score -= 6;
  }

  // Prefer natural -hta name variants (mehta → mehataa)
  if (/hta$/i.test(originalLatin) && /ataa$/i.test(sourceLatin)) {
    score += 4;
  }

  // Penalize awkward middle vowel clusters in latin
  if (/ataat|aa?taa?t/.test(sourceLatin) && sourceLatin !== originalLatin) {
    score -= 4;
  }

  // Prefer long 'ee' Gujarati matra for English names ending in 'ki'
  if (/ki$/i.test(originalLatin) && gujarati.endsWith("\u0AC0")) {
    score += 5;
  }

  // First syllable ni → nee (nitin → neetin → નીતિન)
  if (
    /^ni(?=[bcdfghjklmnpqrstvwxyz])/i.test(originalLatin) &&
    /^nee/i.test(sourceLatin) &&
    sourceLatin.slice(3) === originalLatin.slice(2)
  ) {
    score += 14;
  }
  if (
    /^ni(?=[bcdfghjklmnpqrstvwxyz])/i.test(originalLatin) &&
    sourceLatin === originalLatin &&
    gujarati.startsWith("\u0A28\u0ABF")
  ) {
    score -= 8;
  }

  // Penalize spurious trailing 'a' on words already ending in 'a' (narendra → narendraa)
  if (
    /a$/i.test(originalLatin) &&
    !/aa$/i.test(originalLatin) &&
    (sourceLatin === originalLatin + "a" || sourceLatin === originalLatin + "aa")
  ) {
    score -= 14;
  }

  // Penalize lengthening only the final 'a' in -endra/-indra names
  if (
    /(?:endra|indra|andra)$/i.test(originalLatin) &&
    sourceLatin !== originalLatin &&
    /^[a-z]+aa$/i.test(sourceLatin) &&
    sourceLatin.slice(0, -1) === originalLatin
  ) {
    score -= 12;
  }

  // Reduce exact-match lock-in when a strong suffix variant exists
  if (/ki$/i.test(originalLatin) && sourceLatin === originalLatin && gujarati.endsWith("\u0ABF")) {
    score -= 3;
  }
  if (/ai$/i.test(originalLatin) && sourceLatin === originalLatin) {
    score -= 5;
  }
  if (
    /ai$/i.test(originalLatin) &&
    sourceLatin !== originalLatin &&
    /ા/.test(gujarati)
  ) {
    score += 5;
  }

  // Boost only when the raw spelling already transliterates cleanly
  if (sourceLatin === originalLatin) {
    const syllableGu = transliterateSyllableClusterName(originalLatin);
    if (syllableGu && gujarati === syllableGu) {
      score += 10;
    }

    const halantCount = halants?.length ?? 0;
    const matraCount = matras?.length ?? 0;
    if (halantCount === 0 && matraCount >= 2) {
      score += 5;
    } else if (halantCount > 0) {
      // Halants are correct in conjunct names — narendra, rajesh, prakash
      if (/(?:ndra|ndr|mpr|nkl|ksh|jny|tth|dhw|sch)/i.test(originalLatin)) {
        score += 6;
      } else {
        score -= halantCount * 2;
      }
    } else if (matraCount === 1 && originalLatin.length <= 6) {
      score += 2;
    } else if (originalLatin.length <= 5) {
      score -= 2;
    } else {
      score += 3;
    }
  }

  // Heavily distorted spellings are unlikely to be what the user meant
  if (sourceLatin.length > originalLatin.length + 3) score -= 5;

  // Compound names (ravindrabhai) — prefer stem + suffix transliteration
  const compound = splitCompoundLatinWord(originalLatin);
  if (compound) {
    const stemGu = gujaratiForStem(compound.stem);
    const suffixGu = gujaratiForSuffix(compound.suffix);
    if (gujarati === stemGu + suffixGu) score += 12;
    // Penalize variants that mash the suffix into the stem (extra vowels before suffix)
    const suffixStart = sourceLatin.length - compound.suffix.length;
    if (
      sourceLatin !== originalLatin &&
      suffixStart > compound.stem.length &&
      /[aeiou]{2,}/.test(sourceLatin.slice(compound.stem.length, suffixStart))
    ) {
      score -= 8;
    }
  }

  // Canonical honorific suffix spellings (bhai → ભાઈ)
  if (SUFFIX_GU_CANONICAL[originalLatin] && gujarati === SUFFIX_GU_CANONICAL[originalLatin]) {
    score += 10;
  }

  return score;
}

function rankSuggestions(
  originalLatin: string,
  items: GujaratiSuggestion[]
): GujaratiSuggestion[] {
  const scored = items
    .map((item) => ({
      item,
      score: scoreGujaratiOutput(item.gujarati, item.latin, originalLatin),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const aMatras = a.item.gujarati.match(/[\u0ABE-\u0ACC\u0AE0-\u0AE1\u0AC2\u0AC7-\u0ACB]/g)?.length ?? 0;
      const bMatras = b.item.gujarati.match(/[\u0ABE-\u0ACC\u0AE0-\u0AE1\u0AC2\u0AC7-\u0ACB]/g)?.length ?? 0;
      if (bMatras !== aMatras) return bMatras - aMatras;
      const aExtra =
        (a.item.latin.match(/[aeiou]/g)?.length ?? 0) -
        (originalLatin.match(/[aeiou]/g)?.length ?? 0);
      const bExtra =
        (b.item.latin.match(/[aeiou]/g)?.length ?? 0) -
        (originalLatin.match(/[aeiou]/g)?.length ?? 0);
      if (aExtra !== bExtra) return aExtra - bExtra;
      const da = Math.abs(a.item.latin.length - originalLatin.length);
      const db = Math.abs(b.item.latin.length - originalLatin.length);
      if (da !== db) return da - db;
      return a.item.latin.localeCompare(b.item.latin);
    });

  const bestScore = scored[0]?.score ?? 0;
  const minScore = bestScore - 10;

  const seen = new Set<string>();
  const ranked: GujaratiSuggestion[] = [];
  let first = true;

  for (const { item, score } of scored) {
    if (!item.gujarati || seen.has(item.gujarati)) continue;
    if (score < minScore) continue;
    seen.add(item.gujarati);
    ranked.push({
      ...item,
      preferred: first,
    });
    first = false;
  }

  return ranked;
}

function gujaratiForStem(stem: string): string {
  const syllable = transliterateSyllableClusterName(stem);
  const ranked = rankSuggestions(
    stem,
    generateLatinVariants(stem, 1).map((latin) => ({
      gujarati: transliterateLatinWord(latin),
      latin,
    }))
  ).filter((s) => s.gujarati);
  const exact = ranked.find((s) => s.latin === stem);
  if (syllable) return syllable;
  return exact?.gujarati ?? ranked[0]?.gujarati ?? transliterateLatinWord(stem);
}

/** Build top Gujarati candidates by splitting stem + honorific suffix */
function buildCompoundSuggestions(original: string): GujaratiSuggestion[] {
  const split = splitCompoundLatinWord(original);
  if (!split) return [];

  const suffixGu = gujaratiForSuffix(split.suffix);
  const seen = new Set<string>();
  const out: GujaratiSuggestion[] = [];

  const primaryStem = gujaratiForStem(split.stem);
  const primary = primaryStem + suffixGu;
  if (primary) {
    seen.add(primary);
    out.push({ gujarati: primary, latin: original, preferred: true });
  }

  const stemRanked = rankSuggestions(split.stem, [
    ...generateLatinVariants(split.stem, 1).map((latin) => ({
      gujarati: transliterateLatinWord(latin),
      latin,
    })),
  ]).filter((s) => s.gujarati);

  for (const stem of stemRanked.slice(0, 5)) {
    const gujarati = stem.gujarati + suffixGu;
    if (!gujarati || seen.has(gujarati)) continue;
    seen.add(gujarati);
    out.push({ gujarati, latin: original, preferred: false });
  }

  return out;
}

/** Multiple Gujarati candidates for one latin word — fully dynamic, any input */
export function getGujaratiSuggestions(latinWord: string, max = 9): GujaratiSuggestion[] {
  if (!latinWord) return [];

  const original = latinWord.toLowerCase().trim();
  const variants = generateLatinVariants(original);
  const raw: GujaratiSuggestion[] = [];

  for (const latin of variants) {
    const gujarati = transliterateLatinWord(latin);
    if (!gujarati) continue;
    raw.push({ gujarati, latin });
  }

  const syllableGu = transliterateSyllableClusterName(original);
  if (syllableGu) {
    raw.unshift({ gujarati: syllableGu, latin: original });
  }

  const compoundFirst = buildCompoundSuggestions(original);
  const ranked = rankSuggestions(original, raw);
  const merged: GujaratiSuggestion[] = [];
  const seenGu = new Set<string>();

  const canonicalSuffix = SUFFIX_GU_CANONICAL[original];
  if (canonicalSuffix) {
    seenGu.add(canonicalSuffix);
    merged.push({ gujarati: canonicalSuffix, latin: original, preferred: true });
  }

  for (const item of compoundFirst) {
    if (!item.gujarati || seenGu.has(item.gujarati)) continue;
    seenGu.add(item.gujarati);
    merged.push({ ...item, preferred: merged.length === 0 });
  }
  for (const item of ranked) {
    if (!item.gujarati || seenGu.has(item.gujarati)) continue;
    seenGu.add(item.gujarati);
    merged.push({ ...item, preferred: merged.length === 0 });
  }

  if (merged.length === 0) {
    const fallback = transliterateLatinWord(original);
    if (fallback) return [{ gujarati: fallback, latin: original, preferred: true }];
  }

  return promotePreferredLatinVariant(original, merged).slice(0, max);
}

export function parseLatinBuffer(full: string): { committed: string; current: string } {
  if (!full) return { committed: "", current: "" };
  const trimmed = full.replace(/\s+$/, "");
  if (!trimmed) return { committed: "", current: "" };
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace === -1) return { committed: "", current: trimmed };
  return {
    committed: trimmed.slice(0, lastSpace),
    current: trimmed.slice(lastSpace + 1),
  };
}

function gujaratiForLatinWord(
  word: string,
  suggestionIndex = 0,
  wordChoices: Record<string, number> = {},
  wordGuLocked: Record<string, string> = {}
): string {
  const key = word.toLowerCase();
  if (wordGuLocked[key]) return wordGuLocked[key];
  const idx = wordChoices[key] ?? suggestionIndex;
  const sug = getGujaratiSuggestions(word);
  return sug[idx]?.gujarati ?? sug[0]?.gujarati ?? transliterateLatinWord(word);
}

export function buildGujaratiDisplay(
  latinFull: string,
  suggestionIndex = 0,
  wordChoices: Record<string, number> = {},
  wordGuLocked: Record<string, string> = {}
): { display: string; suggestions: GujaratiSuggestion[]; currentLatin: string } {
  if (!latinFull) {
    return { display: "", suggestions: [], currentLatin: "" };
  }

  if (isGujaratiScript(latinFull)) {
    return { display: latinFull, suggestions: [], currentLatin: "" };
  }

  const { committed, current } = parseLatinBuffer(latinFull);
  const suggestions = getGujaratiSuggestions(current);
  const currentKey = current.toLowerCase();
  const pick =
    wordGuLocked[currentKey] ??
    suggestions[suggestionIndex]?.gujarati ??
    gujaratiForLatinWord(current, suggestionIndex, wordChoices, wordGuLocked);

  const committedGu = committed
    ? committed
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => gujaratiForLatinWord(w, 0, wordChoices, wordGuLocked))
        .join(" ")
    : "";

  const display = committedGu && pick ? `${committedGu} ${pick}` : committedGu || pick;

  return { display, suggestions, currentLatin: current };
}

export function transliterateLatinFull(
  latinFull: string,
  wordChoices: Record<string, number> = {},
  wordGuLocked: Record<string, string> = {}
): string {
  if (!latinFull) return "";
  if (isGujaratiScript(latinFull)) return latinFull;
  return latinFull
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => gujaratiForLatinWord(w, 0, wordChoices, wordGuLocked))
    .join(" ");
}

/** Back-compat helper */
export function getGujaratiSuggestionStrings(latinWord: string, max = 9): string[] {
  return getGujaratiSuggestions(latinWord, max).map((s) => s.gujarati);
}
