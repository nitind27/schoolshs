export type NormalizedGender = "Male" | "Female" | "Other";

export function normalizeGender(raw?: string | null): NormalizedGender {
  const g = (raw || "").trim().toLowerCase();
  if (!g) return "Other";
  if (g === "m" || g === "male" || g.includes("boy") || g === "1") return "Male";
  if (g === "f" || g === "female" || g.includes("girl") || g === "2") return "Female";
  if (g === "male") return "Male";
  if (g === "female") return "Female";
  return "Other";
}

export function genderShort(g: NormalizedGender | string): "M" | "F" | "O" {
  const n = normalizeGender(g);
  if (n === "Male") return "M";
  if (n === "Female") return "F";
  return "O";
}

export function genderLabelHi(g: NormalizedGender | string): string {
  const n = normalizeGender(g);
  if (n === "Male") return "Boys (M)";
  if (n === "Female") return "Girls (F)";
  return "Other";
}

export interface GenderCounts {
  male: number;
  female: number;
  other: number;
  total: number;
}

export function emptyGenderCounts(): GenderCounts {
  return { male: 0, female: 0, other: 0, total: 0 };
}

export function addToGenderCounts(counts: GenderCounts, gender?: string | null): GenderCounts {
  const n = normalizeGender(gender);
  if (n === "Male") counts.male += 1;
  else if (n === "Female") counts.female += 1;
  else counts.other += 1;
  counts.total += 1;
  return counts;
}

export function matchesGenderFilter(gender: string | null | undefined, filter: string): boolean {
  if (!filter || filter === "all" || filter === "total") return true;
  const n = normalizeGender(gender);
  const f = filter.toLowerCase();
  if (f === "male" || f === "m" || f === "boys") return n === "Male";
  if (f === "female" || f === "f" || f === "girls") return n === "Female";
  if (f === "other" || f === "o") return n === "Other";
  return normalizeGender(filter) === n;
}

export const GENDER_FILTER_OPTIONS = [
  { value: "all", label: "All (Total)" },
  { value: "Male", label: "Boys (M)" },
  { value: "Female", label: "Girls (F)" },
  { value: "Other", label: "Other (O)" },
] as const;
