import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

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

/** List GR / admission numbers already present for a class (students + GR register). */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth();
    const classId = request.nextUrl.searchParams.get("classId") || "";
    if (!classId) {
      return NextResponse.json({ error: "classId required", grs: [] }, { status: 400 });
    }

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
      select: { id: true, standard: true, section: true, academicYear: true, name: true },
    });
    if (!cls) {
      return NextResponse.json({ error: "Class not found", grs: [] }, { status: 404 });
    }

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
          ],
        },
        select: {
          id: true,
          grNumber: true,
          firstName: true,
          middleName: true,
          surname: true,
          status: true,
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

    type Row = {
      grNumber: string;
      studentId: string | null;
      name: string;
      source: "student" | "gr_entry" | "both";
      status?: string | null;
    };

    const map = new Map<string, Row>();

    for (const s of students) {
      const gr = String(s.grNumber || "").trim();
      if (!gr) continue;
      map.set(gr, {
        grNumber: gr,
        studentId: s.id,
        name: displayName(s) || "—",
        source: "student",
        status: s.status,
      });
    }

    for (const g of grEntries) {
      const gr = String(g.grNumber || "").trim();
      if (!gr) continue;
      const existing = map.get(gr);
      const grName = [g.firstName, g.surname].filter(Boolean).join(" ").trim();
      if (existing) {
        map.set(gr, {
          ...existing,
          source: "both",
          name: existing.name !== "—" ? existing.name : grName || existing.name,
          studentId: existing.studentId || g.studentId,
        });
      } else {
        map.set(gr, {
          grNumber: gr,
          studentId: g.studentId,
          name: grName || "—",
          source: "gr_entry",
        });
      }
    }

    const grs = Array.from(map.values()).sort((a, b) => sortGr(a.grNumber, b.grNumber));

    return NextResponse.json({
      class: cls,
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
