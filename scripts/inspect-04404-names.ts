import * as XLSX from "xlsx";
import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/db";

const SCHOOL_CODE = "24261004404";
const FILES = [
  { file: "6-B-mapped.xlsx", standard: "6", section: "B" },
  { file: "7-A-mapped.xlsx", standard: "7", section: "A" },
  { file: "7-B-mapped.xlsx", standard: "7", section: "B" },
  { file: "8-B-mapped.xlsx", standard: "8", section: "B" },
];

function pick(r: Record<string, unknown>, ...keys: string[]) {
  for (const k of keys) {
    const v = r[k];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  // case-insensitive fallback
  const lower = Object.fromEntries(
    Object.entries(r).map(([k, v]) => [k.toLowerCase(), v]),
  );
  for (const k of keys) {
    const v = lower[k.toLowerCase()];
    if (v !== undefined && v !== null && String(v).trim()) return String(v).trim();
  }
  return "";
}

async function main() {
  for (const f of FILES) {
    const p = path.join(process.cwd(), "file", f.file);
    if (!fs.existsSync(p)) {
      console.log("MISSING", f.file);
      continue;
    }
    const wb = XLSX.read(fs.readFileSync(p), { type: "buffer", raw: false });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, {
      defval: "",
    }) as Record<string, unknown>[];
    console.log("\n====", f.file, "rows=", rows.length, "====");
    console.log("headers:", Object.keys(rows[0] || {}).join(" | "));
    const sample = rows.slice(0, 3).map((r) => ({
      firstName: pick(r, "firstName", "First Name"),
      middleName: pick(r, "middleName", "Middle Name"),
      surname: pick(r, "surname", "Surname"),
      aadhaarName: pick(r, "aadhaarName", "Aadhaar Name", "Name as per Aadhaar"),
      fatherName: pick(r, "fatherName", "Father Name"),
      motherName: pick(r, "motherName", "Mother Name"),
      aadhaar: pick(r, "aadhaarNumber", "Aadhaar Number"),
      gr: pick(r, "grNumber", "GR Number"),
    }));
    console.log(JSON.stringify(sample, null, 2));
  }

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: SCHOOL_CODE }, { udiseCode: SCHOOL_CODE }] },
    select: { id: true, name: true, code: true },
  });
  if (!school) {
    console.log("SCHOOL_NOT_FOUND");
    return;
  }
  console.log("\nSCHOOL", school);

  for (const f of FILES) {
    const students = await prisma.student.findMany({
      where: {
        schoolId: school.id,
        standard: f.standard,
        section: f.section,
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
        aadhaarNumber: true,
        grNumber: true,
        rollNumber: true,
      },
      orderBy: { rollNumber: "asc" },
      take: 5,
    });
    const total = await prisma.student.count({
      where: {
        schoolId: school.id,
        standard: f.standard,
        section: f.section,
        status: { not: "archived" },
      },
    });
    const emptyFather = await prisma.student.count({
      where: {
        schoolId: school.id,
        standard: f.standard,
        section: f.section,
        status: { not: "archived" },
        OR: [{ fatherName: null }, { fatherName: "" }, { fatherName: "—" }],
      },
    });
    const emptyAadhaarName = await prisma.student.count({
      where: {
        schoolId: school.id,
        standard: f.standard,
        section: f.section,
        status: { not: "archived" },
        OR: [{ aadhaarName: null }, { aadhaarName: "" }, { aadhaarName: "—" }],
      },
    });
    console.log(
      `\nDB Class ${f.standard}-${f.section}: total=${total} emptyFather=${emptyFather} emptyAadhaarName=${emptyAadhaarName}`,
    );
    console.log(JSON.stringify(students, null, 2));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
