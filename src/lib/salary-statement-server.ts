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

export async function loadSchoolSalaryStatement(
  schoolId: string,
  financialYear: string,
  opts?: { fromStaff?: boolean },
) {
  const [saved, staffList] = await Promise.all([
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
  ]);

  return buildStatementYearRows(financialYear, staffList, saved);
}
