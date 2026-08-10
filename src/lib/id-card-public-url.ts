/** Edge / client safe — build QR scan URL for public student ID card */

/** `{website}/m/id/{studentId}` — no login */
export function buildPublicStudentIdScanUrl(
  website: string | null | undefined,
  studentId: string,
  fallbackOrigin?: string | null,
): string {
  return buildPublicScanUrl(website, `/m/id/${String(studentId || "").trim()}`, fallbackOrigin);
}

/** `{website}/m/exam-id/{staffId}?…` — no login */
export function buildPublicExamIdScanUrl(
  website: string | null | undefined,
  staffId: string,
  meta?: {
    examTitle?: string;
    examSession?: string;
    academicYear?: string;
    roleLabel?: string;
  } | null,
  fallbackOrigin?: string | null,
): string {
  const id = String(staffId || "").trim();
  if (!id) return "";
  const params = new URLSearchParams();
  if (meta?.examTitle?.trim()) params.set("t", meta.examTitle.trim());
  if (meta?.examSession?.trim()) params.set("s", meta.examSession.trim());
  if (meta?.academicYear?.trim()) params.set("y", meta.academicYear.trim());
  if (meta?.roleLabel?.trim()) params.set("r", meta.roleLabel.trim());
  const qs = params.toString();
  return buildPublicScanUrl(website, `/m/exam-id/${id}${qs ? `?${qs}` : ""}`, fallbackOrigin);
}

function buildPublicScanUrl(
  website: string | null | undefined,
  pathAndQuery: string,
  fallbackOrigin?: string | null,
): string {
  const path = String(pathAndQuery || "").trim();
  if (!path) return "";
  const raw = String(website || fallbackOrigin || "").trim();
  if (!raw) return "";
  const display = raw.replace(/^https?:\/\//i, "").replace(/\/$/, "");
  const origin = /^https?:\/\//i.test(raw) ? raw.replace(/\/$/, "") : `https://${display}`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}
