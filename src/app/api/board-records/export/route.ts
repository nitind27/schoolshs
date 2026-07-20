import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { parseStreamFromClassName } from "@/lib/board-records/class-utils";
import { buildBoardExcelBuffer, studentsToExcelRows } from "@/lib/board-records/excel";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "teacher", "clerk"]);
    const classId = request.nextUrl.searchParams.get("classId");
    if (!classId) return NextResponse.json({ error: "classId required" }, { status: 400 });

    const cls = await prisma.schoolClass.findFirst({
      where: { id: classId, schoolId: session.schoolId },
    });
    if (!cls) return NextResponse.json({ error: "Class not found" }, { status: 404 });

    if (session.role === "teacher" && session.staffId && cls.classTeacherId !== session.staffId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (!["10", "12"].includes(cls.standard)) {
      return NextResponse.json({ error: "Only Class 10 or 12" }, { status: 400 });
    }

    const students = await prisma.student.findMany({
      where: {
        schoolId: session.schoolId,
        OR: [
          { classId },
          { classId: null, standard: cls.standard, section: cls.section },
        ],
      },
      select: {
        id: true,
        rollNumber: true,
        firstName: true,
        surname: true,
        grNumber: true,
        category: true,
        sscSeatPrefix: true,
        sscSeatNumber: true,
        hscSeatPrefix: true,
        hscSeatNumber: true,
        percentage10th: true,
        percentage12th: true,
        year10th: true,
        year12th: true,
        board10th: true,
        board12th: true,
      },
      orderBy: [{ rollNumber: "asc" }, { firstName: "asc" }],
    });

    const standard = cls.standard as "10" | "12";
    const stream = parseStreamFromClassName(cls.name, cls.standard, cls.stream);
    const rows = studentsToExcelRows(students, standard, { section: cls.section, stream });
    const buffer = await buildBoardExcelBuffer(rows, {
      className: cls.name,
      standard: cls.standard,
      section: cls.section,
      stream,
    });

    const streamSlug = stream && stream !== "General" ? `_${stream}` : "";
    const filename = `GSEB_Std${cls.standard}${streamSlug}_Div${cls.section}_Board_Records.xlsx`;
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
