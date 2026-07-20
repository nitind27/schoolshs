"use client";

const cache = new Map<string, string>();
const inflight = new Map<string, Promise<string>>();

export async function fetchGujaratiTranslation(text: string): Promise<string> {
  const key = text.trim().toLowerCase();
  if (!key) return "";
  if (cache.has(key)) return cache.get(key)!;

  const pending = inflight.get(key);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch("/api/gujarati/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) return "";
      const data = (await res.json()) as { gujarati?: string };
      const gu = String(data.gujarati ?? "").trim();
      if (gu) cache.set(key, gu);
      return gu;
    } catch {
      return "";
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}
