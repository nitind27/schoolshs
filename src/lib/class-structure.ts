import { SENIOR_STREAMS } from "./constants";

export const SECONDARY_DIVISIONS = ["A", "B", "C", "D", "E"] as const;

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
