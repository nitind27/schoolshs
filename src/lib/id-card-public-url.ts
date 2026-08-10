/** Edge / client safe — build QR scan URL for public student ID card */

/** `{website}/m/id/{studentId}` — no login */
export function buildPublicStudentIdScanUrl(
  website: string | null | undefined,
  studentId: string,
  fallbackOrigin?: string | null,
): string {
  const id = String(studentId || "").trim();
  if (!id) return "";
  const raw = String(website || fallbackOrigin || "").trim();
  if (!raw) return "";
  const display = raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const origin = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${display}`;
  return `${origin}/m/id/${id}`;
}
