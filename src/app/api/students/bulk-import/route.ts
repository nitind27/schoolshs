import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { fillStudentGuNames } from "@/lib/gujarati/transliterate-server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { toStudentUncheckedCreate, toStudentUncheckedUpdate } from "@/lib/student-write";
import { applyStudentPlacement } from "@/lib/student-placement";
import { fillImportDefaults } from "@/lib/import/student-import";
import { standardToCourseName } from "@/lib/constants";
import {
  assertStudentAccountEmailAvailable,
  syncStudentPortalAccount,
} from "@/lib/student-account";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const schoolClasses = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId },
      select: {
        id: true,
        standard: true,
        section: true,
        institutionName: true,
        institutionDistrict: true,
        academicYear: true,
      },
    });
    const classById = new Map(schoolClasses.map((c) => [c.id, c]));

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as { row: number; aadhaarNumber: string; errors: string[] }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const data = await fillStudentGuNames(
        normalizeStudentRow(fillImportDefaults(rows[i] as Record<string, unknown>)),
      );

      let assignedClass = data.classId ? classById.get(data.classId) : undefined;
      if (!assignedClass && data.standard && data.section) {
        assignedClass = schoolClasses.find(
          (c) =>
            c.standard === data.standard &&
            c.section === data.section &&
            (!data.financialYear || c.academicYear === data.financialYear),
        );
      }
      const placed = applyStudentPlacement(
        data as Record<string, unknown>,
        assignedClass
          ? {
              id: assignedClass.id,
              standard: assignedClass.standard,
              section: assignedClass.section,
              academicYear: assignedClass.academicYear,
              institutionName: assignedClass.institutionName,
              institutionDistrict: assignedClass.institutionDistrict,
            }
          : null,
      );
      void placed;
      if (!data.courseName && data.standard) {
        data.courseName = standardToCourseName(data.standard);
      }

      const validationErrors = validateStudent(data);

      if (!data.aadhaarNumber) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          aadhaarNumber: "N/A",
          errors: ["Aadhaar number is required"],
        });
        continue;
      }

      try {
        const uniqueWhere = {
          schoolId_aadhaarNumber: {
            schoolId: session.schoolId,
            aadhaarNumber: data.aadhaarNumber,
          },
        };
        const existing = await prisma.student.findUnique({ where: uniqueWhere });

        await assertStudentAccountEmailAvailable(data.email, existing?.id);
        let student: NonNullable<typeof existing>;
        if (existing) {
          student = await prisma.student.update({
            where: uniqueWhere,
            data: toStudentUncheckedUpdate(data as Record<string, unknown>, {
              schoolId: session.schoolId,
              status: validationErrors.length === 0 ? "ready" : "draft",
              validationErrors:
                validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
            }),
          });
          results.updated++;
        } else {
          student = await prisma.student.create({
            data: toStudentUncheckedCreate(data as Record<string, unknown>, {
              schoolId: session.schoolId,
              status: validationErrors.length === 0 ? "ready" : "draft",
              validationErrors:
                validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
            }),
          });
          results.created++;
        }
        await syncStudentPortalAccount(student);

        if (validationErrors.length > 0) {
          results.errors.push({
            row: i + 1,
            aadhaarNumber: data.aadhaarNumber,
            errors: validationErrors.map((e) => e.message),
          });
        }
      } catch (err) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          aadhaarNumber: data.aadhaarNumber || "N/A",
          errors: [err instanceof Error ? err.message : "Unknown error"],
        });
      }
    }

    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
