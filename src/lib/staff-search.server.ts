import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { PrismaClient } from "@/generated/prisma/client";

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}

function staffHaystackSql() {
  return Prisma.raw(`CONCAT_WS(' ',
    IFNULL(s.firstName, ''),
    IFNULL(s.lastName, ''),
    IFNULL(s.firstNameGu, ''),
    IFNULL(s.lastNameGu, ''),
    IFNULL(s.employeeId, ''),
    IFNULL(s.mobileNumber, ''),
    IFNULL(s.email, ''),
    IFNULL(s.designation, ''),
    IFNULL(s.department, '')
  )`);
}

/**
 * Staff name / code / mobile search.
 * Prisma `contains` uses LIKE and fails on this database when collations differ.
 */
export async function searchStaffIds(
  db: PrismaClient,
  schoolId: string,
  query: string,
): Promise<string[]> {
  const tokens = String(query || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
  if (!tokens.length) return [];

  const matchAll = Prisma.join(
    tokens.map((token) => {
      const pattern = `%${escapeLike(token)}%`;
      return Prisma.sql`${staffHaystackSql()} COLLATE utf8mb4_unicode_ci LIKE ${pattern}`;
    }),
    " AND ",
  );

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT s.id
    FROM staff s
    WHERE s.schoolId = ${schoolId}
      AND (${matchAll})
    ORDER BY s.firstName ASC, s.lastName ASC
    LIMIT 500
  `;
  return rows.map((row) => row.id).filter(Boolean);
}
