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

/** Fill empty *Gu fields from English (API save / backfill — server only). */
export async function fillStudentGuNames<T extends NameRecord>(row: T): Promise<T> {
  const out: NameRecord = { ...row };
  for (const [enKey, guKey] of GU_NAME_FIELDS) {
    const en = String(out[enKey] ?? "").trim();
    const gu = String(out[guKey] ?? "").trim();
    if (en && !gu) {
      out[guKey] = await englishToGujaratiName(en);
    }
  }
  return out as T;
}
