import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";
import type { SessionUser } from "@/lib/session-token";

export type AccountingSession = SessionUser & {
  schoolId: string;
  accountingSchoolId: string;
  accountingSchoolName?: string | null;
};

export async function caHasSchoolAccess(
  userId: string,
  schoolId: string,
  userSchoolId?: string | null
): Promise<boolean> {
  if (userSchoolId === schoolId) return true;
  const assignment = await prisma.caSchoolAssignment.findUnique({
    where: { userId_schoolId: { userId, schoolId } },
  });
  return !!assignment;
}

export async function resolveAccountingSchoolId(
  session: SessionUser & { schoolId: string }
): Promise<string> {
  if (session.role !== "ca") return session.schoolId;

  const targetId = session.activeSchoolId || session.schoolId;
  if (!(await caHasSchoolAccess(session.userId, targetId, session.schoolId))) {
    throw new AuthError("School access denied", 403);
  }
  return targetId;
}

export async function buildAccountingSession(
  session: SessionUser & { schoolId: string }
): Promise<AccountingSession> {
  const accountingSchoolId = await resolveAccountingSchoolId(session);
  let accountingSchoolName = session.activeSchoolName ?? session.schoolName;

  if (accountingSchoolId !== session.schoolId || !accountingSchoolName) {
    const school = await prisma.school.findUnique({
      where: { id: accountingSchoolId },
      select: { name: true },
    });
    accountingSchoolName = school?.name ?? accountingSchoolName;
  }

  return { ...session, accountingSchoolId, accountingSchoolName };
}

export async function getCaSchoolSummaries(userId: string, userSchoolId?: string | null) {
  const assignments = await prisma.caSchoolAssignment.findMany({
    where: { userId },
    include: {
      school: {
        include: {
          financialYears: {
            where: { isActive: true },
            take: 1,
            include: { _count: { select: { vouchers: true } } },
          },
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });

  const schoolIds = new Set(assignments.map((a) => a.schoolId));
  if (userSchoolId && !schoolIds.has(userSchoolId)) {
    const primarySchool = await prisma.school.findUnique({
      where: { id: userSchoolId },
      include: {
        financialYears: {
          where: { isActive: true },
          take: 1,
          include: { _count: { select: { vouchers: true } } },
        },
      },
    });
    if (primarySchool) {
      return [{
        id: primarySchool.id,
        name: primarySchool.name,
        code: primarySchool.code,
        district: primarySchool.district,
        isPrimary: true,
        financialYear: primarySchool.financialYears[0] ?? null,
      }];
    }
  }

  return assignments.map((a) => ({
    id: a.school.id,
    name: a.school.name,
    code: a.school.code,
    district: a.school.district,
    isPrimary: a.isPrimary || a.schoolId === userSchoolId,
    financialYear: a.school.financialYears[0] ?? null,
  }));
}
