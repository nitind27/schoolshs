/**
 * Import archika students into DB for school 24261004405.
 * Source: file/archika-students-import-24261004405.xlsx
 *
 * Run: npx tsx scripts/import-archika.ts
 */
import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { prisma } from "../src/lib/db";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "../src/lib/student-write";
import { applyStudentPlacement } from "../src/lib/student-placement";
import { seedClassSubjects } from "../src/lib/class-subjects";
import {
  applyColumnMap,
  autoMapColumns,
  fillImportDefaults,
} from "../src/lib/import/student-import";
import { normalizeStudentRow, validateStudent } from "../src/lib/validation";
import { buildClassName } from "../src/lib/class-structure";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "../src/lib/student-account";

const SCHOOL_CODE = "24261004405";
const SOURCE = path.join(process.cwd(), "file", `archika-students-import-${SCHOOL_CODE}.xlsx`);

function digits(value: string): string {
  return String(value || "").replace(/\D/g, "");
}

function placeholderAadhaar(gr: string, roll: string): string {
  const base = digits(gr || roll).padStart(10, "0").slice(-10);
  return `93${base}`;
}

async function ensureClass(
  schoolId: string,
  standard: string,
  section: string,
  academicYear: string,
  institutionName: string,
  institutionDistrict: string,
) {
  let cls = await prisma.schoolClass.findFirst({
    where: { schoolId, standard, section, academicYear },
  });
  if (!cls) {
    cls = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: buildClassName(standard, section),
        standard,
        section,
        stream: "",
        academicYear,
        institutionName,
        institutionDistrict,
      },
    });
    await seedClassSubjects(cls.id, standard, "");
    console.log(`Created class ${standard}-${section}`, cls.id);
  }
  return cls;
}

async function main() {
  if (!fs.existsSync(SOURCE)) {
    throw new Error(`Missing ${SOURCE} — run: npx tsx scripts/convert-archika-excel.ts`);
  }

  const wb = XLSX.readFile(SOURCE);
  const ws = wb.Sheets.Students;
  if (!ws) throw new Error("Students sheet missing");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
  if (!rawRows.length) throw new Error("No rows in Students sheet");

  const headers = Object.keys(rawRows[0]!);
  const columnMap = autoMapColumns(headers);
  const mapped = applyColumnMap(rawRows, columnMap);

  console.log(`Parsed ${mapped.length} rows from ${path.basename(SOURCE)}`);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    include: { settings: true },
  });
  if (!school) throw new Error(`School ${SCHOOL_CODE} not found in database`);

  const academicYear = school.settings?.academicYear || "2025-26";
  const institutionName =
    school.settings?.schoolName || school.name || "SARVAJANIK HIGH SCHOOL SONGADH";
  const institutionDistrict = school.district || "Tapi";

  const classCache = new Map<string, Awaited<ReturnType<typeof ensureClass>>>();
  async function getClass(standard: string, section: string) {
    const key = `${standard}-${section}`;
    if (!classCache.has(key)) {
      classCache.set(
        key,
        await ensureClass(
          school!.id,
          standard,
          section,
          academicYear,
          institutionName,
          institutionDistrict,
        ),
      );
    }
    return classCache.get(key)!;
  }

  const beforeCount = await prisma.student.count({ where: { schoolId: school.id } });
  console.log(`School: ${school.name} (${school.code}) — students before: ${beforeCount}`);

  const stats = { created: 0, updated: 0, failed: 0, draft: 0 };
  const errors: { row: number; name: string; errors: string[] }[] = [];

  for (let i = 0; i < mapped.length; i++) {
    const raw = mapped[i]!;
    const standard = String(raw.standard || "").trim();
    const section = String(raw.section || "").trim();
    if (!standard || !section) {
      stats.failed++;
      errors.push({ row: i + 1, name: String(raw.aadhaarName || ""), errors: ["Missing standard/section"] });
      continue;
    }

    let aadhaar = digits(String(raw.aadhaarNumber || ""));
    if (aadhaar.length !== 12) {
      aadhaar = placeholderAadhaar(String(raw.grNumber || ""), String(raw.rollNumber || String(i + 1)));
    }

    const withSchool = fillImportDefaults({
      ...raw,
      aadhaarNumber: aadhaar,
      institutionName,
      institutionDistrict,
      financialYear: academicYear,
      mobileNumber: digits(String(raw.mobileNumber || "")).slice(-10) || "0000000000",
      currentAddress: String(raw.currentAddress || "").trim() || "Songadh, Tapi, Gujarat",
      currentDistrict: String(raw.currentDistrict || "").trim() || "Tapi",
      currentCity: String(raw.currentCity || "").trim() || "Songadh",
      currentPincode: String(raw.currentPincode || "").trim() || "394670",
      permanentAddress: String(raw.permanentAddress || "").trim() || "Songadh, Tapi, Gujarat",
      permanentDistrict: String(raw.permanentDistrict || "").trim() || "Tapi",
      permanentCity: String(raw.permanentCity || "").trim() || "Songadh",
      permanentPincode: String(raw.permanentPincode || "").trim() || "394670",
      fatherName: String(raw.fatherName || "").trim() || "NA",
      motherName: String(raw.motherName || "").trim() || "NA",
    });

    const data = normalizeStudentRow(withSchool);
    const cls = await getClass(standard, section);
    applyStudentPlacement(data as Record<string, unknown>, {
      id: cls.id,
      standard: cls.standard,
      section: cls.section,
      academicYear: cls.academicYear,
      institutionName: cls.institutionName,
      institutionDistrict: cls.institutionDistrict,
    });

    const validationErrors = validateStudent(data);
    const name =
      String(data.aadhaarName || "") ||
      [data.firstName, data.surname].filter(Boolean).join(" ");

    try {
      const uniqueWhere = {
        schoolId_aadhaarNumber: {
          schoolId: school.id,
          aadhaarNumber: data.aadhaarNumber!,
        },
      };
      const existing = await prisma.student.findUnique({ where: uniqueWhere });
      try {
        if (data.email) {
          await assertStudentAccountEmailAvailable(String(data.email), existing?.id);
        }
      } catch {
        data.email = null;
      }

      const payload = {
        schoolId: school.id,
        status: validationErrors.length === 0 ? "ready" : "draft",
        validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
      };

      const student = existing
        ? await prisma.student.update({
            where: uniqueWhere,
            data: toStudentUncheckedUpdate(data as Record<string, unknown>, payload),
          })
        : await prisma.student.create({
            data: toStudentUncheckedCreate(data as Record<string, unknown>, payload),
          });

      if (existing) stats.updated++;
      else stats.created++;
      if (validationErrors.length) {
        stats.draft++;
        if (errors.length < 30) {
          errors.push({
            row: i + 1,
            name,
            errors: validationErrors.map((e) => e.message),
          });
        }
      }
      await syncStudentPortalAccount(student);
    } catch (err) {
      stats.failed++;
      errors.push({
        row: i + 1,
        name,
        errors: [err instanceof Error ? err.message : "Unknown error"],
      });
    }
  }

  const afterCount = await prisma.student.count({ where: { schoolId: school.id } });
  const byClass = await prisma.student.groupBy({
    by: ["standard", "section"],
    where: { schoolId: school.id, standard: { in: ["9", "10"] } },
    _count: true,
  });

  console.log("\nImport result:", stats);
  console.log(`Students after: ${afterCount} (+${afterCount - beforeCount} net)`);
  console.log("By class (9/10):", byClass.map((g) => `${g.standard}-${g.section}: ${g._count}`).join(", "));
  if (errors.length) {
    console.log("\nSample warnings/failures:");
    for (const e of errors.slice(0, 15)) {
      console.log(`  row ${e.row} ${e.name}: ${e.errors.join("; ")}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
