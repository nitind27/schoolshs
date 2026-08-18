import { prisma } from "@/lib/db";
import { buildStatementYearRows } from "@/lib/salary-statement";

const STAFF_SELECT = {
  designation: true,
  department: true,
  dateOfJoining: true,
  retirementDate: true,
  dateOfBirth: true,
  monthlySalary: true,
  da: true,
  hra: true,
  ma: true,
  fpa: true,
  hndA: true,
  suA: true,
  caA: true,
  wa: true,
  prA: true,
  bonus: true,
  daArrears: true,
  salaryArrears: true,
} as const;

async function resolveStatementSchoolType(schoolId: string, stored?: string | null) {
  const trimmed = String(stored || "").trim();
  if (trimmed && trimmed !== "Other") return trimmed;

  const classes = await prisma.schoolClass.findMany({
    where: { schoolId },
    select: { standard: true },
  });
  const nums = classes
    .map((c) => Number.parseInt(String(c.standard || ""), 10))
    .filter((n) => Number.isFinite(n));
  if (!nums.length) return trimmed || null;
  const max = Math.max(...nums);
  const min = Math.min(...nums);
  if (max <= 8) return "Primary";
  if (min >= 11) return "Higher Secondary";
  if (max <= 10) return "Secondary";
  if (max >= 11) return "Higher Secondary";
  return trimmed || null;
}

export async function loadSchoolSalaryStatement(
  schoolId: string,
  financialYear: string,
  opts?: { fromStaff?: boolean },
) {
  const [saved, staffList, school] = await Promise.all([
    opts?.fromStaff
      ? Promise.resolve([])
      : prisma.salaryStatementRow.findMany({
          where: { schoolId, financialYear },
        }),
    prisma.staff.findMany({
      where: {
        schoolId,
        OR: [{ isActive: true }, { retirementDate: { not: null } }],
      },
      select: STAFF_SELECT,
    }),
    prisma.school.findUnique({
      where: { id: schoolId },
      select: { schoolType: true, name: true },
    }),
  ]);

  const schoolType = await resolveStatementSchoolType(schoolId, school?.schoolType);
  return {
    ...buildStatementYearRows(financialYear, staffList, saved, schoolType),
    schoolType,
    schoolName: school?.name || "",
  };
}
