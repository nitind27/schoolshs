import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { enrolledStudentStatusFilter } from "@/lib/student-list-filters";
import { sortStudentsBySavedRoll } from "@/lib/roll-order";
import {
  cleanEditLinkFields,
  formatStoredEditLink,
  generateEditLinkCode,
  generateEditLinkPassword,
  sealEditLinkPassword,
} from "@/lib/student-edit-link";

const linkInclude = {
  schoolClass: {
    select: { id: true, name: true, standard: true, section: true, academicYear: true },
  },
} as const;

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const links = await prisma.studentEditLink.findMany({
      where: { schoolId: session.schoolId },
      include: linkInclude,
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ links: links.map(formatStoredEditLink) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[edit-links GET]", error);
    return NextResponse.json({ error: "Failed to load links" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const body = await request.json();
    const classId = String(body.classId || "").trim();
    const fields = cleanEditLinkFields(body.fields);
    if (!classId) {
      return NextResponse.json({ error: "Select a class" }, { status: 400 });
    }
    if (!fields.length) {
      return NextResponse.json({ error: "Select at least one field" }, { status: 400 });
    }

    const schoolClass = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!schoolClass) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const studentCount = await prisma.student.count({
      where: {
        schoolId: session.schoolId,
        classId,
        status: enrolledStudentStatusFilter(),
      },
    });
    if (!studentCount) {
      return NextResponse.json({ error: "This class has no students" }, { status: 400 });
    }

    const password = generateEditLinkPassword();
    let created = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateEditLinkCode();
      try {
        created = await prisma.studentEditLink.create({
          data: {
            schoolId: session.schoolId,
            classId,
            code,
            passwordEnc: sealEditLinkPassword(password),
            fieldsJson: fields,
            createdById: session.userId,
          },
          include: linkInclude,
        });
        break;
      } catch (error) {
        const codeTaken =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002";
        if (!codeTaken || attempt === 4) throw error;
      }
    }
    if (!created) {
      return NextResponse.json({ error: "Could not create link" }, { status: 500 });
    }

    const students = sortStudentsBySavedRoll(
      await prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          classId,
          status: enrolledStudentStatusFilter(),
        },
        select: {
          id: true,
          firstName: true,
          middleName: true,
          surname: true,
          gender: true,
          grNumber: true,
          rollNumber: true,
        },
      }),
    );

    return NextResponse.json({ link: formatStoredEditLink(created), students });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[edit-links POST]", error);
    return NextResponse.json({ error: "Failed to create link" }, { status: 500 });
  }
}
