import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { compareRollNumbers } from "@/lib/attendance";
import { scholarshipPaperGaps } from "@/lib/scholarship-gaps";
import { studentListName } from "@/lib/student-names";
import {
  assertSupervisorClassAccess,
  getSupervisorClassIds,
} from "@/lib/supervisor-scope";

function cleanDue(value: unknown): string | null {
  const s = String(value || "").trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return s;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "supervisor", "clerk"]);
    const classId = String(new URL(request.url).searchParams.get("classId") || "").trim();
    if (classId) await assertSupervisorClassAccess(session, classId);
    const supervisorIds = await getSupervisorClassIds(session);

    const where: Record<string, unknown> = {
      schoolId: session.schoolId,
      status: { not: "archived" },
    };
    if (classId) where.classId = classId;
    else if (supervisorIds) where.classId = { in: supervisorIds.length ? supervisorIds : ["__none__"] };

    const [students, settings] = await Promise.all([
      prisma.student.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          middleName: true,
          surname: true,
          firstNameGu: true,
          middleNameGu: true,
          surnameGu: true,
          rollNumber: true,
          grNumber: true,
          standard: true,
          section: true,
          category: true,
          scholarshipScheme: true,
          aadhaarNumber: true,
          aadhaarDocPath: true,
          accountNumber: true,
          ifscCode: true,
          bankPassbookPath: true,
          caste: true,
          casteCertPath: true,
          incomeCertPath: true,
          mobileNumber: true,
        },
      }),
      prisma.schoolSettings.findUnique({
        where: { schoolId: session.schoolId },
        select: { scholarshipPapersDue: true },
      }),
    ]);

    const rows = students
      .map((student) => ({
        id: student.id,
        name: studentListName(student),
        rollNumber: student.rollNumber || "",
        grNumber: student.grNumber || "",
        standard: student.standard || "",
        section: student.section || "",
        category: student.category || "",
        scheme: student.scholarshipScheme || "",
        missing: scholarshipPaperGaps(student),
      }))
      .filter((row) => row.missing.length > 0)
      .sort((a, b) => {
        const classCmp = `${a.standard}${a.section}`.localeCompare(`${b.standard}${b.section}`, undefined, {
          numeric: true,
        });
        if (classCmp !== 0) return classCmp;
        return compareRollNumbers(a.rollNumber, b.rollNumber);
      });

    return NextResponse.json({
      dueDate: settings?.scholarshipPapersDue || "",
      total: rows.length,
      students: rows,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Failed to load paper desk" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const dueDate = cleanDue(body.dueDate);
    if (body.dueDate && !dueDate) {
      return NextResponse.json({ error: "Use a date as YYYY-MM-DD" }, { status: 400 });
    }
    await prisma.schoolSettings.upsert({
      where: { schoolId: session.schoolId },
      create: {
        schoolId: session.schoolId,
        schoolName: session.schoolName || "My School",
        scholarshipPapersDue: dueDate,
      },
      update: { scholarshipPapersDue: dueDate },
    });
    return NextResponse.json({ dueDate: dueDate || "" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Failed to save date" }, { status: 500 });
  }
}
