import { SENIOR_STREAMS } from "./constants";

export const SECONDARY_DIVISIONS = ["A", "B", "C", "D", "E"] as const;

/** High school standards this portal manages (not only board 10/12). */
export const MANAGE_STANDARDS = ["9", "10", "11", "12"] as const;

/** Songadh Primary · DISE 24261004403 */
export const PRIMARY_LOWER_STANDARDS = ["1", "2", "3", "4", "5"] as const;

/** Songadh Upper Primary · DISE 24261004404 */
export const PRIMARY_UPPER_STANDARDS = ["6", "7", "8"] as const;

/**
 * Import / class dropdown standards for a school code (or UDISE).
 * 24261004403 → 1–5 · 24261004404 → 6–8 · 24261004405 → 9–12
 */
export function importStandardsForSchoolCode(code?: string | null): string[] {
  const c = String(code || "").trim();
  if (c === "24261004403") return [...PRIMARY_LOWER_STANDARDS];
  if (c === "24261004404") return [...PRIMARY_UPPER_STANDARDS];
  if (c === "24261004405") return [...MANAGE_STANDARDS];
  return [...MANAGE_STANDARDS];
}

export function isManageStandard(standard?: string | null): boolean {
  return (MANAGE_STANDARDS as readonly string[]).includes(String(standard || "").trim());
}

export function sortStandards(standards: string[]): string[] {
  return [...new Set(standards.map((s) => String(s || "").trim()).filter(Boolean))].sort((a, b) => {
    const na = Number.parseInt(a, 10);
    const nb = Number.parseInt(b, 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    return a.localeCompare(b, undefined, { numeric: true });
  });
}

export { SENIOR_STREAMS };

export interface ClassSeed {
  standard: string;
  section: string;
  stream: string;
  name: string;
}

export function buildClassName(standard: string, section: string, stream?: string): string {
  if (["11", "12"].includes(standard) && stream) {
    return `Class ${standard} ${stream}-${section}`;
  }
  return `Class ${standard}-${section}`;
}

/** Next free division letter: A → B → C … Z (then AA, AB, …) */
export function nextAvailableSection(existingSections: string[]): string {
  const used = new Set(
    existingSections
      .map((s) => String(s || "").trim().toUpperCase())
      .filter(Boolean)
  );

  for (let i = 0; i < 26; i++) {
    const letter = String.fromCharCode(65 + i); // A–Z
    if (!used.has(letter)) return letter;
  }

  // Beyond Z: AA, AB, …
  for (let i = 0; i < 26; i++) {
    for (let j = 0; j < 26; j++) {
      const letter = String.fromCharCode(65 + i) + String.fromCharCode(65 + j);
      if (!used.has(letter)) return letter;
    }
  }

  return "A";
}

/** Sections available for a standard + stream combination (legacy seed helper) */
export function getClassSections(standard: string, stream?: string): string[] {
  if (["9", "10"].includes(standard)) return [...SECONDARY_DIVISIONS];
  if (["11", "12"].includes(standard)) {
    if (stream === "Commerce") return ["A"];
    if (stream === "Arts") return [...SECONDARY_DIVISIONS];
    return [...SECONDARY_DIVISIONS];
  }
  return ["A"];
}

/** All secondary classes (9–12) for school setup */
export function getSecondaryClassSeeds(): ClassSeed[] {
  const seeds: ClassSeed[] = [];

  for (const standard of ["9", "10"]) {
    for (const section of SECONDARY_DIVISIONS) {
      seeds.push({
        standard,
        section,
        stream: "",
        name: buildClassName(standard, section),
      });
    }
  }

  for (const standard of ["11", "12"]) {
    for (const stream of SENIOR_STREAMS) {
      const sections = stream === "Commerce" ? ["A"] : [...SECONDARY_DIVISIONS];
      for (const section of sections) {
        seeds.push({
          standard,
          section,
          stream,
          name: buildClassName(standard, section, stream),
        });
      }
    }
  }

  return seeds;
}

export function classGroupKey(standard: string, stream?: string | null): string {
  if (["11", "12"].includes(standard) && stream) return `${standard}-${stream}`;
  return standard;
}

export function classGroupLabel(standard: string, stream?: string | null): string {
  if (["11", "12"].includes(standard) && stream) return `Std ${standard} — ${stream}`;
  if (standard === "Balvatika") return "Balvatika";
  return `Std ${standard}`;
}

export type ClassGroupOption = {
  key: string;
  standard: string;
  stream: string;
  count: number;
};

/** Unique classes (Std 9, Std 11 Arts…) — not division A/B/C. */
export function uniqueClassGroups(
  classes: Array<{ standard?: string | null; stream?: string | null }>,
): ClassGroupOption[] {
  const map = new Map<string, ClassGroupOption>();
  for (const c of classes) {
    const standard = String(c.standard || "").trim();
    if (!standard) continue;
    const stream = ["11", "12"].includes(standard) ? String(c.stream || "").trim() : "";
    const key = classGroupKey(standard, stream);
    const existing = map.get(key);
    if (existing) existing.count += 1;
    else map.set(key, { key, standard, stream, count: 1 });
  }
  return [...map.values()].sort((a, b) => {
    const na = Number.parseInt(a.standard, 10);
    const nb = Number.parseInt(b.standard, 10);
    if (Number.isFinite(na) && Number.isFinite(nb) && na !== nb) return na - nb;
    if (a.standard !== b.standard) {
      return a.standard.localeCompare(b.standard, undefined, { numeric: true });
    }
    return a.stream.localeCompare(b.stream);
  });
}
