import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createPrismaClient } from "../src/lib/prisma-factory";

const prisma = createPrismaClient();
const LATIN = /[A-Za-z]/;
const GUJ = /[\u0A80-\u0AFF]/;
const FIELDS = [
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarNameGu",
  "motherNameGu",
  "fatherNameGu",
  "guardianNameGu",
] as const;

async function main() {
  const rows = await prisma.student.findMany({
    select: {
      id: true,
      firstName: true,
      surname: true,
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      aadhaarNameGu: true,
      motherNameGu: true,
      fatherNameGu: true,
      guardianNameGu: true,
    },
  });

  let latinOnly = 0;
  let mixed = 0;
  let empty = 0;
  let proper = 0;
  const latinSamples: unknown[] = [];

  for (const r of rows) {
    for (const f of FIELDS) {
      const v = String(r[f] ?? "").trim();
      if (!v) {
        empty++;
        continue;
      }
      if (LATIN.test(v) && !GUJ.test(v)) {
        latinOnly++;
        if (latinSamples.length < 20) {
          latinSamples.push({ id: r.id, f, v, en: `${r.firstName} ${r.surname}` });
        }
      } else if (LATIN.test(v) && GUJ.test(v)) {
        mixed++;
        if (latinSamples.length < 20) latinSamples.push({ id: r.id, f, v, mixed: true });
      } else if (GUJ.test(v)) {
        proper++;
      } else {
        empty++;
      }
    }
  }

  console.log(
    JSON.stringify(
      { totalStudents: rows.length, latinOnly, mixed, empty, proper, latinSamples },
      null,
      2,
    ),
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
