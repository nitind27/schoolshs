import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fillStudentGuNames } from "@/lib/gujarati/transliterate-server";

const GU_COLUMNS = [
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarNameGu",
  "motherNameGu",
  "fatherNameGu",
  "guardianNameGu",
] as const;

const SELECT = {
  id: true,
  firstName: true,
  middleName: true,
  surname: true,
  aadhaarName: true,
  motherName: true,
  fatherName: true,
  guardianName: true,
  firstNameGu: true,
  middleNameGu: true,
  surnameGu: true,
  aadhaarNameGu: true,
  motherNameGu: true,
  fatherNameGu: true,
  guardianNameGu: true,
} as const;

function needsGuUpdate(s: {
  firstNameGu?: string | null;
  middleNameGu?: string | null;
  surnameGu?: string | null;
  aadhaarNameGu?: string | null;
  motherNameGu?: string | null;
  fatherNameGu?: string | null;
  guardianNameGu?: string | null;
  firstName: string;
  middleName?: string | null;
  surname: string;
  aadhaarName: string;
  motherName: string;
  fatherName: string;
  guardianName?: string | null;
}): boolean {
  const pairs: [string | null | undefined, string | null | undefined][] = [
    [s.firstName, s.firstNameGu],
    [s.middleName, s.middleNameGu],
    [s.surname, s.surnameGu],
    [s.aadhaarName, s.aadhaarNameGu],
    [s.motherName, s.motherNameGu],
    [s.fatherName, s.fatherNameGu],
    [s.guardianName, s.guardianNameGu],
  ];
  return pairs.some(([en, gu]) => Boolean(String(en ?? "").trim() && !String(gu ?? "").trim()));
}

/** Dev-only: add Gujarati name columns + backfill existing students */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const results: { step: string; status: string; detail?: string }[] = [];

  try {
    let schemaOk = false;
    try {
      await prisma.student.findFirst({ select: { firstNameGu: true }, take: 1 });
      schemaOk = true;
      results.push({ step: "schema", status: "exists" });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!msg.includes("Unknown column") && !msg.includes("firstNameGu")) {
        throw e;
      }
    }

    if (!schemaOk) {
      const parts = GU_COLUMNS.map((c) => `ADD COLUMN \`${c}\` VARCHAR(191) NULL`).join(", ");
      await prisma.$executeRawUnsafe(`ALTER TABLE \`student\` ${parts}`);
      results.push({ step: "schema", status: "added", detail: GU_COLUMNS.join(", ") });
    }

    let backfilled = 0;
    let skip = 0;
    const batchSize = 40;

    while (true) {
      const batch = await prisma.student.findMany({
        skip,
        take: batchSize,
        orderBy: { id: "asc" },
        select: SELECT,
      });
      if (!batch.length) break;

      const updates = batch.filter(needsGuUpdate);
      await Promise.all(
        updates.map(async (s) => {
          const filled = await fillStudentGuNames(s);
          return prisma.student.update({
            where: { id: s.id },
            data: {
              firstNameGu: filled.firstNameGu || null,
              middleNameGu: filled.middleNameGu || null,
              surnameGu: filled.surnameGu || null,
              aadhaarNameGu: filled.aadhaarNameGu || null,
              motherNameGu: filled.motherNameGu || null,
              fatherNameGu: filled.fatherNameGu || null,
              guardianNameGu: filled.guardianNameGu || null,
            },
          });
        }),
      );

      backfilled += updates.length;
      skip += batch.length;
      if (batch.length < batchSize) break;
    }

    results.push({ step: "backfill", status: "done", detail: String(backfilled) });

    return NextResponse.json({ success: true, results });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("migrate-gu-names:", e);
    return NextResponse.json({ success: false, error: msg, results }, { status: 500 });
  }
}
