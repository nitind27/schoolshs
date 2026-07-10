import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, setSessionCookie, AuthError } from "@/lib/auth";
import { caHasSchoolAccess } from "@/lib/accounting-scope";

export async function GET() {
  try {
    const session = await requireAuth(["ca"]);
    const { getCaSchoolSummaries } = await import("@/lib/accounting-scope");
    const schools = await getCaSchoolSummaries(session.userId, session.schoolId);
    const activeSchoolId = session.activeSchoolId || session.schoolId;

    const enriched = await Promise.all(
      schools.map(async (school) => {
        const fy = school.financialYear;
        const pending = fy
          ? await prisma.voucher.count({
              where: { schoolId: school.id, financialYearId: fy.id, auditStatus: "pending" },
            })
          : 0;
        return {
          ...school,
          isActive: school.id === activeSchoolId,
          pendingVouchers: pending,
        };
      })
    );

    return NextResponse.json({
      schools: enriched,
      activeSchoolId,
      activeSchoolName: session.activeSchoolName || session.schoolName,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to load schools" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(["ca"]);
    const { schoolId } = await request.json();
    if (!schoolId) {
      return NextResponse.json({ error: "schoolId required" }, { status: 400 });
    }

    const allowed = await caHasSchoolAccess(session.userId, schoolId, session.schoolId);
    if (!allowed) {
      return NextResponse.json({ error: "School access denied" }, { status: 403 });
    }

    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, name: true, code: true, isActive: true },
    });
    if (!school?.isActive) {
      return NextResponse.json({ error: "School not found or inactive" }, { status: 404 });
    }

    const updatedSession = {
      ...session,
      activeSchoolId: school.id,
      activeSchoolName: school.name,
      schoolId: session.schoolId || school.id,
      schoolName: session.schoolName || school.name,
      schoolCode: session.schoolCode || school.code,
    };

    const res = NextResponse.json({
      success: true,
      activeSchoolId: school.id,
      activeSchoolName: school.name,
    });
    await setSessionCookie(res, updatedSession);
    return res;
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to switch school" }, { status: 500 });
  }
}
