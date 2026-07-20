import { isGujaratiScript } from "@/lib/gujarati/gujarati-script";
import { transliterateLatinFull } from "@/lib/gujarati/gujarati-suggestions";

export { isGujaratiScript } from "@/lib/gujarati/gujarati-script";

export function transliterateToGujarati(text: string): string {
  const raw = text.trim();
  if (!raw) return "";
  if (isGujaratiScript(raw)) return raw;
  return transliterateLatinFull(raw);
}

/** Live transliteration while typing (no trim) — English field → Gujarati preview */
export function transliterateToGujaratiLive(text: string): string {
  if (!text) return "";
  if (isGujaratiScript(text)) return text;
  return transliterateLatinFull(text);
}

export function bilingualNamePair(value: string): { en: string; gu: string } {
  const en = value.trim();
  if (!en) return { en: "", gu: "" };
  if (isGujaratiScript(en)) return { en, gu: en };
  return { en, gu: transliterateToGujarati(en) };
}
