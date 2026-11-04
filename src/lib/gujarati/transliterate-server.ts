import "server-only";

import { bilingualNamePair, isGujaratiScript } from "@/lib/gujarati/transliterate-core";
import { translateEnglishNameParts } from "@/lib/gujarati/google-translate";
import {
  normalizeNamePartEn,
  normalizeNamePartGu,
  normalizeStudentNameFields,
} from "@/lib/student-name-normalize";

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
  if (google && isPureGujaratiName(google)) return normalizeNamePartGu(google);
  // Avoid local bhashaime fallback for DB writes — it can emit Latin junk into Gu fields.
  const local = bilingualNamePair(en).gu;
  return isPureGujaratiName(local) ? normalizeNamePartGu(local) : "";
}

const LATIN_RE = /[A-Za-z]/;

function isPureGujaratiName(value: string): boolean {
  const gu = value.trim();
  if (!gu) return false;
  if (!isGujaratiScript(gu)) return false;
  if (LATIN_RE.test(gu)) return false;
  return true;
}

async function fillGuNamePairs<T extends NameRecord>(
  row: T,
  pairs: readonly (readonly [string, string])[],
): Promise<T> {
  const normalized = normalizeStudentNameFields(row as T & Record<string, unknown>);
  const out: NameRecord = { ...normalized };
  for (const [enKey, guKey] of pairs) {
    const en = normalizeNamePartEn(String(out[enKey] ?? ""));
    out[enKey] = en || out[enKey];
    const gu = String(out[guKey] ?? "").trim();
    // Fill empty Gu, or replace English / mixed-script junk wrongly stored in Gu fields
    if (en && !isPureGujaratiName(gu)) {
      out[guKey] = await englishToGujaratiName(en);
    } else if (gu) {
      out[guKey] = normalizeNamePartGu(gu);
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
