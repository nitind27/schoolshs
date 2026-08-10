/** ID card colors — aligned with admin dashboard hero / sidebar */

export const ID_CARD_BRAND = {
  /** dashboard-hero end / sidebar blue */
  primary: "#1d4ed8",
  /** dashboard-hero sky */
  accent: "#0369a1",
  /** dashboard-hero teal mid */
  teal: "#0f766e",
  /** dashboard-hero dark / sidebar base */
  dark: "#0c1222",
  /** student name on card */
  name: "#1e40af",
  /** old default — auto-upgrade to dashboard palette */
  legacyPink: "#e91e8c",
} as const;

export function resolveIdCardColors(
  primary?: string | null,
  accent?: string | null,
): { primary: string; accent: string } {
  let p = (primary || "").trim() || ID_CARD_BRAND.primary;
  let a = (accent || "").trim() || ID_CARD_BRAND.accent;
  if (p.toLowerCase() === ID_CARD_BRAND.legacyPink) {
    p = ID_CARD_BRAND.primary;
  }
  return { primary: p, accent: a };
}
