import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { enrolledStudentStatusFilter } from "@/lib/student-list-filters";

function displayName(s: {
  firstName?: string | null;
  surname?: string | null;
  middleName?: string | null;
}) {
  return [s.firstName, s.middleName, s.surname].filter(Boolean).join(" ").trim();
}

function sortGr(a: string, b: string) {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function classLabel(parts: {
  standard?: string | null;
  section?: string | null;
  className?: string | null;
}) {
  const std = String(parts.standard || "").trim();
  const sec = String(parts.section || "").trim();
  if (std && sec) return `${std}-${sec}`;
  if (std) return std;
  const name = String(parts.className || "").trim();
  return name || "";
}

type Row = {
  grNumber: string;
  studentId: string | null;
  name: string;
  source: "student" | "gr_entry" | "both";
  status?: string | null;
  standard: string | null;
  section: string | null;
  className: string | null;
  classLabel: string;
};

/** List GR / admission numbers for a class, or for a whole academic year. */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const classId = request.nextUrl.searchParams.get("classId") || "";
    const academicYear = request.nextUrl.searchParams.get("academicYear") || "";

    if (!classId && !academicYear) {
      return NextResponse.json(
        { error: "classId or academicYear required", grs: [] },
        { status: 400 },
      );
    }

    // ── Class-scoped list (edit flow) ──
    if (classId) {
      const cls = await prisma.schoolClass.findFirst({
        where: { id: classId, schoolId: session.schoolId },
        select: { id: true, standard: true, section: true, academicYear: true, name: true },
      });
      if (!cls) {
        return NextResponse.json({ error: "Class not found", grs: [] }, { status: 404 });
      }

      const clsLabel = classLabel({
        standard: cls.standard,
        section: cls.section,
        className: cls.name,
      });

      const [students, grEntries] = await Promise.all([
        prisma.student.findMany({
          where: {
            schoolId: session.schoolId,
            AND: [
              {
                OR: [
                  { classId: cls.id },
                  { classId: null, standard: cls.standard, section: cls.section },
                ],
              },
              { grNumber: { not: null } },
              { NOT: { grNumber: "" } },
              { status: enrolledStudentStatusFilter() },
            ],
          },
          select: {
            id: true,
            grNumber: true,
            firstName: true,
            middleName: true,
            surname: true,
            status: true,
            standard: true,
            section: true,
            schoolClass: { select: { name: true, standard: true, section: true } },
          },
          orderBy: { grNumber: "asc" },
        }),
        prisma.generalRegisterEntry.findMany({
          where: {
            schoolId: session.schoolId,
            academicYear: cls.academicYear,
            OR: [
              { standard: cls.standard, section: cls.section },
              { student: { classId: cls.id } },
            ],
          },
          select: {
            id: true,
            grNumber: true,
            firstName: true,
            surname: true,
            studentId: true,
            standard: true,
            section: true,
          },
        }),
      ]);

      const map = new Map<string, Row>();

      for (const s of students) {
        const gr = String(s.grNumber || "").trim();
        if (!gr) continue;
        const label =
          classLabel({
            standard: s.schoolClass?.standard || s.standard,
            section: s.schoolClass?.section || s.section,
            className: s.schoolClass?.name,
          }) || clsLabel;
        map.set(gr, {
          grNumber: gr,
          studentId: s.id,
          name: displayName(s) || "—",
          source: "student",
          status: s.status,
          standard: s.schoolClass?.standard || s.standard || cls.standard,
          section: s.schoolClass?.section || s.section || cls.section,
          className: s.schoolClass?.name || cls.name,
          classLabel: label,
        });
      }

      for (const g of grEntries) {
        const gr = String(g.grNumber || "").trim();
        if (!gr) continue;
        const existing = map.get(gr);
        const grName = [g.firstName, g.surname].filter(Boolean).join(" ").trim();
        const label =
          classLabel({ standard: g.standard, section: g.section }) || clsLabel;
        if (existing) {
          map.set(gr, {
            ...existing,
            source: "both",
            name: existing.name !== "—" ? existing.name : grName || existing.name,
            studentId: existing.studentId || g.studentId,
            standard: existing.standard || g.standard,
            section: existing.section || g.section,
            classLabel: existing.classLabel || label,
          });
        } else {
          map.set(gr, {
            grNumber: gr,
            studentId: g.studentId,
            name: grName || "—",
            source: "gr_entry",
            standard: g.standard,
            section: g.section,
            className: cls.name,
            classLabel: label,
          });
        }
      }

      const grs = Array.from(map.values()).sort((a, b) => sortGr(a.grNumber, b.grNumber));

      return NextResponse.json({
        class: cls,
        grs,
        total: grs.length,
      });
    }

    // ── Year-scoped list (new-student flow — class assigned later) ──
    const year = academicYear;
    const yearClasses = await prisma.schoolClass.findMany({
      where: { schoolId: session.schoolId, academicYear: year },
      select: { id: true, name: true, standard: true, section: true },
    });
    const yearClassIds = yearClasses.map((c) => c.id);
    const classById = new Map(yearClasses.map((c) => [c.id, c]));

    const [students, grEntries] = await Promise.all([
      prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          AND: [
            {
              OR: [
                { financialYear: year },
                ...(yearClassIds.length > 0 ? [{ classId: { in: yearClassIds } }] : []),
              ],
            },
            { grNumber: { not: null } },
            { NOT: { grNumber: "" } },
            { status: enrolledStudentStatusFilter() },
          ],
        },
        select: {
          id: true,
          grNumber: true,
          firstName: true,
          middleName: true,
          surname: true,
          status: true,
          standard: true,
          section: true,
          classId: true,
          schoolClass: { select: { name: true, standard: true, section: true } },
        },
        orderBy: { grNumber: "asc" },
      }),
      prisma.generalRegisterEntry.findMany({
        where: {
          schoolId: session.schoolId,
          academicYear: year,
        },
        select: {
          id: true,
          grNumber: true,
          firstName: true,
          surname: true,
          studentId: true,
          standard: true,
          section: true,
        },
      }),
    ]);

    const map = new Map<string, Row>();

    for (const s of students) {
      const gr = String(s.grNumber || "").trim();
      if (!gr) continue;
      const linked = s.schoolClass || (s.classId ? classById.get(s.classId) : null);
      const label = classLabel({
        standard: linked?.standard || s.standard,
        section: linked?.section || s.section,
        className: linked?.name,
      });
      map.set(gr, {
        grNumber: gr,
        studentId: s.id,
        name: displayName(s) || "—",
        source: "student",
        status: s.status,
        standard: linked?.standard || s.standard || null,
        section: linked?.section || s.section || null,
        className: linked?.name || null,
        classLabel: label,
      });
    }

    for (const g of grEntries) {
      const gr = String(g.grNumber || "").trim();
      if (!gr) continue;
      const existing = map.get(gr);
      const grName = [g.firstName, g.surname].filter(Boolean).join(" ").trim();
      const label = classLabel({ standard: g.standard, section: g.section });
      if (existing) {
        map.set(gr, {
          ...existing,
          source: "both",
          name: existing.name !== "—" ? existing.name : grName || existing.name,
          studentId: existing.studentId || g.studentId,
          standard: existing.standard || g.standard,
          section: existing.section || g.section,
          classLabel: existing.classLabel || label,
        });
      } else {
        map.set(gr, {
          grNumber: gr,
          studentId: g.studentId,
          name: grName || "—",
          source: "gr_entry",
          standard: g.standard,
          section: g.section,
          className: null,
          classLabel: label,
        });
      }
    }

    const grs = Array.from(map.values()).sort((a, b) => {
      const byClass = (a.classLabel || "").localeCompare(b.classLabel || "", undefined, {
        numeric: true,
        sensitivity: "base",
      });
      if (byClass !== 0) return byClass;
      return sortGr(a.grNumber, b.grNumber);
    });

    return NextResponse.json({
      academicYear: year,
      grs,
      total: grs.length,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, grs: [] }, { status: error.status });
    }
    console.error("GET /api/students/gr-list error:", error);
    return NextResponse.json({ error: "Failed to list GR numbers", grs: [] }, { status: 500 });
  }
}
