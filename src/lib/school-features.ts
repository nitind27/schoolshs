/** Panel / feature keys super admin can enable per school */
export const SCHOOL_FEATURE_KEYS = [
  "dashboard",
  "classes",
  "students",
  "staff",
  "admissions",
  "results",
  "attendance",
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
  { key: "scholarship_add", label: "Add Student", group: "Scholarship", path: "/students/new", description: "New scholarship student" },
  { key: "scholarship_import", label: "Bulk Import", group: "Scholarship", path: "/import", description: "CSV/Excel import" },
  { key: "scholarship_bulk_submit", label: "Bulk Submit", group: "Scholarship", path: "/bulk-submit", description: "Bulk DG submission" },
  { key: "scholarship_auto_apply", label: "Auto Apply DG", group: "Scholarship", path: "/auto-apply", description: "Playwright automation" },
  { key: "scholarship_export", label: "Reports & Export", group: "Scholarship", path: "/export", description: "Reports center — Excel, CSV and PDF for all modules" },
  { key: "accounting", label: "Accounting", group: "Administration", path: "/accounting", description: "Books of account" },
  { key: "board_records", label: "Board Records", group: "Administration", path: "/students/board-records", description: "10th/12th records" },
  { key: "certificates", label: "Certificates", group: "Administration", path: "/certificates", description: "Bonafide & certificates" },
  { key: "id_cards", label: "ID Cards", group: "Administration", path: "/id-cards", description: "Student ID cards" },
  { key: "chat", label: "Staff Chat", group: "Communication", path: "/chat", description: "Real-time staff messaging" },
  { key: "portal_teacher", label: "Teacher Portal", group: "Role Portals", path: "/teacher", description: "Teacher login access" },
  { key: "portal_clerk", label: "Clerk Portal", group: "Role Portals", path: "/clerk", description: "Clerk login access" },
  { key: "portal_ca", label: "CA Portal", group: "Role Portals", path: "/ca", description: "Chartered accountant access" },
  { key: "portal_student", label: "Student Portal", group: "Role Portals", path: "/student", description: "Student self-service" },
];

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
      "dashboard", "classes", "students", "staff", "admissions", "results", "attendance",
      "scholarship_add", "scholarship_import", "scholarship_bulk_submit", "scholarship_export",
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
  return features.filter((f): f is SchoolFeatureKey =>
    typeof f === "string" && SCHOOL_FEATURE_KEYS.includes(f as SchoolFeatureKey)
  );
}

export function isFeatureEnabled(features: SchoolFeatureKey[], key: SchoolFeatureKey): boolean {
  return features.includes(key);
}

/** Map sidebar href to required feature key */
export function hrefToFeature(href: string): SchoolFeatureKey | null {
  const map: Record<string, SchoolFeatureKey> = {
    "/dashboard": "dashboard",
    "/classes": "classes",
    "/students": "students",
    "/staff": "staff",
    "/staff/attendance": "staff",
    "/staff/payroll": "staff",
    "/admissions": "admissions",
    "/results": "results",
    "/attendance": "attendance",
    "/timetable": "classes",
    "/students/new": "students",
    "/import": "scholarship_import",
    "/bulk-submit": "scholarship_bulk_submit",
    "/auto-apply": "scholarship_auto_apply",
    "/export": "scholarship_export",
    "/accounting": "accounting",
    "/students/board-records": "board_records",
    "/certificates": "certificates",
    "/id-cards": "id_cards",
    "/chat": "chat",
  };
  if (map[href]) return map[href];
  for (const [path, key] of Object.entries(map)) {
    if (href.startsWith(path + "/") || href === path) return key;
  }
  return null;
}

export function defaultFeaturesForPlan(plan: string): SchoolFeatureKey[] {
  return PLAN_PRESETS[plan]?.features ?? [...PLAN_PRESETS.standard.features];
}
