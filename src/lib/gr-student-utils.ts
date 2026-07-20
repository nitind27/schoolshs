/** Stable placeholder Aadhaar per GR — avoids new student row on every auto-save */
export function stableDraftAadhaarFromGr(grNumber: string): string {
  const digits = grNumber.replace(/\D/g, "");
  const core = (digits || "0").padStart(11, "0").slice(-11);
  return `8${core}`.slice(0, 12);
}

export function grEntryToStudentPartial(entry: {
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  motherName: string;
  birthPlaceJson: string;
  dateOfBirth: string;
  childUidDigits: string;
  standard: string;
  section: string;
  lastSchool: string;
  remarks: string;
}): Record<string, string | undefined> {
  let birthPlaceLines: string[] = [];
  try {
    birthPlaceLines = JSON.parse(entry.birthPlaceJson || "[]");
  } catch {
    birthPlaceLines = [];
  }
  const city = birthPlaceLines[0] || "";
  const district = birthPlaceLines[1] || "";
  const nameParts = entry.firstName.trim().split(/\s+/).filter(Boolean);

  return {
    grNumber: entry.grNumber,
    surname: entry.surname || undefined,
    firstName: nameParts[0] || entry.firstName || undefined,
    middleName: nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined,
    fatherName: entry.fatherName || undefined,
    motherName: entry.motherName || undefined,
    dateOfBirth: entry.dateOfBirth || undefined,
    childUid: entry.childUidDigits || undefined,
    standard: entry.standard || undefined,
    section: entry.section || undefined,
    previousQualification: entry.lastSchool || undefined,
    notes: entry.remarks || undefined,
    currentCity: city || undefined,
    currentDistrict: district || undefined,
    permanentCity: city || undefined,
    permanentDistrict: district || undefined,
  };
}
