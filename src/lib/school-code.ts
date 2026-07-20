import type { PrismaClient } from "@/generated/prisma/client";

/** Common words stripped when deriving code from school name */
const STOP_WORDS = new Set([
  "school",
  "schools",
  "high",
  "higher",
  "secondary",
  "primary",
  "upper",
  "lower",
  "middle",
  "english",
  "gujarati",
  "hindi",
  "medium",
  "public",
  "private",
  "national",
  "international",
  "vidyalaya",
  "vidhyalaya",
  "vidhyalay",
  "shala",
  "shikshan",
  "sanstha",
  "trust",
  "society",
  "sarvajanik",
  "sarvjanik",
  "shri",
  "shree",
  "smt",
  "dr",
  "the",
  "and",
  "of",
  "at",
  "in",
  "for",
  "fort",
  "new",
  "old",
  "campus",
  "branch",
  "nagar",
  "colony",
  "run",
  "education",
  "educational",
  "institute",
  "academy",
]);

const CODE_BASE_MIN = 3;
const CODE_BASE_MAX = 9;

export function cleanSchoolCodeToken(value: string | null | undefined): string {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function tokenizeSchoolName(name: string): string[] {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= CODE_BASE_MIN && !STOP_WORDS.has(t.toLowerCase()));
}

/**
 * Derive short uppercase base from school name / location.
 * e.g. "Sarvjanik Upper Primary School Songadh" → SONGADH
 */
export function deriveSchoolCodeBase(
  name: string,
  opts?: { city?: string | null; taluka?: string | null; district?: string | null },
): string {
  const fromName = deriveBaseFromName(name);

  for (const loc of [opts?.city, opts?.taluka]) {
    const cleaned = cleanSchoolCodeToken(loc);
    if (cleaned.length < CODE_BASE_MIN) continue;
    const nameUpper = name.toUpperCase();
    if (nameUpper.includes(cleaned) || fromName.length < 4 || fromName === "SCHOOL") {
      return cleaned.slice(0, CODE_BASE_MAX);
    }
  }

  if (fromName.length >= CODE_BASE_MIN && fromName !== "SCHOOL") {
    return fromName;
  }

  const district = cleanSchoolCodeToken(opts?.district);
  if (district.length >= CODE_BASE_MIN) {
    return district.slice(0, CODE_BASE_MAX);
  }

  return fromName;
}

function deriveBaseFromName(name: string): string {
  const tokens = tokenizeSchoolName(name);
  if (tokens.length === 0) {
    const fallback = cleanSchoolCodeToken(name);
    return (fallback.slice(0, CODE_BASE_MAX) || "SCHOOL").slice(0, CODE_BASE_MAX);
  }

  const last = tokens[tokens.length - 1]!;
  if (last.length >= 4) {
    return last.slice(0, CODE_BASE_MAX);
  }

  const longest = tokens.reduce((a, b) => (a.length >= b.length ? a : b));
  return longest.slice(0, CODE_BASE_MAX);
}

export function formatSchoolCode(base: string, sequence: number): string {
  const safeBase = cleanSchoolCodeToken(base).slice(0, CODE_BASE_MAX) || "SCHOOL";
  const n = Math.max(1, Math.min(999, sequence));
  return `${safeBase}${String(n).padStart(3, "0")}`;
}

type SchoolCodeLookup = Pick<PrismaClient, "school">;

/** Next unused code: SONGADH001, SONGADH002, … */
export async function generateUniqueSchoolCode(
  prisma: SchoolCodeLookup,
  name: string,
  opts?: { city?: string | null; taluka?: string | null; district?: string | null },
): Promise<string> {
  const base = deriveSchoolCodeBase(name, opts);
  for (let n = 1; n <= 999; n++) {
    const code = formatSchoolCode(base, n);
    const exists = await prisma.school.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return formatSchoolCode(base, Date.now() % 1000);
}

export async function suggestSchoolCode(
  prisma: SchoolCodeLookup,
  name: string,
  opts?: { city?: string | null; taluka?: string | null; district?: string | null },
) {
  const base = deriveSchoolCodeBase(name, opts);
  let sequence = 1;
  for (let n = 1; n <= 999; n++) {
    const code = formatSchoolCode(base, n);
    const exists = await prisma.school.findUnique({ where: { code } });
    if (!exists) {
      sequence = n;
      return { code, base, sequence };
    }
  }
  const code = formatSchoolCode(base, Date.now() % 1000);
  return { code, base, sequence: Date.now() % 1000 };
}
