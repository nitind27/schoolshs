/** Panel / feature keys super admin can enable per school */
import {
  isKnownCertificatePackId,
  listCertificatePackOptions,
  resolveCertificatePackId,
} from "@/lib/certificates/packs-registry";

export const SCHOOL_FEATURE_KEYS = [
  "dashboard",
  "classes",
  "students",
  "staff",
  "admissions",
  "results",
  "attendance",
  "activities",
  "scholarship_add",
  "scholarship_import",
  "scholarship_bulk_submit",
  "scholarship_auto_apply",
  "scholarship_export",
  "accounting",
  "board_records",
  "certificates",
  "id_cards",
  "portal_teacher",
  "portal_clerk",
  "portal_ca",
  "portal_student",
  "chat",
] as const;

export type SchoolFeatureKey = (typeof SCHOOL_FEATURE_KEYS)[number];

export interface SchoolFeatureDef {
  key: SchoolFeatureKey;
  label: string;
  group: string;
  path?: string;
  description?: string;
}

export const SCHOOL_FEATURES: SchoolFeatureDef[] = [
  { key: "dashboard", label: "Dashboard", group: "Overview", path: "/dashboard", description: "School overview & stats" },
  { key: "classes", label: "Classes", group: "Academics", path: "/classes", description: "Class management" },
  { key: "students", label: "Students", group: "Academics", path: "/students", description: "Student records" },
  { key: "staff", label: "Staff", group: "Academics", path: "/staff", description: "Staff management" },
  { key: "admissions", label: "Admissions", group: "Academics", path: "/admissions", description: "Admission verification" },
  { key: "results", label: "Results", group: "Academics", path: "/results", description: "Exam results & report cards" },
  { key: "attendance", label: "Attendance", group: "Academics", path: "/attendance", description: "Monthly attendance" },
  { key: "activities", label: "Activities", group: "Academics", path: "/activities", description: "School activities & student participation" },
  { key: "scholarship_add", label: "Add Student", group: "Scholarship", path: "/students/new", description: "New scholarship student" },
  { key: "scholarship_import", label: "Bulk Import", group: "Scholarship", path: "/import", description: "CSV/Excel import" },
  { key: "scholarship_bulk_submit", label: "Bulk Mark Submitted", group: "Scholarship", path: "/bulk-submit", description: "Mark students submitted in school records (not Digital Gujarat)" },
  { key: "scholarship_auto_apply", label: "Auto Apply DG", group: "Scholarship", path: "/auto-apply", description: "Playwright automation" },
  { key: "scholarship_export", label: "Reports & Export", group: "Scholarship", path: "/export", description: "Reports center — Excel, CSV and PDF for all modules" },
  { key: "accounting", label: "Accounting", group: "Administration", path: "/accounting", description: "Books of account" },
  {
    key: "board_records",
    label: "Board Exam Results",
    group: "Administration",
    path: "/students/board-records",
    description: "10th/12th board records, result list, exam sheets & analysis",
  },
  { key: "certificates", label: "Certificates", group: "Administration", path: "/certificates", description: "Bonafide, LC, character & registers" },
  { key: "id_cards", label: "ID Cards", group: "Administration", path: "/id-cards", description: "Student & examination staff ID cards" },
  { key: "chat", label: "Staff Chat", group: "Communication", path: "/chat", description: "Real-time staff messaging" },
  { key: "portal_teacher", label: "Teacher Portal", group: "Role Portals", path: "/teacher", description: "Teacher login access" },
  { key: "portal_clerk", label: "Clerk Portal", group: "Role Portals", path: "/clerk", description: "Clerk login access" },
  { key: "portal_ca", label: "CA Portal", group: "Role Portals", path: "/ca", description: "Chartered accountant access" },
  { key: "portal_student", label: "Student Portal", group: "Role Portals", path: "/student", description: "Student self-service" },
];

/** Print / layout formats Super Admin assigns per school (only enabled modules use these). */
export const MODULE_FORMAT_KEYS = [
  "certificates",
  "id_cards",
  "results",
  "board_records",
] as const;

export type ModuleFormatKey = (typeof MODULE_FORMAT_KEYS)[number];

export type ModuleFormatOption = {
  id: string;
  label: string;
  description?: string;
};

export const MODULE_FORMAT_OPTIONS: Record<ModuleFormatKey, ModuleFormatOption[]> = {
  /** From packs-registry — folders under components/certificates/packs/<schoolCode> */
  certificates: listCertificatePackOptions(),
  id_cards: [
    { id: "default", label: "Standard ID card", description: "Full student / exam staff card" },
    { id: "compact", label: "Compact ID card", description: "Smaller print layout" },
    {
      id: "24261004405",
      label: "ID card · 24261004405 (Songadh)",
      description: "Uses this school’s name, logo & colours from School Settings",
    },
    {
      id: "24261004403",
      label: "ID card · 24261004403",
      description: "Uses this school’s name, logo & colours from School Settings",
    },
    {
      id: "24261004404",
      label: "ID card · 24261004404",
      description: "Uses this school’s name, logo & colours from School Settings",
    },
  ],
  results: [
    { id: "default", label: "School result format", description: "Internal exam report cards" },
    { id: "gseb", label: "GSEB-style marks sheet", description: "Board-style marks register" },
  ],
  board_records: [
    { id: "default", label: "Standard board panel", description: "Board records + analysis" },
    { id: "gseb", label: "GSEB result formats", description: "Result list & exam result sheet" },
  ],
};

export type ModuleFormatMap = Record<ModuleFormatKey, string>;

export const DEFAULT_MODULE_FORMATS: ModuleFormatMap = {
  certificates: "default",
  id_cards: "default",
  results: "default",
  board_records: "default",
};

export function normalizeModuleFormats(raw: unknown): ModuleFormatMap {
  const out: ModuleFormatMap = { ...DEFAULT_MODULE_FORMATS };
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  const obj = raw as Record<string, unknown>;
  for (const key of MODULE_FORMAT_KEYS) {
    const val = obj[key];
    if (typeof val !== "string" || !val.trim()) continue;
    if (key === "certificates") {
      const resolved = resolveCertificatePackId(val);
      if (isKnownCertificatePackId(resolved)) out.certificates = resolved;
      continue;
    }
    const allowed = MODULE_FORMAT_OPTIONS[key].some((o) => o.id === val);
    if (allowed) out[key] = val;
  }
  return out;
}

export const PLAN_PRESETS: Record<string, { label: string; features: SchoolFeatureKey[]; priceHint?: string }> = {
  basic: {
    label: "Basic",
    priceHint: "₹15,000/yr",
    features: ["dashboard", "classes", "students", "scholarship_add", "scholarship_export", "portal_student"],
  },
  standard: {
    label: "Standard",
    priceHint: "₹35,000/yr",
    features: [
      "dashboard", "classes", "students", "staff", "admissions", "results", "attendance", "activities",
      "scholarship_add", "scholarship_import", "scholarship_bulk_submit", "scholarship_auto_apply",
      "scholarship_export",
      "certificates", "id_cards", "portal_teacher", "portal_clerk", "portal_student", "chat",
    ],
  },
  premium: {
    label: "Premium",
    priceHint: "₹55,000/yr",
    features: SCHOOL_FEATURE_KEYS.filter((k) => k !== "portal_ca") as SchoolFeatureKey[],
  },
  enterprise: {
    label: "Enterprise",
    priceHint: "Custom",
    features: [...SCHOOL_FEATURE_KEYS],
  },
};

export const SCHOOL_TYPES = ["Primary", "Secondary", "Higher Secondary", "K-12", "College", "Other"] as const;
export const PAYMENT_METHODS = ["cash", "bank_transfer", "upi", "cheque", "other"] as const;
export const PAYMENT_STATUSES = ["pending", "partial", "paid", "overdue"] as const;

export function normalizeFeatureList(features: unknown): SchoolFeatureKey[] {
  if (!Array.isArray(features)) return [...PLAN_PRESETS.standard.features];
  const list = features.filter((f): f is SchoolFeatureKey =>
    typeof f === "string" && SCHOOL_FEATURE_KEYS.includes(f as SchoolFeatureKey)
  );
  // Legacy schools: enable Activities whenever Students module is already on
  if (list.includes("students") && !list.includes("activities")) {
    list.push("activities");
  }
  // Legacy schools: unlock Auto Apply when other scholarship tools are already enabled
  if (
    !list.includes("scholarship_auto_apply") &&
    (list.includes("scholarship_import") ||
      list.includes("scholarship_bulk_submit") ||
      list.includes("scholarship_export") ||
      list.includes("scholarship_add"))
  ) {
    list.push("scholarship_auto_apply");
  }
  return list;
}

/**
 * Resolve what a school may access.
 * - Empty / missing list → plan defaults (never “unlock everything”)
 * - Explicit list → that list (dashboard always kept)
 */
export function resolveEnabledFeatures(
  enabledFeatures: unknown,
  planName?: string | null,
): SchoolFeatureKey[] {
  if (!Array.isArray(enabledFeatures) || enabledFeatures.length === 0) {
    return defaultFeaturesForPlan(planName || "standard");
  }
  const list = normalizeFeatureList(enabledFeatures);
  if (!list.includes("dashboard")) list.unshift("dashboard");
  return list;
}

export function isFeatureEnabled(features: SchoolFeatureKey[], key: SchoolFeatureKey): boolean {
  return features.includes(key);
}

/** Map sidebar href to required feature key */
export function hrefToFeature(href: string): SchoolFeatureKey | null {
  const clean = (href.split("?")[0] || href).split("#")[0] || href;
  const map: Record<string, SchoolFeatureKey> = {
    "/dashboard": "dashboard",
    "/clerk": "dashboard",
    "/classes": "classes",
    "/subjects": "classes",
    "/exams": "results",
    "/exam-seat-numbers": "results",
    "/students": "students",
    "/staff": "staff",
    "/staff/attendance": "staff",
    "/staff/payroll": "staff",
    "/staff/holidays": "staff",
    "/staff/register": "staff",
    "/staff/salary-statement": "staff",
    "/staff/salary-slip": "staff",
    "/staff/salary-ledger": "staff",
    "/staff/income-tax": "staff",
    "/admissions": "admissions",
    "/results": "results",
    "/attendance": "attendance",
    "/activities": "activities",
    "/timetable": "classes",
    "/students/new": "students",
    "/students/roll-numbers": "students",
    "/import": "scholarship_import",
    "/bulk-submit": "scholarship_bulk_submit",
    "/auto-apply": "scholarship_auto_apply",
    "/export": "scholarship_export",
    "/accounting": "accounting",
    "/students/board-records": "board_records",
    "/certificates": "certificates",
    "/id-cards": "id_cards",
    "/exam-id-cards": "id_cards",
    "/chat": "chat",
    "/teacher": "portal_teacher",
    "/teacher/attendance": "attendance",
    "/teacher/timetable": "classes",
    "/teacher/students": "students",
    "/teacher/roll-numbers": "students",
    "/teacher/exam-seat-numbers": "results",
    "/teacher/board-records": "board_records",
    "/teacher/holidays": "staff",
    "/teacher/activities": "activities",
    "/clerk/scholarship": "students",
    "/ca": "portal_ca",
    "/student": "portal_student",
  };
  if (map[clean]) return map[clean];
  // Longest prefix first
  const entries = Object.entries(map).sort((a, b) => b[0].length - a[0].length);
  for (const [path, key] of entries) {
    if (clean === path || clean.startsWith(path + "/")) return key;
  }
  return null;
}

/** Paths that never require a module feature (always allowed when logged in). */
export function isFeatureExemptPath(pathname: string): boolean {
  const p = pathname.split("?")[0] || pathname;
  if (p === "/profile" || p.startsWith("/profile/")) return true;
  if (p === "/letterhead" || p.startsWith("/letterhead/")) return true;
  if (p === "/help" || p.startsWith("/help/")) return true;
  if (p.startsWith("/api/")) return true;
  if (p === "/teacher" || p === "/clerk" || p === "/ca" || p === "/student" || p === "/dashboard" || p === "/admin") {
    return true;
  }
  return false;
}

/** Feature required to open this page (null = no module gate). */
export function pathRequiresFeature(pathname: string): SchoolFeatureKey | null {
  const p = pathname.split("?")[0] || pathname;
  if (isFeatureExemptPath(p)) return null;
  return hrefToFeature(p);
}

export function defaultFeaturesForPlan(plan: string): SchoolFeatureKey[] {
  return PLAN_PRESETS[plan]?.features ?? [...PLAN_PRESETS.standard.features];
}
