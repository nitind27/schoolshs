import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { categoryFromCaste } from "@/lib/category-inference";

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    const rows = await prisma.student.findMany({
      where: { schoolId: session.schoolId, caste: { not: null } },
      select: { caste: true },
      distinct: ["caste"],
    });
    const castes = rows
      .map((row) => String(row.caste || "").trim())
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    return NextResponse.json({ castes });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load castes" }, { status: 500 });
  }
}

/** Rename one caste on every student in this school, then refresh their register row. */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as { from?: string; to?: string };
    const from = String(body.from || "").trim();
    const to = String(body.to || "").trim();
    if (!from || !to) {
      return NextResponse.json({ error: "Both castes are required" }, { status: 400 });
    }
    if (from === to) {
      return NextResponse.json({ updated: 0 });
    }

    const students = await prisma.student.findMany({
      where: { schoolId: session.schoolId, caste: from },
    });
    if (!students.length) {
      return NextResponse.json({ updated: 0 });
    }

    await prisma.student.updateMany({
      where: { schoolId: session.schoolId, id: { in: students.map((student) => student.id) } },
      data: { caste: to },
    });

    const categoryGroups = new Map<string, string[]>();
    for (const student of students) {
      const nextCategory = categoryFromCaste({
        caste: to,
        surname: student.surname,
        religion: student.religion,
      });
      if (!nextCategory || nextCategory === student.category) continue;
      const ids = categoryGroups.get(nextCategory) || [];
      ids.push(student.id);
      categoryGroups.set(nextCategory, ids);
    }
    for (const [category, ids] of categoryGroups) {
      await prisma.student.updateMany({
        where: { schoolId: session.schoolId, id: { in: ids } },
        data: { category },
      });
    }

    for (const student of students) {
      const nextCategory = categoryFromCaste({
        caste: to,
        surname: student.surname,
        religion: student.religion,
      });
      await syncGrEntryForStudent(session.schoolId, {
        ...student,
        caste: to,
        category: nextCategory || student.category,
      });
    }

    return NextResponse.json({ updated: students.length });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to update caste" }, { status: 500 });
  }
}
