const store = new Map<string, { exp: number; ok: boolean; json: unknown }>();

export function peekCachedJson<T>(url: string): T | null {
  const hit = store.get(url);
  if (!hit || hit.exp <= Date.now() || !hit.ok) return null;
  return hit.json as T;
}

export async function cachedGetJson<T>(
  url: string,
  signal?: AbortSignal,
  ttlMs = 45_000,
): Promise<{ ok: boolean; json: T }> {
  const hit = store.get(url);
  if (hit && hit.exp > Date.now()) {
    return { ok: hit.ok, json: hit.json as T };
  }

  const res = await fetch(url, { signal });
  const json = (await res.json()) as T;
  if (!signal?.aborted) {
    store.set(url, { exp: Date.now() + ttlMs, ok: res.ok, json });
  }
  return { ok: res.ok, json };
}

export function prefetchJson(url: string, ttlMs = 45_000) {
  if (peekCachedJson(url)) return;
  void cachedGetJson(url, undefined, ttlMs).catch(() => undefined);
}
