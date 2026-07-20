import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  entryPayloadFromStudent,
  filterGrRows,
  dedupeGrRows,
  mergeStudentsWithGrEntries,
} from "@/lib/certificates/general-register";

function entryToDbData(body: Record<string, unknown>) {
  const birthPlaceLines = Array.isArray(body.birthPlaceLines)
    ? body.birthPlaceLines.map(String)
    : String(body.birthPlace || "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

  return {
    grNumber: String(body.grNumber || "").trim(),
    studentId: body.studentId ? String(body.studentId) : null,
    surname: String(body.surname || ""),
    firstName: String(body.firstName || ""),
    fatherName: String(body.fatherName || ""),
    motherName: String(body.motherName || ""),
    religionCaste: String(body.religionCaste || ""),
    birthPlaceJson: JSON.stringify(birthPlaceLines),
    dateOfBirth: String(body.dateOfBirth || ""),
    dobWordsGu: String(body.dobWordsGu || ""),
    childUidDigits: String(body.childUidDigits || "").replace(/\D/g, "").slice(0, 18),
    lastSchool: String(body.lastSchool || ""),
    udiseDigits: String(body.udiseDigits || "").replace(/\D/g, "").slice(0, 11),
    admissionDate: String(body.admissionDate || ""),
    feeStatus: String(body.feeStatus || ""),
    standard: String(body.standard || ""),
    section: String(body.section || ""),
    progress: String(body.progress || ""),
    conduct: String(body.conduct || "સારી"),
    leavingDate: String(body.leavingDate || ""),
    leavingStdClass: String(body.leavingStdClass || ""),
    lcIssueDate: String(body.lcIssueDate || ""),
    remarks: String(body.remarks || ""),
  };
}

async function studentWhere(session: { schoolId: string }, params: URLSearchParams) {
  const classId = params.get("classId");
  const standard = params.get("standard");
  const section = params.get("section");
  const where: Record<string, unknown> = { schoolId: session.schoolId, status: { not: "archived" } };

  if (classId) {
    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { standard: true, section: true, stream: true },
    });
    if (cls) {
      where.classId = classId;
    } else {
      where.classId = classId;
    }
  } else {
    if (standard) where.standard = standard;
    if (section) where.section = section;
  }

  return where;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const params = request.nextUrl.searchParams;
    const academicYear = params.get("academicYear") || "2025-26";
    const prefillStudentId = params.get("prefillStudentId");
    const classId = params.get("classId");

    if (prefillStudentId) {
      const student = await prisma.student.findFirst({
        where: { id: prefillStudentId, schoolId: session.schoolId },
      });
      if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

      const school = await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { udiseCode: true },
      });

      const payload = entryPayloadFromStudent(student, academicYear, student.grNumber || "", school?.udiseCode);
      return NextResponse.json({
        prefill: {
          ...payload,
          studentId: student.id,
          mobileNumber: student.mobileNumber,
        },
      });
    }

    if (!classId) {
      const settings = await prisma.schoolSettings.findFirst({ where: { schoolId: session.schoolId } });
      return NextResponse.json({
        rows: [],
        schoolName: settings?.schoolName || session.schoolName,
        academicYear,
        class: null,
        needsClass: true,
        students: [],
        hasSavedEntries: false,
      });
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true, name: true, standard: true, section: true, stream: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: { udiseCode: true },
    });
    const settings = await prisma.schoolSettings.findFirst({ where: { schoolId: session.schoolId } });

    const students = await prisma.student.findMany({
      where: await studentWhere(session, params),
      orderBy: [{ rollNumber: "asc" }, { grNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    });

    const studentIds = students.map((s) => s.id);
    const grNumbers = students.map((s) => s.grNumber).filter((g): g is string => Boolean(g?.trim()));

    const entries =
      studentIds.length > 0
        ? await prisma.generalRegisterEntry.findMany({
            where: {
              schoolId: session.schoolId,
              academicYear,
              OR: [
                { studentId: { in: studentIds } },
                ...(grNumbers.length ? [{ grNumber: { in: grNumbers } }] : []),
              ],
            },
            include: { student: { select: { mobileNumber: true } } },
          })
        : [];

    let rows = dedupeGrRows(mergeStudentsWithGrEntries(students, entries, school?.udiseCode));

    const query = params.get("query")?.trim();
    const dob = params.get("dob")?.trim();
    if (query || dob) {
      rows = filterGrRows(rows, { query, dob });
    }

    const streamLabel = cls.stream ? ` ${cls.stream}` : "";
    const classLabel = `ધોરણ ${cls.standard}${streamLabel} — વર્ગ ${cls.section}`;

    return NextResponse.json({
      rows,
      schoolName: settings?.schoolName || session.schoolName,
      academicYear,
      class: {
        id: cls.id,
        name: cls.name,
        standard: cls.standard,
        section: cls.section,
        stream: cls.stream,
        label: classLabel,
      },
      studentCount: students.length,
      savedEntryCount: entries.length,
      students: students.map((s) => ({
        id: s.id,
        grNumber: s.grNumber,
        name: [s.firstName, s.middleName, s.surname].filter(Boolean).join(" "),
        standard: s.standard,
        section: s.section,
        mobileNumber: s.mobileNumber,
        dateOfBirth: s.dateOfBirth,
      })),
      hasSavedEntries: entries.length > 0,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to load register" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const action = String(body.action || "save");

    if (action === "import-class") {
      const academicYear = String(body.academicYear || "2025-26");
      const params = new URLSearchParams();
      if (body.classId) params.set("classId", String(body.classId));
      if (body.standard) params.set("standard", String(body.standard));
      if (body.section) params.set("section", String(body.section));

      const school = await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: { udiseCode: true },
      });

      const students = await prisma.student.findMany({
        where: await studentWhere(session, params),
        orderBy: [{ grNumber: "asc" }, { rollNumber: "asc" }],
      });

      const existing = await prisma.generalRegisterEntry.findMany({
        where: { schoolId: session.schoolId, academicYear },
        select: { studentId: true, grNumber: true },
      });
      const usedStudentIds = new Set(existing.map((e) => e.studentId).filter(Boolean));
      const usedGrNumbers = new Set(existing.map((e) => e.grNumber));

      let imported = 0;
      for (const student of students) {
        if (usedStudentIds.has(student.id)) continue;
        const grNumber = student.grNumber || String(imported + existing.length + 1);
        if (usedGrNumbers.has(grNumber)) continue;

        const data = entryPayloadFromStudent(student, academicYear, grNumber, school?.udiseCode);
        await prisma.generalRegisterEntry.create({
          data: {
            schoolId: session.schoolId,
            academicYear,
            studentId: student.id,
            grNumber: data.grNumber,
            surname: data.surname,
            firstName: data.firstName,
            fatherName: data.fatherName,
            motherName: data.motherName,
            religionCaste: data.religionCaste,
            birthPlaceJson: JSON.stringify(data.birthPlaceLines),
            dateOfBirth: data.dateOfBirth,
            dobWordsGu: data.dobWordsGu,
            childUidDigits: data.childUidDigits,
            lastSchool: data.lastSchool,
            udiseDigits: data.udiseDigits,
            admissionDate: data.admissionDate,
            feeStatus: data.feeStatus,
            standard: data.standard,
            section: data.section,
            progress: data.progress,
            conduct: data.conduct,
            leavingDate: data.leavingDate,
            leavingStdClass: data.leavingStdClass,
            lcIssueDate: data.lcIssueDate,
            remarks: data.remarks,
          },
        });
        usedStudentIds.add(student.id);
        usedGrNumbers.add(grNumber);
        imported++;
      }

      return NextResponse.json({ ok: true, imported });
    }

    const academicYear = String(body.academicYear || "2025-26");
    const data = entryToDbData(body);
    if (!data.grNumber) return NextResponse.json({ error: "Register number required" }, { status: 400 });

    const entry = await prisma.generalRegisterEntry.create({
      data: { schoolId: session.schoolId, academicYear, ...data },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to save entry" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = await request.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.generalRegisterEntry.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const data = entryToDbData(body);
    if (!data.grNumber) return NextResponse.json({ error: "Register number required" }, { status: 400 });

    const entry = await prisma.generalRegisterEntry.update({
      where: { id },
      data,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const id = request.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.generalRegisterEntry.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await prisma.generalRegisterEntry.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
