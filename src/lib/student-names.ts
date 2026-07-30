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

function pickGu(gu: string | null | undefined, en: string | null | undefined): string {
  const g = gu?.trim();
  if (g) return g;
  return en?.trim() || "";
}

function gujaratiNamePart(
  gu: string | null | undefined,
  fallback: string | null | undefined,
): string {
  const storedGujarati = gu?.trim();
  if (storedGujarati) return storedGujarati;
  return transliterateToGujarati(fallback?.trim() || "");
}

export function studentDisplayFirstName(s: StudentNameLike): string {
  return pickGu(s.firstNameGu, s.firstName);
}

export function studentDisplayMiddleName(s: StudentNameLike): string {
  return pickGu(s.middleNameGu, s.middleName);
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

/** Full name in Gujarati for lists, certificates, results. */
export function studentFullNameGu(s: StudentNameLike): string {
  const hasGujaratiParts = Boolean(
    s.firstNameGu?.trim() || s.middleNameGu?.trim() || s.surnameGu?.trim(),
  );
  const officialGujaratiName = s.aadhaarNameGu?.trim();

  if (!hasGujaratiParts && officialGujaratiName) {
    return officialGujaratiName;
  }

  return [
    gujaratiNamePart(s.firstNameGu, s.firstName),
    gujaratiNamePart(s.middleNameGu, s.middleName),
    gujaratiNamePart(s.surnameGu, s.surname),
  ]
    .filter(Boolean)
    .join(" ");
}

/** Short name: first + surname. */
export function studentShortNameGu(s: StudentNameLike): string {
  return [
    gujaratiNamePart(s.firstNameGu, s.firstName),
    gujaratiNamePart(s.surnameGu, s.surname),
  ]
    .filter(Boolean)
    .join(" ");
}
