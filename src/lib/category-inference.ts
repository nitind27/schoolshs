/** Digital Gujarat scholarship categories + surname/caste inference (Gujarat gov lists) */

export type DgCategory = "SC" | "ST" | "OBC" | "SEBC" | "EWS" | "Open" | "Minority" | "NTDNT";

export interface CategoryMeta {
  id: DgCategory;
  label: string;
  labelHi: string;
  color: string;
  bgColor: string;
  borderColor: string;
  incomeLimit: string;
  portal: string;
}

export const DG_CATEGORIES: CategoryMeta[] = [
  { id: "SC", label: "Scheduled Caste (SC)", labelHi: "अनुसूचित जाति (SC)", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200", incomeLimit: "₹2.5 Lakh", portal: "SJED / Citizen" },
  { id: "ST", label: "Scheduled Tribe (ST)", labelHi: "अनुसूचित जनजाति (ST)", color: "text-indigo-700", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", incomeLimit: "₹2.5 Lakh", portal: "SJED / Citizen" },
  { id: "OBC", label: "Other Backward Class (OBC)", labelHi: "OBC", color: "text-orange-700", bgColor: "bg-orange-50", borderColor: "border-orange-200", incomeLimit: "₹1.5 Lakh", portal: "Citizen" },
  { id: "SEBC", label: "SEBC / EBC", labelHi: "SEBC / EBC", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", incomeLimit: "₹1.5 Lakh", portal: "Citizen" },
  { id: "EWS", label: "Economically Weaker (EWS)", labelHi: "EWS", color: "text-teal-700", bgColor: "bg-teal-50", borderColor: "border-teal-200", incomeLimit: "₹2 Lakh", portal: "Citizen" },
  { id: "Open", label: "General / Open", labelHi: "General (Open)", color: "text-slate-700", bgColor: "bg-slate-50", borderColor: "border-slate-200", incomeLimit: "—", portal: "MYSY" },
  { id: "Minority", label: "Minority", labelHi: "Minority", color: "text-emerald-700", bgColor: "bg-emerald-50", borderColor: "border-emerald-200", incomeLimit: "₹2.5 Lakh", portal: "Citizen" },
  { id: "NTDNT", label: "NT / DNT", labelHi: "Nomadic / De-notified", color: "text-rose-700", bgColor: "bg-rose-50", borderColor: "border-rose-200", incomeLimit: "₹2 Lakh", portal: "Citizen" },
];

export const ALL_CATEGORY_IDS = DG_CATEGORIES.map((c) => c.id);

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Gujarat SC castes/surnames (sje.gujarat.gov.in SC list) */
const SC_PATTERNS = [
  "chamar", "rohit", "rohidas", "valmiki", "meghwal", "meghval", "bhambi", "bhambhi",
  "vankar", "mahyavansi", "dhed", "balahi", "balai", "mochi", "bhangi", "mehtar",
  "chambhar", "madar", "mochigar", "holaya", "holar", "pasi", "mang", "matang",
  "garoda", "garo", "turi", "tirgar", "dhor", "kakkayya", "chikwa", "chikvi",
  "macwan", "makwana", "sadhu", "bawa", "antyaj", "khalpa", "nadia", "hadi",
];

/** Gujarat ST castes/surnames */
const ST_PATTERNS = [
  "vasava", "gamit", "chaudhari", "chaudhary", "bhil", "dubla", "naik", "naika",
  "tadvi", "padvi", "damor", "kathodi", "kolcha", "kolcha", "valvi", "dodia",
  "halpati", "talavia", "machhi", "kukna", "kunbi", "barda", "varli", "kokna",
  "dhodiya", "dhodia", "bawcha", "koli", "garasia", "bhagalia", "patelia",
];

/** OBC (Central + Gujarat OBC list) */
const OBC_PATTERNS = [
  "thakor", "koli", "kathi", "bharwad", "darbar", "rabari", "mali", "kumbhar",
  "lohar", "suthar", "turi", "barot", "charan", "gadhvi", "ghanchi", "mansuri",
  "julaha", "khatik", "kasai", "bhoi", "kharwa", "kharva", "darji", "sutar",
  "kachhi", "kachhi", "kachhia", "kachhiya", "yadav", "ahir", "jadeja", "solanki",
  "gohel", "gohil", "zala", "makwana", "rathod", "rathore", "parmar", "chauhan",
  "rajput", "kshatriya", "koli", "kori", "bhoir", "bhoi", "koli",
];

/** SEBC (Gujarat state SEBC list) */
const SEBC_PATTERNS = [
  "patel", "leuva", "kadva", "ani", "desai", "modi", "pancholi", "kachhia",
  "darji", "bhandari", "kayasth", "gandharv", "sanghar", "kathi", "rajgor",
  "kurmi", "kurmi", "agri", "koli", "darbar", "rabari", "bharwad",
];

/** General / Open — common upper-caste surnames (suggestion only) */
const OPEN_PATTERNS = [
  "shah", "mehta", "amin", "bhatt", "trivedi", "pandya", "joshi", "acharya",
  "shukla", "iyer", "iyengar", "brahmbhatt", "purohit", "dave", "parikh",
  "doshi", "dave", "naik", "kapadia", "dalal", "sanghvi", "sanghavi",
];

/** Minority — often from religion + surname context */
const MINORITY_PATTERNS = [
  "sheikh", "pathan", "khan", "ansari", "memon", "bohra", "syed", "mulla",
  "qureshi", "siddiqui", "malik", "shaikh", "mansuri", "bafan", "ghanchi",
];

/** NT/DNT */
const NTDNT_PATTERNS = [
  "bhamta", "pardhi", "gondhali", "phasepardhi", "kathodi", "dhangar", "gadiya",
  "lohar", "gadiya lohar", "vanjara", "bavri", "baori", "dhed", "sansi",
];

function matchAny(text: string, patterns: string[]): boolean {
  const t = norm(text);
  return patterns.some((p) => t.includes(p) || t === p);
}

export interface CategoryInference {
  category: DgCategory;
  confidence: "high" | "medium" | "low";
  source: "caste" | "surname" | "religion" | "stored" | "default";
  matched?: string;
}

export function inferCategoryFromFields(input: {
  surname?: string | null;
  caste?: string | null;
  religion?: string | null;
  storedCategory?: string | null;
}): CategoryInference {
  const stored = normalizeCategory(input.storedCategory || "");
  if (stored) {
    return { category: stored, confidence: "high", source: "stored" };
  }

  const caste = input.caste || "";
  const surname = input.surname || "";
  const religion = input.religion || "";

  if (matchAny(caste, SC_PATTERNS)) return { category: "SC", confidence: "high", source: "caste", matched: caste };
  if (matchAny(caste, ST_PATTERNS)) return { category: "ST", confidence: "high", source: "caste", matched: caste };
  if (matchAny(caste, OBC_PATTERNS)) return { category: "OBC", confidence: "high", source: "caste", matched: caste };
  if (matchAny(caste, SEBC_PATTERNS)) return { category: "SEBC", confidence: "high", source: "caste", matched: caste };
  if (matchAny(caste, NTDNT_PATTERNS)) return { category: "NTDNT", confidence: "high", source: "caste", matched: caste };

  if (matchAny(surname, SC_PATTERNS)) return { category: "SC", confidence: "medium", source: "surname", matched: surname };
  if (matchAny(surname, ST_PATTERNS)) return { category: "ST", confidence: "medium", source: "surname", matched: surname };
  if (matchAny(surname, NTDNT_PATTERNS)) return { category: "NTDNT", confidence: "medium", source: "surname", matched: surname };
  if (matchAny(surname, MINORITY_PATTERNS)) return { category: "Minority", confidence: "medium", source: "surname", matched: surname };
  if (/muslim|christian|sikh|buddhist|jain|parsi/i.test(religion)) {
    return { category: "Minority", confidence: "medium", source: "religion", matched: religion };
  }
  if (matchAny(surname, OBC_PATTERNS)) return { category: "OBC", confidence: "medium", source: "surname", matched: surname };
  if (matchAny(surname, SEBC_PATTERNS)) return { category: "SEBC", confidence: "medium", source: "surname", matched: surname };
  if (matchAny(surname, OPEN_PATTERNS)) return { category: "Open", confidence: "low", source: "surname", matched: surname };

  return { category: "Open", confidence: "low", source: "default" };
}

export function normalizeCategory(raw: string): DgCategory | null {
  const c = raw.trim().toUpperCase();
  if (c === "GENERAL" || c === "GEN" || c === "OPEN") return "Open";
  if (c === "EBC" || c === "SEBC/EBC") return "SEBC";
  if (c === "NT" || c === "DNT" || c === "NT/DNT") return "NTDNT";
  if (ALL_CATEGORY_IDS.includes(c as DgCategory)) return c as DgCategory;
  if (c.includes("SC")) return "SC";
  if (c.includes("ST")) return "ST";
  if (c.includes("OBC")) return "OBC";
  if (c.includes("SEBC")) return "SEBC";
  if (c.includes("EWS")) return "EWS";
  if (c.includes("MINORITY")) return "Minority";
  return null;
}

export function getCategoryMeta(id: string): CategoryMeta {
  return DG_CATEGORIES.find((c) => c.id === id) || DG_CATEGORIES.find((c) => c.id === "Open")!;
}

export function effectiveCategory(student: {
  category?: string | null;
  surname?: string | null;
  caste?: string | null;
  religion?: string | null;
}): DgCategory {
  const stored = normalizeCategory(student.category || "");
  if (stored) return stored;
  return inferCategoryFromFields(student).category;
}
