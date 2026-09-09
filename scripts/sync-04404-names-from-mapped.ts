/**
 * Sync full names for school 24261004404 from mapped Excel files.
 * - fatherName / motherName / aadhaarName from mapped sheet
 * - middleName = father name when empty (so website full name shows First Father Surname)
 * - Gujarati name fields filled via fillStudentGuNames
 *
 * Run: npx tsx scripts/sync-04404-names-from-mapped.ts
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";
import { transliterateToGujarati } from "../src/lib/gujarati/transliterate-core";

const SCHOOL_CODE = "24261004404";

const FILES = [
  { file: "6-B-mapped.xlsx", standard: "6", section: "B" },
  { file: "7-A-mapped.xlsx", standard: "7", section: "A" },
  { file: "7-B-mapped.xlsx", standard: "7", section: "B" },
  { file: "8-B-mapped.xlsx", standard: "8", section: "B" },
] as const;

const PLACEHOLDER = new Set(["", "—", "-", "–", "NA", "N/A", "na", "n/a", "."]);

function clean(value: unknown): string {
  const s = String(value ?? "").trim().replace(/\s+/g, " ");
  if (!s || PLACEHOLDER.has(s)) return "";
  return s;
}

function pick(r: Record<string, unknown>, ...keys: string[]): string {
  const entries = Object.entries(r);
  const byLower = new Map(entries.map(([k, v]) => [k.toLowerCase().trim(), v]));

  for (const key of keys) {
    const direct = r[key];
    if (clean(direct)) return clean(direct);
    const lower = byLower.get(key.toLowerCase().trim());
    if (clean(lower)) return clean(lower);
  }

  // Exact normalized match only (no fuzzy substring — avoids "Middle Name (Gujarati)")
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();

  const wanted = new Set(keys.map(normalize));
  for (const [k, v] of entries) {
    // Skip Gujarati / Gu labeled columns for English picks
    if (/\b(gujarati|gu)\b/i.test(k)) continue;
    if (wanted.has(normalize(k)) && clean(v)) return clean(v);
  }
  return "";
}

function looksGujarati(s: string): boolean {
  return /[\u0A80-\u0AFF]/.test(s);
}

function buildAadhaarName(parts: {
  firstName: string;
  middleName: string;
  surname: string;
  fatherName: string;
  existing: string;
}): string {
  if (parts.existing) return parts.existing;
  const mid = parts.middleName || parts.fatherName;
  return [parts.firstName, mid, parts.surname].filter(Boolean).join(" ");
}

function isWeakName(value: string | null | undefined): boolean {
  const s = clean(value);
  return !s || PLACEHOLDER.has(s);
}

type ExcelRow = {
  firstName: string;
  middleName: string;
  surname: string;
  aadhaarName: string;
  fatherName: string;
  motherName: string;
  aadhaarNumber: string;
  grNumber: string;
  firstNameGu: string;
  middleNameGu: string;
  surnameGu: string;
  aadhaarNameGu: string;
  fatherNameGu: string;
  motherNameGu: string;
};

function parseMappedRow(r: Record<string, unknown>): ExcelRow {
  return {
    firstName: pick(r, "firstName", "First Name"),
    middleName: pick(r, "middleName", "Middle Name"),
    surname: pick(r, "surname", "Surname"),
    aadhaarName: pick(
      r,
      "aadhaarName",
      "Aadhaar Name",
      "Name (As per Aadhaar)",
      "Name as per Aadhaar",
    ),
    fatherName: pick(r, "fatherName", "Father Name"),
    motherName: pick(r, "motherName", "Mother Name"),
    aadhaarNumber: pick(r, "aadhaarNumber", "Aadhaar Number").replace(/\s/g, ""),
    grNumber: pick(r, "grNumber", "GR Number"),
    firstNameGu: pick(r, "firstNameGu", "First Name (Gujarati)"),
    middleNameGu: pick(r, "middleNameGu", "Middle Name (Gujarati)"),
    surnameGu: pick(r, "surnameGu", "Surname (Gujarati)"),
    aadhaarNameGu: pick(r, "aadhaarNameGu", "Aadhaar Name (Gujarati)"),
    fatherNameGu: pick(r, "fatherNameGu", "Father Name (Gujarati)"),
    motherNameGu: pick(r, "motherNameGu", "Mother Name (Gujarati)"),
  };
}

function ensureGu(en: string, gu?: string | null): string | null {
  const g = clean(gu);
  if (g) return g;
  const e = clean(en);
  if (!e) return null;
  return transliterateToGujarati(e) || null;
}

async function main() {
  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    select: { id: true, name: true, code: true },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found`);
  console.log(`School: ${school.name} (${school.code})\n`);

  let updated = 0;
  let skipped = 0;
  let missing = 0;

  for (const fileMeta of FILES) {
    const filePath = path.join(process.cwd(), "file", fileMeta.file);
    if (!fs.existsSync(filePath)) {
      console.log(`MISSING FILE ${fileMeta.file}`);
      continue;
    }

    const wb = XLSX.read(fs.readFileSync(filePath), { type: "buffer", raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rawRows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    }) as Record<string, unknown>[];
    const rows = rawRows.map(parseMappedRow).filter((r) => r.aadhaarNumber || r.grNumber || r.firstName);

    console.log(
      `=== ${fileMeta.file} → Class ${fileMeta.standard}-${fileMeta.section} (${rows.length} rows) ===`,
    );

    const dbStudents = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        standard: fileMeta.standard,
        section: fileMeta.section,
        status: { not: "archived" },
      },
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        aadhaarName: true,
        fatherName: true,
        motherName: true,
        firstNameGu: true,
        middleNameGu: true,
        surnameGu: true,
        aadhaarNameGu: true,
        fatherNameGu: true,
        motherNameGu: true,
        aadhaarNumber: true,
        grNumber: true,
        accountHolderName: true,
      },
    });

    const byAadhaar = new Map(dbStudents.map((s) => [s.aadhaarNumber.replace(/\s/g, ""), s]));
    const byGr = new Map(
      dbStudents.filter((s) => s.grNumber?.trim()).map((s) => [s.grNumber!.trim(), s]),
    );

    for (const row of rows) {
      const match =
        (row.aadhaarNumber && byAadhaar.get(row.aadhaarNumber)) ||
        (row.grNumber && byGr.get(row.grNumber)) ||
        null;

      if (!match) {
        missing++;
        console.log(
          `  NO MATCH gr=${row.grNumber || "—"} aadhaar=${row.aadhaarNumber || "—"} name=${row.firstName}`,
        );
        continue;
      }

      const fatherName = row.fatherName || (isWeakName(match.fatherName) ? "" : match.fatherName);
      const motherName =
        row.motherName && row.motherName.toUpperCase() !== "NA"
          ? row.motherName
          : isWeakName(match.motherName) || match.motherName === "NA"
            ? row.motherName && row.motherName.toUpperCase() !== "NA"
              ? row.motherName
              : match.motherName
            : match.motherName;

      const firstName = row.firstName || match.firstName;
      const surname = row.surname || match.surname;

      // Prefer English middle; if DB middle was wrongly filled with Gujarati, replace from father
      let middleName = row.middleName;
      if (!middleName && match.middleName && !looksGujarati(match.middleName)) {
        middleName = match.middleName;
      }
      if (!middleName) middleName = fatherName || "";

      const aadhaarName = buildAadhaarName({
        firstName,
        middleName,
        surname,
        fatherName,
        existing: row.aadhaarName || (looksGujarati(match.aadhaarName || "") ? "" : match.aadhaarName) || "",
      });

      const patchBase = {
        firstName: firstName || match.firstName,
        middleName: middleName || null,
        surname: surname || match.surname,
        fatherName: fatherName || match.fatherName,
        motherName:
          motherName && motherName.toUpperCase() !== "NA"
            ? motherName
            : match.motherName && match.motherName !== "—"
              ? match.motherName
              : "—",
        aadhaarName: aadhaarName || match.aadhaarName,
        firstNameGu: row.firstNameGu || match.firstNameGu,
        middleNameGu:
          row.middleNameGu ||
          (match.middleNameGu && !looksGujarati(middleName) ? match.middleNameGu : "") ||
          row.fatherNameGu ||
          match.fatherNameGu,
        surnameGu: row.surnameGu || match.surnameGu,
        fatherNameGu: row.fatherNameGu || match.fatherNameGu,
        motherNameGu: row.motherNameGu || match.motherNameGu,
        aadhaarNameGu: row.aadhaarNameGu || match.aadhaarNameGu,
      };

      // If middle was filled from father, also carry father Gujarati into middle Gu when empty
      if (
        !clean(patchBase.middleNameGu) &&
        clean(patchBase.fatherNameGu) &&
        clean(patchBase.middleName) === clean(patchBase.fatherName)
      ) {
        patchBase.middleNameGu = patchBase.fatherNameGu;
      }

      const withGu = {
        firstName: patchBase.firstName,
        middleName: patchBase.middleName || null,
        surname: patchBase.surname,
        fatherName: patchBase.fatherName,
        motherName: patchBase.motherName,
        aadhaarName: patchBase.aadhaarName,
        firstNameGu: ensureGu(patchBase.firstName, patchBase.firstNameGu),
        middleNameGu: ensureGu(patchBase.middleName, patchBase.middleNameGu),
        surnameGu: ensureGu(patchBase.surname, patchBase.surnameGu),
        fatherNameGu: ensureGu(patchBase.fatherName, patchBase.fatherNameGu),
        motherNameGu: ensureGu(patchBase.motherName, patchBase.motherNameGu),
        aadhaarNameGu: ensureGu(patchBase.aadhaarName, patchBase.aadhaarNameGu),
      };

      // Keep account holder in sync with aadhaar/full name when it was placeholder
      const accountHolderName =
        isWeakName(match.accountHolderName) || match.accountHolderName === match.firstName
          ? String(withGu.aadhaarName || aadhaarName)
          : match.accountHolderName;

      const same =
        match.firstName === withGu.firstName &&
        (match.middleName || "") === (withGu.middleName || "") &&
        match.surname === withGu.surname &&
        match.fatherName === withGu.fatherName &&
        match.motherName === withGu.motherName &&
        match.aadhaarName === withGu.aadhaarName &&
        (match.middleNameGu || "") === (withGu.middleNameGu || "") &&
        (match.fatherNameGu || "") === (withGu.fatherNameGu || "") &&
        (match.aadhaarNameGu || "") === (withGu.aadhaarNameGu || "");

      if (same) {
        skipped++;
        continue;
      }

      await prisma.student.update({
        where: { id: match.id },
        data: {
          firstName: String(withGu.firstName),
          middleName: withGu.middleName ? String(withGu.middleName) : null,
          surname: String(withGu.surname),
          fatherName: String(withGu.fatherName),
          motherName: String(withGu.motherName),
          aadhaarName: String(withGu.aadhaarName),
          firstNameGu: withGu.firstNameGu ? String(withGu.firstNameGu) : null,
          middleNameGu: withGu.middleNameGu ? String(withGu.middleNameGu) : null,
          surnameGu: withGu.surnameGu ? String(withGu.surnameGu) : null,
          fatherNameGu: withGu.fatherNameGu ? String(withGu.fatherNameGu) : null,
          motherNameGu: withGu.motherNameGu ? String(withGu.motherNameGu) : null,
          aadhaarNameGu: withGu.aadhaarNameGu ? String(withGu.aadhaarNameGu) : null,
          accountHolderName,
        },
      });
      updated++;
      console.log(
        `  UPDATED GR ${match.grNumber}: ${withGu.firstName} / mid=${withGu.middleName} / father=${withGu.fatherName} / aadhaar=${withGu.aadhaarName}`,
      );
    }
  }

  console.log(`\nDone. updated=${updated} skipped=${skipped} missing=${missing}`);

  // Verify
  for (const c of FILES) {
    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        standard: c.standard,
        section: c.section,
        status: { not: "archived" },
      },
      select: {
        firstName: true,
        middleName: true,
        surname: true,
        fatherName: true,
        aadhaarName: true,
        middleNameGu: true,
        fatherNameGu: true,
      },
      take: 2,
      orderBy: { grNumber: "asc" },
    });
    const emptyMiddle = await prisma.student.count({
      where: {
        schoolId: school.id,
        standard: c.standard,
        section: c.section,
        status: { not: "archived" },
        OR: [{ middleName: null }, { middleName: "" }],
      },
    });
    console.log(
      `Verify ${c.standard}-${c.section}: emptyMiddle=${emptyMiddle}`,
      JSON.stringify(students, null, 2),
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
