import { transliterateToGujarati } from "@/lib/gujarati/transliterate-core";

export type StudentNameLike = {
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  fatherName?: string | null;
  fatherNameGu?: string | null;
  motherName?: string | null;
  motherNameGu?: string | null;
  guardianName?: string | null;
  guardianNameGu?: string | null;
  aadhaarName?: string | null;
  aadhaarNameGu?: string | null;
};

function isWeakPart(value: string | null | undefined): boolean {
  const s = String(value ?? "").trim();
  if (!s) return true;
  const upper = s.toUpperCase();
  return (
    s === "—" ||
    s === "-" ||
    s === "–" ||
    upper === "NA" ||
    upper === "N/A" ||
    upper === "."
  );
}

function pickGu(gu: string | null | undefined, en: string | null | undefined): string {
  const g = gu?.trim();
  if (g && !isWeakPart(g)) return g;
  const e = en?.trim();
  return e && !isWeakPart(e) ? e : "";
}

function gujaratiNamePart(
  gu: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const storedGujarati = gu?.trim();
  if (storedGujarati && !isWeakPart(storedGujarati)) return storedGujarati;
  const en = fallback?.trim();
  if (!en || isWeakPart(en)) return "";
  return transliterateToGujarati(en);
}

/** Middle for display — use father name when middle is empty (First Father Surname). */
function resolveMiddleParts(s: StudentNameLike): {
  middleEn: string | null | undefined;
  middleGu: string | null | undefined;
} {
  if (!isWeakPart(s.middleName) || !isWeakPart(s.middleNameGu)) {
    return { middleEn: s.middleName, middleGu: s.middleNameGu };
  }
  if (!isWeakPart(s.fatherName) || !isWeakPart(s.fatherNameGu)) {
    return { middleEn: s.fatherName, middleGu: s.fatherNameGu };
  }
  return { middleEn: null, middleGu: null };
}

export function studentDisplayFirstName(s: StudentNameLike): string {
  return pickGu(s.firstNameGu, s.firstName);
}

export function studentDisplayMiddleName(s: StudentNameLike): string {
  const { middleEn, middleGu } = resolveMiddleParts(s);
  return pickGu(middleGu, middleEn);
}

export function studentDisplaySurname(s: StudentNameLike): string {
  return pickGu(s.surnameGu, s.surname);
}

export function studentDisplayFatherName(s: StudentNameLike): string {
  return pickGu(s.fatherNameGu, s.fatherName);
}

export function studentDisplayMotherName(s: StudentNameLike): string {
  return pickGu(s.motherNameGu, s.motherName);
}

export function studentDisplayGuardianName(s: StudentNameLike): string {
  return pickGu(s.guardianNameGu, s.guardianName);
}

export function studentDisplayAadhaarName(s: StudentNameLike): string {
  return pickGu(s.aadhaarNameGu, s.aadhaarName);
}

/** English full name: First + Middle/Father + Surname */
export function studentFullNameEn(s: StudentNameLike): string {
  const { middleEn } = resolveMiddleParts(s);
  return [s.firstName, middleEn, s.surname]
    .map((p) => String(p || "").trim())
    .filter((p) => p && !isWeakPart(p))
    .join(" ");
}

/** Full name in Gujarati for lists, certificates, results. */
export function studentFullNameGu(s: StudentNameLike): string {
  const { middleEn, middleGu } = resolveMiddleParts(s);
  const hasGujaratiParts = Boolean(
    (s.firstNameGu?.trim() && !isWeakPart(s.firstNameGu)) ||
      (middleGu?.trim() && !isWeakPart(middleGu)) ||
      (s.surnameGu?.trim() && !isWeakPart(s.surnameGu)),
  );
  const officialGujaratiName = s.aadhaarNameGu?.trim();

  if (!hasGujaratiParts && officialGujaratiName && !isWeakPart(officialGujaratiName)) {
    return officialGujaratiName;
  }

  return [
    gujaratiNamePart(s.firstNameGu, s.firstName),
    gujaratiNamePart(middleGu, middleEn),
    gujaratiNamePart(s.surnameGu, s.surname),
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Display name for every student list / picker / search result.
 * Always full name (First + Father/Middle + Surname) — same as studentFullNameGu.
 */
export function studentShortNameGu(s: StudentNameLike): string {
  return studentFullNameGu(s) || studentFullNameEn(s);
}

/** Preferred UI label: Gujarati full name, else English full name. */
export function studentListName(s: StudentNameLike): string {
  return studentFullNameGu(s) || studentFullNameEn(s) || "—";
}
