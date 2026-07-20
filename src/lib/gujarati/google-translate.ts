/** Server-side English → Gujarati via Google Translate (romanized names). */
export async function translateEnglishToGujarati(text: string): Promise<string> {
  const raw = text.trim();
  if (!raw) return "";

  const q = encodeURIComponent(raw);
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=gu&dt=t&q=${q}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; ScholarshipPortal/1.0)" },
    next: { revalidate: 0 },
  });

  if (!res.ok) return "";

  const data: unknown = await res.json();
  const translated = (data as [Array<[string]> | null])?.[0]?.[0]?.[0];
  return typeof translated === "string" ? translated.trim() : "";
}

/** Word-by-word Gujarati for multi-word English names. */
export async function translateEnglishNameParts(text: string): Promise<string> {
  const full = await translateEnglishToGujarati(text);
  if (full) return full;

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return "";

  const parts = await Promise.all(words.map((w) => translateEnglishToGujarati(w)));
  if (parts.some((p) => !p)) return "";
  return parts.join(" ");
}
