import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { CATEGORIES } from "@/lib/constants";
import { isBuiltinReligion, resolveReligionName } from "@/lib/school-religions";

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
    const religion = resolveReligionName(String(body.religion ?? student.religion ?? ""));

    if (category && !CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
      return NextResponse.json({ error: "Unknown category" }, { status: 400 });
    }
    if (!religion || religion.length > 80) {
      return NextResponse.json({ error: "Religion is required" }, { status: 400 });
    }
    let savedReligion = religion;
    if (!isBuiltinReligion(savedReligion)) {
      const existing = await prisma.schoolReligion.findMany({
        where: { schoolId: session.schoolId },
        select: { name: true },
      });
      const match = existing.find((row) => row.name.toLowerCase() === savedReligion.toLowerCase());
      if (match) savedReligion = match.name;
      else {
        await prisma.schoolReligion.create({
          data: { schoolId: session.schoolId, name: savedReligion },
        });
      }
    }

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        caste: caste || null,
        category: category || student.category,
        religion: savedReligion,
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
