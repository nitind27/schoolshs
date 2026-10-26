import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { categoryFromCaste } from "@/lib/category-inference";
import { syncGrEntryForStudent } from "@/lib/gr-student-sync";
import { isBuiltinReligion, resolveReligionName } from "@/lib/school-religions";
import {
  isEditLinkField,
  readEditLinkToken,
  readStoredFields,
  sanitizeEditLinkValue,
  type EditLinkField,
} from "@/lib/student-edit-link";

function bearer(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || "";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = readEditLinkToken(bearer(request) || String(body.token || ""));
    if (!parsed) return NextResponse.json({ error: "Open the link again" }, { status: 401 });

    const link = await prisma.studentEditLink.findFirst({
      where: { id: parsed.linkId, isActive: true },
    });
    if (!link) return NextResponse.json({ error: "This link is closed" }, { status: 401 });

    const allowed = new Set(readStoredFields(link.fieldsJson));
    const updates = Array.isArray(body.students) ? body.students : [];
    const errors: { studentId: string; error: string }[] = [];
    let updated = 0;

    for (const row of updates) {
      const studentId = String(row?.studentId || row?.id || "").trim();
      const values = row?.values && typeof row.values === "object" ? row.values : null;
      if (!studentId || !values) continue;

      const patch: Partial<Record<EditLinkField, string | null>> = {};
      let rowError = "";
      for (const [key, raw] of Object.entries(values as Record<string, unknown>)) {
        if (!isEditLinkField(key) || !allowed.has(key)) continue;
        const cleaned = sanitizeEditLinkValue(key, raw);
        if (!cleaned.ok) {
          rowError = cleaned.error;
          break;
        }
        patch[key] = cleaned.value;
      }
      if (rowError) {
        errors.push({ studentId, error: rowError });
        continue;
      }
      if (!Object.keys(patch).length) continue;

      if (patch.caste && allowed.has("category") && patch.category === undefined) {
        const suggested = categoryFromCaste({ caste: patch.caste, religion: patch.religion });
        if (suggested) patch.category = suggested;
      }

      const existing = await prisma.student.findFirst({
        where: { id: studentId, schoolId: link.schoolId, classId: link.classId },
      });
      if (!existing) {
        errors.push({ studentId, error: "Student is not in this class" });
        continue;
      }

      const student = await prisma.student.update({
        where: { id: existing.id },
        data: patch as Prisma.StudentUpdateInput,
      });

      if (patch.religion && !isBuiltinReligion(patch.religion)) {
        const name = resolveReligionName(patch.religion);
        if (name) {
          await prisma.schoolReligion.upsert({
            where: { schoolId_name: { schoolId: link.schoolId, name } },
            update: {},
            create: { schoolId: link.schoolId, name },
          });
        }
      }

      await syncGrEntryForStudent(link.schoolId, student);
      updated++;
    }

    await prisma.studentEditLink.update({
      where: { id: link.id },
      data: { lastUsedAt: new Date() },
    });

    return NextResponse.json({ success: errors.length === 0, updated, errors });
  } catch (error) {
    console.error("[student-edit-link save]", error);
    return NextResponse.json({ error: "Could not save students" }, { status: 500 });
  }
}
