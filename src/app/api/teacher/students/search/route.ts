import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { activeStudentStatusFilter } from "@/lib/student-list-filters";
import { studentSearchWhere } from "@/lib/student-search";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["teacher"]);
    const q = String(
      request.nextUrl.searchParams.get("q") ||
        request.nextUrl.searchParams.get("search") ||
        request.nextUrl.searchParams.get("grNumber") ||
        "",
    ).trim();

    if (!session.staffId) {
      return NextResponse.json(
        { error: "Staff profile not linked", students: [] },
        { status: 403 },
      );
    }
    if (!q) {
      return NextResponse.json({ students: [] });
    }

    const searchClause = studentSearchWhere(q);
    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        status: activeStudentStatusFilter(),
        schoolClass: { classTeacherId: session.staffId },
        ...(searchClause || {}),
      },
      orderBy: [{ grNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
      take: 8,
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        firstNameGu: true,
        middleNameGu: true,
        surnameGu: true,
        grNumber: true,
        rollNumber: true,
        standard: true,
        section: true,
        classId: true,
        gender: true,
        dateOfBirth: true,
        mobileNumber: true,
        category: true,
        caste: true,
        fatherName: true,
        motherName: true,
        status: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        schoolClass: {
          select: {
            id: true,
            name: true,
            standard: true,
            section: true,
          },
        },
      },
    });

    return NextResponse.json({ students });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, students: [] },
        { status: error.status },
      );
    }
    console.error("GET /api/teacher/students/search:", error);
    return NextResponse.json(
      { error: "Student search failed", students: [] },
      { status: 500 },
    );
  }
}
