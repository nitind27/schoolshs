import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { buildAutomationPreflight } from "@/lib/automation-preflight";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const studentIds = Array.isArray(body.studentIds)
      ? body.studentIds.map(String).filter(Boolean)
      : [];
    if (!studentIds.length) {
      return NextResponse.json(
        { error: "Select at least one student" },
        { status: 400 },
      );
    }

    const students = await prisma.student.findMany({
      where: {
        id: { in: studentIds },
        schoolId: session.schoolId,
        status: { not: "archived" },
      },
    });
    const rows = students.map(buildAutomationPreflight);
    const portalTypes = [...new Set(rows.map((row) => row.portalType))];

    return NextResponse.json({
      students: rows,
      summary: {
        selected: studentIds.length,
        found: rows.length,
        ready: rows.filter((row) => row.ready).length,
        blocked: rows.filter((row) => !row.ready).length,
        portalTypes,
        mixedPortals: portalTypes.length > 1,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }
    console.error("Automation preflight error:", error);
    return NextResponse.json(
      { error: "Failed to validate Auto Apply data" },
      { status: 500 },
    );
  }
}
