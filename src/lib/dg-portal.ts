/** Digital Gujarat portal types — scholarship scheme ke hisaab se login alag hota hai */

export type DgPortalType = "sjed" | "citizen";

export interface DgPortalConfig {
  type: DgPortalType;
  loginUrl: string;
  /** Session probe / post-login entry — SJED must NOT use HomePage.aspx */
  homeUrl: string;
  loginPagePattern: string;
  label: string;
  labelHi: string;
  description: string;
}

const BASE = "https://www.digitalgujarat.gov.in";

export const DG_PORTALS: Record<DgPortalType, DgPortalConfig> = {
  sjed: {
    type: "sjed",
    loginUrl: `${BASE}/loginapp/SJEDLogin.aspx`,
    homeUrl: `${BASE}/loginapp/SJEDLogin.aspx`,
    loginPagePattern: "SJEDLogin",
    label: "SJED Login",
    labelHi: "SJED Login (Pre-Matric)",
    description: "Pre-Matric Scholarship — SC/ST school students",
  },
  citizen: {
    type: "citizen",
    loginUrl: `${BASE}/loginapp/CitizenLogin.aspx`,
    homeUrl: `${BASE}/CitizenPortal/`,
    loginPagePattern: "CitizenLogin",
    label: "Citizen Login",
    labelHi: "Citizen Login (Post-Matric)",
    description: "Post-Matric, MYSY, OBC, SEBC — Citizen portal",
  },
};

/** Schemes that use SJEDLogin.aspx (Pre-Matric) */
const PRE_MATRIC_KEYWORDS = [
  "pre matric",
  "pre-matric",
  "prematric",
];

/** Explicit scheme → portal override (optional) */
const SCHEME_PORTAL_MAP: Record<string, DgPortalType> = {
  "Pre Matric Scholarship - SC": "sjed",
  "Pre Matric Scholarship - ST": "sjed",
};

export function isPreMatricScheme(scholarshipScheme: string): boolean {
  const normalized = scholarshipScheme.trim().toLowerCase();
  if (SCHEME_PORTAL_MAP[scholarshipScheme]) {
    return SCHEME_PORTAL_MAP[scholarshipScheme] === "sjed";
  }
  return PRE_MATRIC_KEYWORDS.some((kw) => normalized.includes(kw));
}

export function getDgPortalByType(type: DgPortalType): DgPortalConfig {
  return DG_PORTALS[type];
}

export function parsePortalType(value: string | null | undefined): DgPortalType {
  return value === "citizen" ? "citizen" : "sjed";
}

export function getDgPortalConfig(scholarshipScheme: string): DgPortalConfig {
  if (isPreMatricScheme(scholarshipScheme)) {
    return DG_PORTALS.sjed;
  }
  return DG_PORTALS.citizen;
}

export const PRE_MATRIC_SCHEMES = [
  "Pre Matric Scholarship - SC",
  "Pre Matric Scholarship - ST",
] as const;

export const POST_MATRIC_SCHEMES = [
  "Post Matric Scholarship - SC",
  "Post Matric Scholarship - ST",
  "Post Matric Scholarship - OBC",
  "Post Matric Scholarship - SEBC",
  "MYSY Scholarship",
  "Food Bill Assistance",
  "Instrument Assistance",
  "Research Scholarship",
] as const;

export function getSchemeGroup(scholarshipScheme: string): "Pre-Matric" | "Post-Matric" | "Other" {
  if (isPreMatricScheme(scholarshipScheme)) return "Pre-Matric";
  if (/post\s*matric/i.test(scholarshipScheme)) return "Post-Matric";
  return "Other";
}
