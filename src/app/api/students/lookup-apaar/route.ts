import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { STUDENT_FORM_FIELD_KEYS } from "@/lib/student-form-map";

function normalizeApaar(raw: string) {
  return String(raw || "").replace(/\s/g, "").trim().toUpperCase();
}

const INCLUDE = {
  schoolClass: {
    select: { id: true, name: true, standard: true, section: true, academicYear: true },
  },
} as const;

function toClientStudent(
  student: Record<string, unknown> & {
    schoolClass?: {
      id: string;
      name: string;
      standard: string | null;
      section: string | null;
      academicYear: string;
    } | null;
  },
) {
  const form: Record<string, unknown> = {};
  for (const key of STUDENT_FORM_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(student, key)) {
      form[key] = student[key as string];
    }
  }
  form.id = student.id;
  form.classId = student.classId ?? null;
  if (student.schoolClass) {
    form.schoolClass = student.schoolClass;
    if (!form.standard && student.schoolClass.standard) {
      form.standard = student.schoolClass.standard;
    }
    if (!form.section && student.schoolClass.section) {
      form.section = student.schoolClass.section;
    }
    form.className = student.schoolClass.name;
  }
  if (form.apaarId) {
    form.apaarId = normalizeApaar(String(form.apaarId));
  }
  return form;
}

/** Lookup school student by APAAR / UPPAR ID and return full record for form fill. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const apaarId = normalizeApaar(request.nextUrl.searchParams.get("apaarId") || "");

    if (!apaarId || apaarId.length < 8) {
      return NextResponse.json(
        { error: "Enter a valid APAAR / UPPAR ID", found: false },
        { status: 400 },
      );
    }

    let student = await prisma.student.findFirst({
      where: {
        schoolId: session.schoolId,
        apaarId,
        status: { not: "archived" },
      },
      include: INCLUDE,
    });

    if (!student) {
      student = await prisma.student.findFirst({
        where: {
          schoolId: session.schoolId,
          apaarId: { contains: apaarId },
          status: { not: "archived" },
        },
        include: INCLUDE,
      });
    }

    if (!student && /^\d{8,16}$/.test(apaarId)) {
      const candidates = await prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          apaarId: { not: null },
          status: { not: "archived" },
        },
        include: INCLUDE,
        take: 500,
      });
      student =
        candidates.find((s) => normalizeApaar(s.apaarId || "") === apaarId) || null;
    }

    if (!student) {
      return NextResponse.json({
        found: false,
        apaarId,
        message: "No student found with this APAAR / UPPAR ID in your school",
      });
    }

    const formStudent = toClientStudent(
      student as unknown as Record<string, unknown> & {
        schoolClass?: {
          id: string;
          name: string;
          standard: string | null;
          section: string | null;
          academicYear: string;
        } | null;
      },
    );

    return NextResponse.json({
      found: true,
      student: formStudent,
      source: "apaar",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, found: false }, { status: error.status });
    }
    console.error("GET /api/students/lookup-apaar error:", error);
    return NextResponse.json({ error: "Lookup failed", found: false }, { status: 500 });
  }
}
