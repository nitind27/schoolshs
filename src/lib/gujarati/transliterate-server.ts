import "server-only";

import { bilingualNamePair } from "@/lib/gujarati/transliterate-core";
import { translateEnglishNameParts } from "@/lib/gujarati/google-translate";

export { isGujaratiScript, transliterateToGujarati, bilingualNamePair } from "@/lib/gujarati/transliterate-core";

const GU_NAME_FIELDS = [
  ["firstName", "firstNameGu"],
  ["middleName", "middleNameGu"],
  ["surname", "surnameGu"],
  ["aadhaarName", "aadhaarNameGu"],
  ["motherName", "motherNameGu"],
  ["fatherName", "fatherNameGu"],
  ["guardianName", "guardianNameGu"],
] as const;

type NameRecord = Record<string, unknown>;

async function englishToGujaratiName(en: string): Promise<string> {
  const google = await translateEnglishNameParts(en);
  if (google) return google;
  return bilingualNamePair(en).gu;
}

async function fillGuNamePairs<T extends NameRecord>(
  row: T,
  pairs: readonly (readonly [string, string])[],
): Promise<T> {
  const out: NameRecord = { ...row };
  for (const [enKey, guKey] of pairs) {
    const en = String(out[enKey] ?? "").trim();
    const gu = String(out[guKey] ?? "").trim();
    if (en && !gu) {
      out[guKey] = await englishToGujaratiName(en);
    }
  }
  return out as T;
}

/** Fill empty *Gu fields from English (API save / backfill — server only). */
export async function fillStudentGuNames<T extends NameRecord>(row: T): Promise<T> {
  return fillGuNamePairs(row, GU_NAME_FIELDS);
}

const STAFF_GU_NAME_FIELDS = [
  ["firstName", "firstNameGu"],
  ["lastName", "lastNameGu"],
] as const;

/** Fill empty staff Gujarati name fields from English (create / update). */
export async function fillStaffGuNames<T extends NameRecord>(row: T): Promise<T> {
  return fillGuNamePairs(row, STAFF_GU_NAME_FIELDS);
}
