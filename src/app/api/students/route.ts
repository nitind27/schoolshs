import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { fillStudentGuNames } from "@/lib/gujarati/transliterate-server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { applyDraftDefaults } from "@/lib/student-draft";
import { findStudentByGrNumber, syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { genderDbMatchValues } from "@/lib/gender-utils";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "@/lib/student-write";
import { applyStudentPlacement } from "@/lib/student-placement";
import { MANAGE_STANDARDS } from "@/lib/class-structure";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "@/lib/student-account";
import { activeStudentStatusFilter } from "@/lib/student-list-filters";
import { studentSearchWhere } from "@/lib/student-search";

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
    const academicYear = searchParams.get("academicYear");
    const institutionName = searchParams.get("institutionName");
    const scholarshipScheme = searchParams.get("scholarshipScheme");
    const idsParam = searchParams.get("ids");
    const includeSummary = searchParams.get("summary") === "1";
    const includeArchived = searchParams.get("includeArchived") === "1";
    const includeDraft = searchParams.get("includeDraft") === "1";
    const noClass = searchParams.get("noClass") === "1";
    const pendingDivision = searchParams.get("pendingDivision") === "1";
    const lite = searchParams.get("lite") === "1";
    const page = parseInt(searchParams.get("page") || "1");
    // Auto-Apply and similar screens request up to 500 ready students.
    const limit = Math.min(parseInt(searchParams.get("limit") || "25") || 25, 500);

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (idsParam) {
      const idList = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (idList.length) where.id = { in: idList };
    }
    if (status) {
      where.status = status;
    } else if (idsParam) {
      if (!includeArchived) where.status = { not: "archived" };
    } else if (includeDraft || includeArchived) {
      if (!includeArchived) where.status = { not: "archived" };
    } else {
      where.status = activeStudentStatusFilter();
    }
    if (category) where.category = category;
    if (gender && gender !== "all") {
      where.gender = { in: genderDbMatchValues(gender) };
    }
    if (institutionName) where.institutionName = { contains: institutionName };
    if (scholarshipScheme) where.scholarshipScheme = scholarshipScheme;

    if (noClass) {
      where.classId = null;
      where.AND = [{ OR: [{ standard: null }, { standard: "" }] }];
    } else if (pendingDivision) {
      where.classId = null;
      where.AND = [
        { standard: { not: null } },
        { NOT: { standard: "" } },
      ];
      if (standard) where.standard = standard;
    } else if (classId) {
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
        // Unknown / other-school class — never match cross-tenant rows
        where.id = "__no_such_class__";
      }
    } else {
      if (standard) where.standard = standard;
      if (section) where.section = section;
    }

    if (search) {
      const searchClause = studentSearchWhere(search);
      if (searchClause) {
        const extraAnd: object[] = [];
        if (where.OR) {
          extraAnd.push({ OR: where.OR });
          delete where.OR;
        }
        extraAnd.push(searchClause);
        const existingAnd = Array.isArray(where.AND)
          ? [...(where.AND as object[])]
          : where.AND
            ? [where.AND as object]
            : [];
        where.AND = [...existingAnd, ...extraAnd];
      }
    }

    if (academicYear) {
      const yearClause = {
        OR: [
          { financialYear: academicYear },
          { schoolClass: { is: { academicYear } } },
        ],
      };
      const existingAnd = Array.isArray(where.AND)
        ? [...(where.AND as object[])]
        : where.AND
          ? [where.AND as object]
          : [];
      if (where.OR) {
        existingAnd.unshift({ OR: where.OR });
        delete where.OR;
      }
      existingAnd.push(yearClause);
      where.AND = existingAnd;
    }

    const classSelect = {
      id: true,
      name: true,
      standard: true,
      section: true,
      stream: true,
      academicYear: true,
    } as const;

    const listSelect = {
      id: true,
      grNumber: true,
      rollNumber: true,
      mobileNumber: true,
      category: true,
      gender: true,
      status: true,
      admissionStatus: true,
      standard: true,
      section: true,
      firstName: true,
      middleName: true,
      surname: true,
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      schoolClass: { select: classSelect },
    } as const;

    const skip = (page - 1) * limit;
    const orderBy = [
      { standard: "asc" as const },
      { section: "asc" as const },
      { rollNumber: "asc" as const },
      { surname: "asc" as const },
      { firstName: "asc" as const },
    ];
    const [students, total] = await Promise.all([
      lite
        ? prisma.student.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            select: listSelect,
          })
        : prisma.student.findMany({
            where,
            orderBy,
            skip,
            take: limit,
            include: { schoolClass: { select: classSelect } },
          }),
      prisma.student.count({ where }),
    ]);

    let summary:
      | {
          total: number;
          male: number;
          female: number;
          other: number;
          noClass: number;
          draftCount: number;
          byStandard: Record<string, { total: number; pendingDivision: number }>;
        }
      | undefined;

    if (includeSummary) {
      const base = {
        schoolId: session.schoolId,
        status: activeStudentStatusFilter(),
      } as const;
      const stdCounts = MANAGE_STANDARDS.map((std) =>
        prisma.student.count({ where: { ...base, standard: std } }),
      );
      const stdPending = MANAGE_STANDARDS.map((std) =>
        prisma.student.count({
          where: { ...base, standard: std, classId: null },
        }),
      );
      const [sumTotal, male, female, other, noClassCount, draftCount, ...rest] = await Promise.all([
        prisma.student.count({ where: base }),
        prisma.student.count({
          where: { ...base, gender: { in: genderDbMatchValues("Male") } },
        }),
        prisma.student.count({
          where: { ...base, gender: { in: genderDbMatchValues("Female") } },
        }),
        prisma.student.count({
          where: { ...base, gender: { in: genderDbMatchValues("Other") } },
        }),
        prisma.student.count({
          where: {
            ...base,
            classId: null,
            OR: [{ standard: null }, { standard: "" }],
          },
        }),
        prisma.student.count({
          where: { schoolId: session.schoolId, status: "draft" },
        }),
        ...stdCounts,
        ...stdPending,
      ]);
      const byStandard: Record<string, { total: number; pendingDivision: number }> = {};
      MANAGE_STANDARDS.forEach((std, i) => {
        byStandard[std] = {
          total: rest[i] ?? 0,
          pendingDivision: rest[MANAGE_STANDARDS.length + i] ?? 0,
        };
      });
      summary = {
        total: sumTotal,
        male,
        female,
        other,
        noClass: noClassCount,
        draftCount,
        byStandard,
      };
    }

    return NextResponse.json({ students, total, page, limit, summary });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("GET /api/students error:", error);
    return NextResponse.json(
      { error: "Failed to fetch students", students: [], total: 0, page: 1, limit: 25 },
      { status: 500 },
    );
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
        } else {
          // Never attach another school's classId
          data.classId = null;
        }
      }

      const errors = validateStudent(data);

      const gr = String(data.grNumber || "").trim();
      if (gr) {
        const byGr = await findStudentByGrNumber(session.schoolId, gr);
        if (byGr) {
          await assertStudentAccountEmailAvailable(data.email, byGr.id);
          const student = await prisma.student.update({
            where: { id: byGr.id },
            data: toStudentUncheckedUpdate(data as Record<string, unknown>, {
              schoolId: session.schoolId,
              status: "draft",
              validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
            }),
          });
          await syncStudentPortalAccount(student);
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

      await assertStudentAccountEmailAvailable(data.email);
      const student = await prisma.student.create({
        data: toStudentUncheckedCreate(data as Record<string, unknown>, {
          schoolId: session.schoolId,
          status: "draft",
          validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
        }),
      });

      await syncStudentPortalAccount(student);
      await syncGrEntryForStudent(session.schoolId, student);
      return NextResponse.json(student, { status: 201 });
    }

    const data = await fillStudentGuNames(normalizeStudentRow(body));

    let assignedClass = null;
    if (data.classId) {
      assignedClass = await prisma.schoolClass.findFirst({
        where: { id: data.classId, schoolId: session.schoolId },
      });
      if (!assignedClass) {
        return NextResponse.json({ error: "Selected class not found for this school" }, { status: 400 });
      }
    }
    const placed = applyStudentPlacement(data as Record<string, unknown>, assignedClass);
    if (placed.error) {
      return NextResponse.json({ error: placed.error }, { status: 400 });
    }

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

    await assertStudentAccountEmailAvailable(data.email);
    const student = await prisma.student.create({
      data: toStudentUncheckedCreate(data as Record<string, unknown>, {
        schoolId: session.schoolId,
        status: errors.length === 0 ? "ready" : "draft",
        validationErrors: errors.length > 0 ? JSON.stringify(errors) : null,
      }),
    });

    await syncStudentPortalAccount(student);
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
