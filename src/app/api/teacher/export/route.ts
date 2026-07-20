import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  countMarkedDays,
  countMonthAbsent,
  countMonthHalf,
  countMonthPresent,
  parseDaysJson,
} from "@/lib/attendance";
import { assertTeacherAttendanceAccess, teacherClassIds } from "@/lib/teacher-attendance";
import {
  buildSimpleTablePdf,
  buildTeacherExcelBuffer,
  teacherExportFilename,
  type TeacherExportPayload,
} from "@/lib/teacher-export";
import { studentShortNameGu } from "@/lib/student-names";
import { mobileJson, corsHeaders } from "@/lib/mobile-api";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request.headers.get("origin")),
  });
}

/**
 * Teacher-scoped Excel / PDF / JSON export for mobile + web.
 * GET /api/teacher/export?type=dashboard|roster|attendance&format=xlsx|pdf|json&classId=&month=&year=
 */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireSchoolAuth(["teacher", "school_admin"]);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "dashboard";
    const format = (searchParams.get("format") || "xlsx").toLowerCase();
    const classId = searchParams.get("classId");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()), 10);

    if (!session.staffId && session.role === "teacher") {
      return mobileJson({ error: "Staff profile not linked" }, { status: 403 }, origin);
    }

    if (classId) {
      await assertTeacherAttendanceAccess(session, classId);
    }

    const allowedClassIds =
      session.role === "teacher"
        ? await teacherClassIds(session)
        : (
            await prisma.schoolClass.findMany({
              where: { schoolId: session.schoolId },
              select: { id: true },
            })
          ).map((c) => c.id);

    if (classId && !allowedClassIds.includes(classId)) {
      return mobileJson({ error: "Class not assigned to you" }, { status: 403 }, origin);
    }

    const scopeIds = classId ? [classId] : allowedClassIds;

    const classes = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, id: { in: scopeIds } },
      orderBy: [{ standard: "asc" }, { section: "asc" }],
      include: {
        students: {
          where: { status: { not: "archived" } },
          orderBy: [{ rollNumber: "asc" }, { surname: "asc" }],
          select: {
            id: true,
            firstName: true,
            middleName: true,
            surname: true,
            rollNumber: true,
            grNumber: true,
            gender: true,
            category: true,
            mobileNumber: true,
            status: true,
          },
        },
      },
    });

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { name: true, settings: { select: { schoolName: true } } },
    });
    const schoolName = school?.settings?.schoolName || school?.name || session.schoolName || "School";
    const teacherName = session.name || "Teacher";
    const generatedAt = new Date().toISOString();

    let payload: TeacherExportPayload;

    if (type === "roster") {
      const sheets = classes.map((cls) => ({
        name: cls.name.slice(0, 31),
        headers: ["#", "Roll", "GR", "Name", "Gender", "Category", "Mobile", "Status"],
        rows: cls.students.map((s, i) => [
          i + 1,
          s.rollNumber || "",
          s.grNumber || "",
          studentShortNameGu(s),
          s.gender || "",
          s.category || "",
          s.mobileNumber || "",
          s.status || "",
        ]),
      }));
      payload = {
        type: "roster",
        title: "Class Student Roster",
        schoolName,
        teacherName,
        filterSummary: classId
          ? classes[0]?.name || classId
          : `${classes.length} class(es)`,
        generatedAt,
        sheets: sheets.length
          ? sheets
          : [{ name: "Roster", headers: ["Info"], rows: [["No students"]] }],
      };
    } else if (type === "attendance") {
      const studentIds = classes.flatMap((c) => c.students.map((s) => s.id));
      const records = studentIds.length
        ? await prisma.studentAttendanceMonth.findMany({
            where: { schoolId: session.schoolId, month, year, studentId: { in: studentIds } },
          })
        : [];
      const byStudent = new Map(records.map((r) => [r.studentId, r]));
      const dayHeaders = Array.from({ length: 31 }, (_, i) => String(i + 1));

      const sheets = classes.map((cls) => ({
        name: cls.name.slice(0, 31),
        headers: ["#", "Roll", "Name", ...dayHeaders, "P", "A", "H", "Marked", "%"],
        rows: cls.students.map((s, i) => {
          const rec = byStudent.get(s.id);
          const days = parseDaysJson(rec?.daysJson);
          const present = countMonthPresent(days);
          const absent = countMonthAbsent(days);
          const half = countMonthHalf(days);
          const marked = countMarkedDays(days);
          const pct = marked ? Math.round((present / marked) * 100) : 0;
          return [
            i + 1,
            s.rollNumber || "",
            studentShortNameGu(s),
            ...days.map((d) => d || ""),
            present,
            absent,
            half,
            marked,
            pct,
          ];
        }),
      }));

      payload = {
        type: "attendance",
        title: `Monthly Attendance ${month}/${year}`,
        schoolName,
        teacherName,
        filterSummary: `${month}/${year}${classId ? ` · ${classes[0]?.name || ""}` : ""}`,
        generatedAt,
        sheets: sheets.length
          ? sheets
          : [{ name: "Attendance", headers: ["Info"], rows: [["No data"]] }],
      };
    } else {
      // dashboard summary
      const rows = classes.map((cls) => {
        const boys = cls.students.filter((s) => (s.gender || "").toLowerCase().startsWith("m")).length;
        const girls = cls.students.filter((s) => (s.gender || "").toLowerCase().startsWith("f")).length;
        return [
          cls.name,
          cls.standard,
          cls.section,
          cls.students.length,
          boys,
          girls,
          cls.academicYear,
        ];
      });
      payload = {
        type: "dashboard",
        title: "Teacher Dashboard Summary",
        schoolName,
        teacherName,
        filterSummary: `${classes.length} classes · ${classes.reduce((s, c) => s + c.students.length, 0)} students`,
        generatedAt,
        sheets: [
          {
            name: "My Classes",
            headers: ["Class", "Std", "Div", "Students", "Boys", "Girls", "Year"],
            rows,
          },
        ],
      };
    }

    if (format === "json") {
      return mobileJson(payload, undefined, origin);
    }

    if (format === "pdf") {
      const buffer = buildSimpleTablePdf(payload);
      const filename = teacherExportFilename(payload, "pdf");
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // default xlsx
    const buffer = await buildTeacherExcelBuffer(payload);
    const filename = teacherExportFilename(payload, "xlsx");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        ...corsHeaders(origin),
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return mobileJson({ error: e.message }, { status: e.status }, origin);
    }
    console.error("[teacher/export]", e);
    return mobileJson({ error: "Export failed" }, { status: 500 }, origin);
  }
}
