import * as XLSX from "xlsx";
import path from "path";
import { prisma } from "../src/lib/db";

async function main() {
  const file = path.join(process.cwd(), "file", "12-B  DAXABEN.xlsx");
  const wb = XLSX.readFile(file, { cellDates: false, raw: false });
  const sheet = wb.Sheets["Students"]!;
  const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });
  const filled = rows.filter((r) => String(r["First Name"] || "").trim() && String(r["Aadhaar Number"] || "").trim());
  console.log("filledRows", filled.length);
  console.log("sample last", filled[filled.length - 1]);

  const school = await prisma.school.findFirst({
    where: { OR: [{ code: "24261004405" }, { udiseCode: "24261004405" }] },
    include: {
      settings: true,
      classes: {
        where: { standard: "12" },
        orderBy: [{ section: "asc" }],
        select: {
          id: true,
          name: true,
          standard: true,
          section: true,
          stream: true,
          academicYear: true,
          _count: { select: { students: true } },
        },
      },
    },
  });
  console.log(
    JSON.stringify(
      {
        school: school
          ? {
              id: school.id,
              code: school.code,
              name: school.name,
              year: school.settings?.academicYear,
            }
          : null,
        classes12: school?.classes,
      },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
