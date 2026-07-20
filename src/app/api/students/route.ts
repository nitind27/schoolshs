import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { fillStudentGuNames } from "@/lib/gujarati/transliterate-server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { applyDraftDefaults } from "@/lib/student-draft";
import { findStudentByGrNumber, syncGrEntryForStudent } from "@/lib/gr-student-sync";

function studentDisplayName(s: { firstName?: string | null; surname?: string | null }) {
  return [s.firstName, s.surname].filter(Boolean).join(" ").trim() || "Student";
}
export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const search = searchParams.get("search");
    const classId = searchParams.get("classId");
    const standard = searchParams.get("standard");
    const section = searchParams.get("section");
    const gender = searchParams.get("gender");
    const institutionName = searchParams.get("institutionName");
    const scholarshipScheme = searchParams.get("scholarshipScheme");
    const idsParam = searchParams.get("ids");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (idsParam) {
      const idList = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (idList.length) where.id = { in: idList };
    }
    if (status) where.status = status;
    if (category) where.category = category;
    if (gender) where.gender = gender;
    if (institutionName) where.institutionName = { contains: institutionName };
    if (scholarshipScheme) where.scholarshipScheme = scholarshipScheme;

    if (classId) {
      const cls = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
        select: { standard: true, section: true },
      });
      if (cls) {
        where.OR = [
          { classId },
          { classId: null, standard: cls.standard, section: cls.section },
        ];
      } else {
        where.classId = classId;
      }
    } else {
      if (standard) where.standard = standard;
      if (section) where.section = section;
    }

    if (search) {
      const searchOr = [
        { firstName: { contains: search } },
        { surname: { contains: search } },
        { aadhaarNumber: { contains: search } },
        { mobileNumber: { contains: search } },
        { institutionName: { contains: search } },
        { rollNumber: { contains: search } },
        { grNumber: { contains: search } },
        { childUid: { contains: search } },
      ];
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchOr }];
        delete where.OR;
      } else {
        where.OR = searchOr;
      }
    }

    const [students, total] = await Promise.all([
      prisma.student.findMany({
        where,
        orderBy: [{ standard: "asc" }, { section: "asc" }, { rollNumber: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
        include: {
          schoolClass: {
            select: { id: true, name: true, standard: true, section: true, academicYear: true },
          },
        },
      }),
      prisma.student.count({ where }),
    ]);

    return NextResponse.json({ students, total, page, limit });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/students error:", error);
    return NextResponse.json({ error: "Failed to fetch students", students: [], total: 0, page: 1, limit: 50 }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const body = await request.json();
    const isDraft = body.draft === true;

    if (isDraft) {
      const data = await fillStudentGuNames(applyDraftDefaults(normalizeStudentRow(body)));

      if (data.classId) {
        const assignedClass = await prisma.schoolClass.findFirst({
          where: { id: data.classId, schoolId: session.schoolId },
        });
        if (assignedClass) {
          data.standard = assignedClass.standard;
          data.section = assignedClass.section;
          data.institutionName = assignedClass.institutionName || data.institutionName;
          data.institutionDistrict = assignedClass.institutionDistrict || data.institutionDistrict;
          data.financialYear = assignedClass.academicYear || data.financialYear;
          data.courseName = data.courseName || `Class ${assignedClass.standard}`;
        }
      }

      const errors = validateStudent(data);

      const gr = String(data.grNumber || "").trim();
      if (gr) {
        const byGr = await findStudentByGrNumber(session.schoolId, gr);
        if (byGr) {
          const student = await prisma.student.update({
            where: { id: byGr.id },
            data: {
              ...data,
              schoolId: session.schoolId,
              status: "draft",
              validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
            } as Parameters<typeof prisma.student.update>[0]["data"],
          });
          await syncGrEntryForStudent(session.schoolId, student);
          return NextResponse.json(student);
        }
      }

      const existing = await prisma.student.findUnique({
        where: {
          schoolId_aadhaarNumber: {
            schoolId: session.schoolId,
            aadhaarNumber: data.aadhaarNumber!,
          },
        },
      });
      if (existing) {
        return NextResponse.json({ error: "Draft conflict — please refresh the page" }, { status: 409 });
      }

      const student = await prisma.student.create({
        data: {
          ...data,
          schoolId: session.schoolId,
          status: "draft",
          validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
        } as Parameters<typeof prisma.student.create>[0]["data"],
      });

      await syncGrEntryForStudent(session.schoolId, student);
      return NextResponse.json(student, { status: 201 });
    }

    const data = await fillStudentGuNames(normalizeStudentRow(body));

    if (!data.classId) {
      return NextResponse.json({ error: "Class is required. Please assign a class before saving student." }, { status: 400 });
    }

    const assignedClass = await prisma.schoolClass.findFirst({
      where: { id: data.classId, schoolId: session.schoolId },
    });
    if (!assignedClass) {
      return NextResponse.json({ error: "Selected class not found for this school" }, { status: 400 });
    }

    data.standard = assignedClass.standard;
    data.section = assignedClass.section;
    data.institutionName = assignedClass.institutionName || data.institutionName;
    data.institutionDistrict = assignedClass.institutionDistrict || data.institutionDistrict;
    data.financialYear = assignedClass.academicYear || data.financialYear;
    data.courseName = data.courseName || `Class ${assignedClass.standard}`;

    const errors = validateStudent(data);

    if (errors.length > 0) {
      return NextResponse.json({ errors }, { status: 400 });
    }

    const existing = await prisma.student.findUnique({
      where: {
        schoolId_aadhaarNumber: {
          schoolId: session.schoolId,
          aadhaarNumber: data.aadhaarNumber!,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ error: "Student with this Aadhaar already exists in your school" }, { status: 409 });
    }

    const student = await prisma.student.create({
      data: {
        ...data,
        schoolId: session.schoolId,
        status: errors.length === 0 ? "ready" : "draft",
        validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
      } as Parameters<typeof prisma.student.create>[0]["data"],
    });

    await syncGrEntryForStudent(session.schoolId, student);

    const name = studentDisplayName(student);
    const classLabel = [student.standard, student.section].filter(Boolean).join("-");
    const notifBody = classLabel
      ? `Class ${classLabel} · added to records`
      : "Added to student records";
    void (async () => {
      const recipients = await prisma.user.findMany({
        where: {
          schoolId: session.schoolId,
          isActive: true,
          role: { in: ["school_admin", "teacher", "clerk"] },
          id: { not: session.userId },
        },
        select: { id: true, role: true },
      });
      if (!recipients.length) return;
      await prisma.notification.createMany({
        data: recipients.map((u) => ({
          userId: u.id,
          schoolId: session.schoolId,
          type: "student",
          title: `New student: ${name}`,
          body: notifBody,
          href: u.role === "teacher" ? "/teacher/students" : `/students/${student.id}`,
          metaJson: JSON.stringify({ studentId: student.id }),
        })),
      });
    })().catch((err) => console.error("[student notify]", err));

    return NextResponse.json(student, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Create student error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create student";
    if (msg.includes("Unknown column") && msg.includes("Gu")) {
      return NextResponse.json(
        {
          error:
            "Database needs Gujarati name columns. Run: npm run db:migrate-gu-names (with dev server on)",
        },
        { status: 500 },
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
