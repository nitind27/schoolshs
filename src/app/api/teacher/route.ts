import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getTeacherScope } from "@/lib/teacher-scope";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

function scopePayload(scope: Awaited<ReturnType<typeof getTeacherScope>>) {
  return {
    linked: scope.linked,
    staffId: scope.staffId,
    academicYear: scope.academicYear,
    defaultClassId: scope.defaultClassId,
    currentPeriod: scope.currentPeriod,
    classes: scope.classes,
    attendanceClassIds: scope.attendanceClassIds,
    marksClassIds: scope.marksClassIds,
    homeroomClassIds: scope.homeroomClassIds,
  };
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["teacher", "school_admin"]);
    const compact =
      request.nextUrl.searchParams.get("view") === "scope" ||
      request.nextUrl.searchParams.get("scope") === "1";

    if (!session.staffId) {
      const empty = {
        linked: false,
        staffId: null,
        academicYear: "",
        defaultClassId: null,
        currentPeriod: null,
        classes: [],
        attendanceClassIds: [] as string[],
        marksClassIds: [] as string[],
        homeroomClassIds: [] as string[],
        stats: { totalStudents: 0, totalClasses: 0, boys: 0, girls: 0, other: 0 },
        message: "no_staff",
      };
      return mobileJson(empty, undefined, origin);
    }

    const scope = await getTeacherScope(session);
    if (compact) {
      return mobileJson(scopePayload(scope), undefined, origin);
    }

    const classIds = scope.attendanceClassIds;
    const classes = classIds.length
      ? await prisma.schoolClass.findMany({
          where: { schoolId: session.schoolId, id: { in: classIds } },
          select: {
            id: true,
            name: true,
            standard: true,
            section: true,
            stream: true,
            academicYear: true,
            students: {
              where: { status: { not: "archived" } },
              orderBy: [
                { rollNumber: "asc" },
                { surname: "asc" },
                { firstName: "asc" },
              ],
              select: {
                id: true,
                firstName: true,
                middleName: true,
                surname: true,
                firstNameGu: true,
                surnameGu: true,
                rollNumber: true,
                grNumber: true,
                gender: true,
                category: true,
                caste: true,
                mobileNumber: true,
                dateOfBirth: true,
                status: true,
                aadhaarNumber: true,
                fatherName: true,
                motherName: true,
                sscSeatPrefix: true,
                sscSeatNumber: true,
                hscSeatPrefix: true,
                hscSeatNumber: true,
              },
            },
          },
        })
      : [];

    const classById = new Map(classes.map((c) => [c.id, c]));
    const scopedClasses = scope.classes
      .map((s) => {
        const cls = classById.get(s.id);
        if (!cls) return null;
        return {
          ...cls,
          isHomeroom: s.isHomeroom,
          isTeaching: s.isTeaching,
          canMarkAttendance: s.canMarkAttendance,
          canEnterMarks: s.canEnterMarks,
          subjects: s.subjects,
          subjectCodes: s.subjectCodes,
        };
      })
      .filter((c): c is NonNullable<typeof c> => Boolean(c));

    let boys = 0;
    let girls = 0;
    let totalStudents = 0;
    for (const cls of scopedClasses) {
      for (const s of cls.students) {
        totalStudents++;
        const g = (s.gender || "").toLowerCase();
        if (g.startsWith("m") || g.includes("boy")) boys++;
        else if (g.startsWith("f") || g.includes("girl")) girls++;
      }
    }

    return mobileJson(
      {
        ...scopePayload(scope),
        classes: scopedClasses,
        stats: {
          totalStudents,
          totalClasses: scopedClasses.length,
          boys,
          girls,
          other: Math.max(0, totalStudents - boys - girls),
        },
      },
      undefined,
      origin,
    );
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error("[teacher GET]", e);
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}
