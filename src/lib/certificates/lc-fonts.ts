/** Saved LC line sizes. Keys match the editable spots on the upper-primary certificate. */
export type LcFontMap = Record<string, number>;

const KEY = /^[A-Za-z][A-Za-z0-9]{0,40}$/;

export function cleanLcFonts(input: unknown): LcFontMap {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const out: LcFontMap = {};
  for (const [key, value] of Object.entries(input)) {
    if (!KEY.test(key)) continue;
    const size = Math.round(Number(value));
    if (!Number.isFinite(size) || size < 8 || size > 18) continue;
    out[key] = size;
  }
  return out;
}
