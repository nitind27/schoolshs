/** Client-safe: GR vs name query. Keep Prisma/SQL out of this file. */
export function looksLikeGrQuery(search: string): boolean {
  const q = String(search || "").trim();
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  if (!digits) return false;
  const letters = q.replace(/[0-9\s./-]/g, "");
  return digits.length >= 1 && letters.length === 0;
}
