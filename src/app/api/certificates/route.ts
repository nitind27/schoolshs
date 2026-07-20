import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { studentFullName } from "@/lib/certificates/date-to-words";
import { buildAttendanceRows, toClassRegisterRows } from "@/lib/attendance";
import { assertTeacherAttendanceAccess } from "@/lib/teacher-attendance";
import { mapStudentToGrRow } from "@/lib/certificates/general-register";
import type {
  MonthlyPatrakData,
  PatrakRowKey,
  ScholarshipReportRow,
  AdmissionReportRow,
  LeaverReportRow,
} from "@/lib/certificates/types";
import { emptyPatrakClassification, emptyPatrakMovementRow, PATRAK_TYPE_ROWS } from "@/lib/certificates/types";

function countByGender(students: { gender: string }[]) {
  const boys = students.filter((s) => s.gender === "Male").length;
  const girls = students.filter((s) => s.gender === "Female").length;
  return { boys, girls };
}

function categoryToPatrakRow(category: string): PatrakRowKey {
  const c = category.toUpperCase();
  if (c === "SC") return "govtSc";
  if (c === "ST") return "govtSt";
  return "fullFee";
}

function buildPatrak(
  students: { gender: string; category: string; religion: string }[],
  meta: { month: string; year: string; standard: string; section: string; classTeacher: string },
): MonthlyPatrakData {
  const total = countByGender(students);
  const movement = Object.fromEntries(
    PATRAK_TYPE_ROWS.map((r) => [r.key, emptyPatrakMovementRow()]),
  ) as MonthlyPatrakData["movement"];

  for (const s of students) {
    const key = categoryToPatrakRow(s.category);
    if (s.gender === "Male") {
      movement[key].opening.boys++;
      movement[key].closing.boys++;
    } else {
      movement[key].opening.girls++;
      movement[key].closing.girls++;
    }
  }
  movement.total.opening = { ...total };
  movement.total.closing = { ...total };

  const cls = emptyPatrakClassification();
  for (const s of students) {
    const c = s.category.toUpperCase();
    if (c.includes("UJAN") || c === "NT" || c === "NOMADIC") cls.ujaniyat++;
    else if (c.includes("MADHYAM")) cls.madhyam++;
    else if (c === "OBC" || c === "SEBC" || c.includes("PACHHAT") || c.includes("BC")) cls.pachhat++;

    const rel = s.religion;
    if (rel === "Muslim") cls.other.muslim++;
    else if (rel === "Sikh") cls.other.sikh++;
    else if (rel === "Parsi") cls.other.parsi++;
    else if (rel === "Christian") cls.other.christian++;
    else if (rel === "Jain") cls.other.jain++;
  }
  cls.groupTotal = cls.ujaniyat + cls.madhyam + cls.pachhat;
  cls.other.total = cls.other.jain + cls.other.parsi + cls.other.muslim + cls.other.sikh + cls.other.christian;
  cls.grandTotal = students.length;

  return { ...meta, movement, classification: cls };
}

function buildScholarshipRows(
  students: { grNumber?: string | null; scholarshipScheme?: string | null; standard?: string | null; section?: string | null; firstName: string; middleName?: string | null; surname: string }[],
): ScholarshipReportRow[] {
  return students
    .filter((s) => s.scholarshipScheme && s.scholarshipScheme !== "None")
    .map((s) => ({
      grNumber: s.grNumber || "",
      name: studentFullName(s),
      waiverType: s.scholarshipScheme!,
      standard: `${s.standard || ""}-${s.section || ""}`,
      conduct: "સારી",
      presentDays: "",
    }));
}

function buildAdmissionRows(
  students: { grNumber?: string | null; admissionStatus?: string | null; verifiedAt?: Date | null; firstName: string; middleName?: string | null; surname: string }[],
): AdmissionReportRow[] {
  return students
    .filter((s) => s.admissionStatus === "verified")
    .slice(0, 8)
    .map((s, i) => ({
      serial: i + 1,
      grNumber: s.grNumber || "",
      name: studentFullName(s),
      admissionDate: s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString("en-GB") : "",
      note: "",
    }));
}

function buildLeaverRows(): LeaverReportRow[] {
  return [];
}

function buildClassRegisterFromAttendance(
  students: {
    id: string;
    grNumber?: string | null;
    caste?: string | null;
    category?: string | null;
    dateOfBirth: string;
    firstName: string;
    middleName?: string | null;
    surname: string;
    rollNumber?: string | null;
  }[],
  saved: Map<string, {
    daysJson: string;
    monthTotal: number;
    prevTotal: number;
    cumulative: number;
    schoolFee?: string | null;
    termFee?: string | null;
    admissionFee?: string | null;
    otherFee?: string | null;
    note?: string | null;
  }>
) {
  return toClassRegisterRows(buildAttendanceRows(students, saved));
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "students";
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const studentId = searchParams.get("studentId");
    const month = searchParams.get("month") || String(new Date().getMonth() + 1);
    const year = searchParams.get("year") || String(new Date().getFullYear());

    if (session.role === "teacher" && type !== "class-register") {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const where: Record<string, unknown> = { schoolId: session.schoolId, status: { not: "archived" } };
    if (classId) where.classId = classId;
    if (standard) where.standard = standard;
    if (section) where.section = section;
    if (studentId) where.id = studentId;

    const students = await prisma.student.findMany({
      where,
      orderBy: [{ rollNumber: "asc" }, { grNumber: "asc" }, { firstName: "asc" }],
      include: { schoolClass: { select: { name: true, standard: true, section: true } } },
    });

    const std = standard || students[0]?.standard || students[0]?.schoolClass?.standard || "";
    const sec = section || students[0]?.section || students[0]?.schoolClass?.section || "";

    if (type === "patrak") {
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      const studentIds = students.map((s) => s.id);
      const records = studentIds.length
        ? await prisma.studentAttendanceMonth.findMany({
            where: { schoolId: session.schoolId, studentId: { in: studentIds }, month: monthNum, year: yearNum },
          })
        : [];
      const saved = new Map(records.map((r) => [r.studentId, r]));
      return NextResponse.json({
        patrak: buildPatrak(students, { month, year, standard: std, section: sec, classTeacher: "" }),
        registerRows: buildClassRegisterFromAttendance(students, saved),
        scholarship: buildScholarshipRows(students),
        admissions: buildAdmissionRows(students),
        leavers: buildLeaverRows(),
      });
    }

    if (type === "general-register") {
      const school = await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { udiseCode: true },
      });
      const grRows = students.map((s, i) => mapStudentToGrRow(s, i + 1, school?.udiseCode));
      const settings = await prisma.schoolSettings.findFirst({ where: { schoolId: session.schoolId } });
      return NextResponse.json({
        rows: grRows,
        schoolName: settings?.schoolName || session.schoolName,
        academicYear: searchParams.get("academicYear") || students[0]?.financialYear || "",
        standard: std,
        section: sec,
      });
    }

    if (type === "class-register") {
      await assertTeacherAttendanceAccess(session, classId);
      const monthNum = parseInt(month, 10);
      const yearNum = parseInt(year, 10);
      const studentIds = students.map((s) => s.id);
      const records = studentIds.length
        ? await prisma.studentAttendanceMonth.findMany({
            where: { schoolId: session.schoolId, studentId: { in: studentIds }, month: monthNum, year: yearNum },
          })
        : [];
      const saved = new Map(records.map((r) => [r.studentId, r]));
      return NextResponse.json({
        rows: buildClassRegisterFromAttendance(students, saved),
        month,
        standard: std,
        section: sec,
      });
    }

    if (type === "monthly-reports") {
      return NextResponse.json({
        scholarship: buildScholarshipRows(students),
        admissions: buildAdmissionRows(students),
        leavers: buildLeaverRows(),
        month,
        year,
      });
    }

    const serialBase = `${year.slice(-2)}${month.padStart(2, "0")}`;
    return NextResponse.json({
      students,
      serialNo: `BC/${serialBase}/${(students[0]?.grNumber || "001").toString().padStart(3, "0")}`,
      lcSerialNo: `LC/${serialBase}/${(students[0]?.grNumber || "001").toString().padStart(3, "0")}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to load certificate data" }, { status: 500 });
  }
}
