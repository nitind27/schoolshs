/**
 * Normalize English honorific spacing + rebuild Student *Gu fields.
 *
 * - "Anjali Ben" / "Anjali  Kumar" → "AnjaliBen" / "AnjaliKumar" (EN + GU)
 * - Gujarati from Google Translate on stem + glued canonical suffix (બેન/કુમાર/…)
 *
 * Usage:
 *   npx tsx scripts/fix-student-gu-names.ts              # dry-run (bad Gu + spacing)
 *   npx tsx scripts/fix-student-gu-names.ts --force      # dry-run rebuild ALL Gu from EN
 *   npx tsx scripts/fix-student-gu-names.ts --apply
 *   npx tsx scripts/fix-student-gu-names.ts --force --apply
 */
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import { createPrismaClient } from "../src/lib/prisma-factory";
import { isGujaratiScript } from "../src/lib/gujarati/gujarati-script";
import { translateEnglishNameParts } from "../src/lib/gujarati/google-translate";
import {
  normalizeNamePartEn,
  normalizeNamePartGu,
} from "../src/lib/student-name-normalize";

const prisma = createPrismaClient();
const APPLY = process.argv.includes("--apply");
const FORCE = process.argv.includes("--force");

const GU_FIELDS = [
  "firstNameGu",
  "middleNameGu",
  "surnameGu",
  "aadhaarNameGu",
  "motherNameGu",
  "fatherNameGu",
  "guardianNameGu",
] as const;

const EN_FIELDS = [
  "firstName",
  "middleName",
  "surname",
  "aadhaarName",
  "motherName",
  "fatherName",
  "guardianName",
] as const;

type GuField = (typeof GU_FIELDS)[number];
type EnField = (typeof EN_FIELDS)[number];

const EN_SOURCE: Record<GuField, EnField> = {
  firstNameGu: "firstName",
  middleNameGu: "middleName",
  surnameGu: "surname",
  aadhaarNameGu: "aadhaarName",
  motherNameGu: "motherName",
  fatherNameGu: "fatherName",
  guardianNameGu: "guardianName",
};

const LATIN_RE = /[A-Za-z]/;
const cache = new Map<string, string>();

function isWeak(value: string | null | undefined): boolean {
  const s = String(value ?? "").trim();
  if (!s) return true;
  const upper = s.toUpperCase();
  return s === "—" || s === "-" || s === "–" || upper === "NA" || upper === "N/A" || upper === ".";
}

function isPureGujarati(value: string | null | undefined): boolean {
  const s = String(value ?? "").trim();
  if (!s) return false;
  if (!isGujaratiScript(s)) return false;
  if (LATIN_RE.test(s)) return false;
  return true;
}

function needsGujaratiFix(gu: string | null | undefined): boolean {
  if (FORCE) return true;
  if (isWeak(gu)) return true;
  if (!isPureGujarati(gu)) return true;
  // Spaced honorifics like "અંજલી બેન"
  const glued = normalizeNamePartGu(gu);
  if (glued !== String(gu).trim()) return true;
  return false;
}

async function englishToGu(en: string): Promise<string> {
  const key = normalizeNamePartEn(en).toLowerCase();
  if (!key) return "";
  const hit = cache.get(key);
  if (hit !== undefined) return hit;

  const gu = await translateEnglishNameParts(en);
  const clean = isPureGujarati(gu) ? normalizeNamePartGu(gu) : "";
  cache.set(key, clean);
  return clean;
}

async function main() {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      aadhaarName: true,
      aadhaarNameGu: true,
      motherName: true,
      motherNameGu: true,
      fatherName: true,
      fatherNameGu: true,
      guardianName: true,
      guardianNameGu: true,
    },
  });

  console.log(
    `totalStudents=${students.length} mode=${APPLY ? "APPLY" : "DRY-RUN"} force=${FORCE}`,
  );

  const fieldStats: Record<string, number> = {};
  let studentsTouched = 0;
  let skippedNoSource = 0;
  const samples: Array<Record<string, unknown>> = [];

  let index = 0;
  for (const s of students) {
    index++;
    if (index % 100 === 0) {
      console.log(`… ${index}/${students.length} touched=${studentsTouched} cache=${cache.size}`);
    }
    const patch: Record<string, string | null> = {};

    // English honorific spacing first
    for (const field of EN_FIELDS) {
      const current = s[field];
      if (isWeak(current)) continue;
      const next = normalizeNamePartEn(current);
      if (next && next !== String(current).trim()) {
        patch[field] = next;
        fieldStats[field] = (fieldStats[field] || 0) + 1;
        if (samples.length < 40) {
          samples.push({
            id: s.id,
            field,
            from: current,
            to: next,
            kind: "en-space",
          });
        }
      }
    }

    for (const field of GU_FIELDS) {
      const enKey = EN_SOURCE[field];
      const enRaw = patch[enKey] ?? s[enKey];
      const en = normalizeNamePartEn(String(enRaw ?? ""));
      const current = s[field];

      if (!needsGujaratiFix(current) && !FORCE) {
        // Still glue spaced Gu honorifics
        if (!isWeak(current)) {
          const glued = normalizeNamePartGu(current);
          if (glued !== String(current).trim()) {
            patch[field] = glued;
            fieldStats[field] = (fieldStats[field] || 0) + 1;
          }
        }
        continue;
      }

      if (!en) {
        if (!isWeak(current) && !isPureGujarati(current)) {
          // Drop Latin junk with no English source
          patch[field] = null;
          fieldStats[field] = (fieldStats[field] || 0) + 1;
        } else if (!isWeak(current)) {
          const glued = normalizeNamePartGu(current);
          if (glued !== String(current).trim()) {
            patch[field] = glued;
            fieldStats[field] = (fieldStats[field] || 0) + 1;
          }
        }
        skippedNoSource++;
        continue;
      }

      const next = await englishToGu(en);
      if (!next) {
        skippedNoSource++;
        continue;
      }

      const curNorm = current?.trim() || null;
      if (curNorm === next && !FORCE) continue;
      if (curNorm === next) continue;

      patch[field] = next;
      fieldStats[field] = (fieldStats[field] || 0) + 1;

      if (samples.length < 40) {
        samples.push({
          id: s.id,
          field,
          from: curNorm,
          to: next,
          en,
          nameEn: [s.firstName, s.middleName, s.surname].filter(Boolean).join(" "),
        });
      }
    }

    if (Object.keys(patch).length === 0) continue;
    studentsTouched++;

    if (APPLY) {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await prisma.student.update({
            where: { id: s.id },
            data: patch,
          });
          break;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          if (attempt === 2) throw err;
          console.warn(`retry update ${s.id} (${attempt + 1}): ${msg.slice(0, 80)}`);
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          try {
            await prisma.$disconnect();
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        studentsTouched,
        fieldStats,
        skippedNoSource,
        cacheSize: cache.size,
        samples,
      },
      null,
      2,
    ),
  );

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply (add --force to rebuild all Gu).");
  } else {
    console.log(`\nUpdated ${studentsTouched} students.`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
