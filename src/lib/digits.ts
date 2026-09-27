/**
 * Digits shown across the portal (GR, roll, results, certificates, etc.)
 * must stay Latin/English 0–9 — never Gujarati ૦–૯.
 */

const GU_TO_LATIN: Record<string, string> = {
  "૦": "0",
  "૧": "1",
  "૨": "2",
  "૩": "3",
  "૪": "4",
  "૫": "5",
  "૬": "6",
  "૭": "7",
  "૮": "8",
  "૯": "9",
};

/** Normalize any Gujarati (or mixed) digits to English 0–9. */
export function toLatinDigits(value: unknown): string {
  if (value == null) return "";
  return String(value).replace(/[૦-૯]/g, (ch) => GU_TO_LATIN[ch] ?? ch);
}

/**
 * @deprecated Prefer {@link toLatinDigits}. Kept so older imports keep
 * working — now returns English digits, not Gujarati.
 */
export function toGujaratiDigits(
  value: string | number | null | undefined,
): string {
  return toLatinDigits(value);
}
