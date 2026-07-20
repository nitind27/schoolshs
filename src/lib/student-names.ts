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
  return [studentDisplayFirstName(s), studentDisplayMiddleName(s), studentDisplaySurname(s)]
    .filter(Boolean)
    .join(" ");
}

/** Short name: first + surname. */
export function studentShortNameGu(s: StudentNameLike): string {
  return [studentDisplayFirstName(s), studentDisplaySurname(s)].filter(Boolean).join(" ");
}
