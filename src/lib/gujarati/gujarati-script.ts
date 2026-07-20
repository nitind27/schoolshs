const GUJARATI_RE = /[\u0A80-\u0AFF]/;

export function isGujaratiScript(text: string): boolean {
  return GUJARATI_RE.test(text);
}
