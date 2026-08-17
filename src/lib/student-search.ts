import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

/** CONCAT of name + GR + IDs — COLLATE avoids utf8mb4_bin vs unicode_ci LIKE errors. */
function studentHaystackSql(alias: string) {
  return Prisma.raw(`CONCAT_WS(' ',
    IFNULL(${alias}.firstName, ''),
    IFNULL(${alias}.middleName, ''),
    IFNULL(${alias}.surname, ''),
    IFNULL(${alias}.firstNameGu, ''),
    IFNULL(${alias}.middleNameGu, ''),
    IFNULL(${alias}.surnameGu, ''),
    IFNULL(${alias}.aadhaarName, ''),
    IFNULL(${alias}.aadhaarNameGu, ''),
    IFNULL(${alias}.fatherName, ''),
    IFNULL(${alias}.fatherNameGu, ''),
    IFNULL(${alias}.motherName, ''),
    IFNULL(${alias}.motherNameGu, ''),
    IFNULL(${alias}.guardianName, ''),
    IFNULL(${alias}.guardianNameGu, ''),
    IFNULL(${alias}.grNumber, ''),
    IFNULL(${alias}.rollNumber, ''),
    IFNULL(${alias}.mobileNumber, ''),
    IFNULL(${alias}.aadhaarNumber, ''),
    IFNULL(${alias}.childUid, ''),
    IFNULL(${alias}.apaarId, '')
  )`);
}

function tokenMatchSql(alias: string, token: string) {
  const pattern = `%${escapeLike(token)}%`;
  return Prisma.sql`${studentHaystackSql(alias)} COLLATE utf8mb4_unicode_ci LIKE ${pattern}`;
}

export function looksLikeGrQuery(search: string): boolean {
  const q = String(search || "").trim();
  if (!q) return false;
  const digits = q.replace(/\D/g, "");
  if (!digits) return false;
  const letters = q.replace(/[0-9\s./-]/g, "");
  return digits.length >= 1 && letters.length === 0;
}

/**
 * Find student IDs by GR or name (English + Gujarati).
 * Do not use Prisma `contains` here — production MySQL mixed collations throw on LIKE.
 */
export async function searchStudentIds(
  db: PrismaClient,
  opts: {
    schoolId: string;
    query: string;
    classTeacherId?: string;
    take?: number;
  },
): Promise<string[]> {
  const q = String(opts.query || "").trim();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean).slice(0, 6);
  if (!tokens.length) return [];

  const take = Math.min(Math.max(opts.take ?? 50, 1), 500);
  const matchAll = Prisma.join(
    tokens.map((token) => tokenMatchSql("s", token)),
    " AND ",
  );
  const joinClass = opts.classTeacherId
    ? Prisma.sql`INNER JOIN schoolclass c ON c.id = s.classId AND c.classTeacherId = ${opts.classTeacherId}`
    : Prisma.empty;

  try {
    const rows = await db.$queryRaw<{ id: string }[]>`
      SELECT s.id
      FROM student s
      ${joinClass}
      WHERE s.schoolId = ${opts.schoolId}
        AND (${matchAll})
      ORDER BY s.surname ASC, s.firstName ASC
      LIMIT ${Prisma.raw(String(take))}
    `;
    return rows.map((r) => r.id).filter(Boolean);
  } catch (error) {
    console.error("searchStudentIds failed:", error);
    throw error;
  }
}
