import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { validateStudent, normalizeStudentRow } from "@/lib/validation";
import { fillStudentGuNames } from "@/lib/gujarati/transliterate-server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const { rows } = await request.json();

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "No data provided" }, { status: 400 });
    }

    const results = {
      total: rows.length,
      created: 0,
      updated: 0,
      failed: 0,
      errors: [] as { row: number; aadhaarNumber: string; errors: string[] }[],
    };

    for (let i = 0; i < rows.length; i++) {
      const data = await fillStudentGuNames(normalizeStudentRow(rows[i]));
      const validationErrors = validateStudent(data);

      if (!data.aadhaarNumber) {
        results.failed++;
        results.errors.push({ row: i + 1, aadhaarNumber: "N/A", errors: ["Aadhaar number is required"] });
        continue;
      }

      try {
        const uniqueWhere = {
          schoolId_aadhaarNumber: { schoolId: session.schoolId, aadhaarNumber: data.aadhaarNumber },
        };
        const existing = await prisma.student.findUnique({ where: uniqueWhere });

        const studentData = {
          ...data,
          schoolId: session.schoolId,
          status: validationErrors.length === 0 ? "ready" : "draft",
          validationErrors: validationErrors.length > 0 ? JSON.stringify(validationErrors) : null,
        };

        if (existing) {
          await prisma.student.update({
            where: uniqueWhere,
            data: studentData as Parameters<typeof prisma.student.update>[0]["data"],
          });
          results.updated++;
        } else {
          await prisma.student.create({
            data: studentData as Parameters<typeof prisma.student.create>[0]["data"],
          });
          results.created++;
        }

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
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
