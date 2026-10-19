import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { CATEGORIES, RELIGIONS } from "@/lib/constants";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const { id } = await params;
    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const body = (await request.json()) as {
      caste?: string;
      category?: string;
      religion?: string;
    };
    const caste = String(body.caste ?? student.caste ?? "").trim();
    const category = String(body.category ?? student.category ?? "").trim();
    const religion = String(body.religion ?? student.religion ?? "").trim();

    if (category && !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }
    if (religion && !RELIGIONS.includes(religion as (typeof RELIGIONS)[number])) {
      return NextResponse.json({ error: "Unknown religion" }, { status: 400 });
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        caste: caste || null,
        category: category || student.category,
        religion: religion || student.religion,
      },
    });
    await syncGrEntryForStudent(session.schoolId, updated);

    return NextResponse.json({
      id: updated.id,
      caste: updated.caste || "",
      category: updated.category || "",
      religion: updated.religion || "",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
