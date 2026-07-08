import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { studentFullName } from "@/lib/certificates/date-to-words";
import type { MonthlyPatrakData, ClassRegisterRow, ScholarshipReportRow, AdmissionReportRow, LeaverReportRow } from "@/lib/certificates/types";

function countByGender(students: { gender: string }[]) {
  const boys = students.filter((s) => s.gender === "Male").length;
  const girls = students.filter((s) => s.gender === "Female").length;
  return { boys, girls };
}

function categoryToCasteKey(category: string, religion: string): keyof MonthlyPatrakData["caste"] | null {
  const c = category.toUpperCase();
  if (c === "SC") return "sc";
  if (c === "ST") return "st";
  if (c === "OBC" || c === "SEBC") return "obc";
  if (religion === "Muslim") return "muslim";
  if (religion === "Sikh") return "sikh";
  if (religion === "Parsi") return "parsi";
  if (religion === "Christian") return "christian";
  if (religion === "Hindu") return "hindu";
  return null;
}

function buildPatrak(students: { gender: string; category: string; religion: string }[], meta: { month: string; year: string; standard: string; section: string; classTeacher: string }): MonthlyPatrakData {
  const total = countByGender(students);
  const caste: MonthlyPatrakData["caste"] = {
    sc: { boys: 0, girls: 0 }, st: { boys: 0, girls: 0 }, vj: { boys: 0, girls: 0 },
    obc: { boys: 0, girls: 0 }, hindu: { boys: 0, girls: 0 }, muslim: { boys: 0, girls: 0 },
    sikh: { boys: 0, girls: 0 }, parsi: { boys: 0, girls: 0 }, christian: { boys: 0, girls: 0 },
  };
  for (const s of students) {
    const key = categoryToCasteKey(s.category, s.religion);
    if (key) {
      if (s.gender === "Male") caste[key].boys++;
      else caste[key].girls++;
    }
  }
  const zero = { boys: 0, girls: 0 };
  return {
    ...meta,
    opening: { fullFee: total, schoolWaiver: zero, govtSt: zero, govtSc: zero, govtPoor: zero, govtObc: zero, total },
    admitted: { newPaid: zero, newUnpaid: zero, transferPaid: zero, transferUnpaid: zero },
    left: { schoolPaid: zero, schoolUnpaid: zero, classPaid: zero, classUnpaid: zero },
    change: zero,
    closing: total,
    caste,
    avgAttendance: zero,
    workingDays: { full: 26, half: 0, sundays: 4, holidays: 0, prevTotal: 0, monthTotal: 26, cumulative: 26 },
    fees: { schoolCount: students.length, schoolRs: 0, schoolPs: 0, termCount: 0, termRs: 0, termPs: 0, otherCount: 0, otherRs: 0, otherPs: 0, arrearsSchool: 0, arrearsTerm: 0 },
    date: `${new Date().getDate().toString().padStart(2, "0")}/${meta.month.padStart(2, "0")}/${meta.year}`,
  };
}

function buildClassRegister(students: {
  grNumber?: string | null; caste?: string | null; dateOfBirth: string;
  firstName: string; middleName?: string | null; surname: string;
  standard?: string | null; section?: string | null;
}[]): ClassRegisterRow[] {
  return students.map((s, i) => ({
    grNumber: s.grNumber || "",
    caste: s.caste || "",
    dob: s.dateOfBirth,
    schoolFee: "", termFee: "", admissionFee: "", otherFee: "", totalFee: "",
    serial: i + 1,
    name: studentFullName(s),
    attendance: Array(31).fill(null),
    monthTotal: "", prevTotal: "", cumulative: "", note: "",
  }));
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
      return NextResponse.json({ patrak: buildPatrak(students, { month, year, standard: std, section: sec, classTeacher: "" }) });
    }

    if (type === "class-register") {
      return NextResponse.json({ rows: buildClassRegister(students), month, standard: std, section: sec });
    }

    if (type === "monthly-reports") {
      const scholarship: ScholarshipReportRow[] = students
        .filter((s) => s.scholarshipScheme && s.scholarshipScheme !== "None")
        .map((s) => ({
          grNumber: s.grNumber || "",
          name: studentFullName(s),
          waiverType: s.scholarshipScheme,
          standard: `${s.standard || ""}-${s.section || ""}`,
          conduct: "સારી",
          presentDays: "",
        }));

      const admissions: AdmissionReportRow[] = students
        .filter((s) => s.admissionStatus === "verified")
        .slice(0, 6)
        .map((s, i) => ({
          serial: i + 1,
          grNumber: s.grNumber || "",
          name: studentFullName(s),
          admissionDate: s.verifiedAt ? new Date(s.verifiedAt).toLocaleDateString("en-GB") : "",
          note: "",
        }));

      const leavers: LeaverReportRow[] = [];

      return NextResponse.json({ scholarship, admissions, leavers, month, year });
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
