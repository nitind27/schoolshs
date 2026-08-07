import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";

const ACTIVITY_TYPES = [
  "party",
  "sports",
  "cultural",
  "trip",
  "competition",
  "other",
] as const;

function deriveAcademicYear(isoDate: string): string {
  const d = new Date(isoDate);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  if (m >= 4) return `${y}-${String(y + 1).slice(2)}`;
  return `${y - 1}-${String(y).slice(2)}`;
}

function participantSelect() {
  return {
    id: true,
    createdAt: true,
    note: true,
    classId: true,
    student: {
      select: {
        id: true,
        firstName: true,
        middleName: true,
        surname: true,
        firstNameGu: true,
        surnameGu: true,
        rollNumber: true,
        grNumber: true,
        gender: true,
        standard: true,
        section: true,
        classId: true,
        schoolClass: {
          select: { id: true, name: true, standard: true, section: true },
        },
      },
    },
  } satisfies Prisma.ActivityParticipantSelect;
}

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "clerk",
      "teacher",
    ]);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "";
    const id = searchParams.get("id") || "";
    const isTeacher = session.role === "teacher";

    if (id) {
      const activity = await prisma.activity.findFirst({
        where: {
          id,
          schoolId: session.schoolId,
          ...(isTeacher ? { released: true } : {}),
        },
        include: {
          participants: {
            orderBy: [
              { student: { rollNumber: "asc" } },
              { student: { surname: "asc" } },
              { student: { firstName: "asc" } },
            ],
            select: participantSelect(),
          },
          _count: { select: { participants: true } },
        },
      });
      if (!activity) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const school = await prisma.school.findUnique({
        where: { id: session.schoolId },
        select: {
          name: true,
          address: true,
          district: true,
          phone: true,
          code: true,
        },
      });

      return NextResponse.json({
        activity,
        school,
        readOnly: isTeacher,
      });
    }

    const where: Prisma.ActivityWhereInput = {
      schoolId: session.schoolId,
      ...(isTeacher ? { released: true } : {}),
    };
    if (type) where.type = type;

    const activities = await prisma.activity.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { participants: true } } },
    });

    return NextResponse.json({ activities, readOnly: isTeacher });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[activities GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as {
      action?: string;
      id?: string;
      title?: string;
      titleGu?: string;
      type?: string;
      date?: string;
      academicYear?: string;
      venue?: string;
      description?: string;
      studentId?: string;
      studentIds?: string[];
      note?: string;
      classId?: string;
      participantId?: string;
      released?: boolean;
    };
    const action = body.action || "create";

    if (action === "delete") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await prisma.activity.findFirst({
        where: { id, schoolId: session.schoolId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      await prisma.activity.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    if (action === "release" || action === "unrelease") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await prisma.activity.findFirst({
        where: { id, schoolId: session.schoolId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const release = action === "release";
      if (release && (await prisma.activityParticipant.count({ where: { activityId: id } })) === 0) {
        return NextResponse.json(
          { error: "Add at least one student before releasing to teachers" },
          { status: 400 },
        );
      }
      const activity = await prisma.activity.update({
        where: { id },
        data: {
          released: release,
          releasedAt: release ? new Date() : null,
        },
        include: {
          participants: {
            orderBy: [
              { student: { rollNumber: "asc" } },
              { student: { surname: "asc" } },
            ],
            select: participantSelect(),
          },
          _count: { select: { participants: true } },
        },
      });
      return NextResponse.json({ success: true, activity });
    }

    if (action === "add_participant" || action === "add_participants") {
      const activityId = String(body.id || "");
      if (!activityId) {
        return NextResponse.json({ error: "id required" }, { status: 400 });
      }
      const activity = await prisma.activity.findFirst({
        where: { id: activityId, schoolId: session.schoolId },
      });
      if (!activity) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const ids = Array.isArray(body.studentIds)
        ? body.studentIds.map(String).filter(Boolean)
        : body.studentId
          ? [String(body.studentId)]
          : [];
      if (!ids.length) {
        return NextResponse.json(
          { error: "Select at least one student" },
          { status: 400 },
        );
      }

      const students = await prisma.student.findMany({
        where: {
          schoolId: session.schoolId,
          id: { in: ids },
          status: { not: "archived" },
        },
        select: { id: true, classId: true },
      });
      if (!students.length) {
        return NextResponse.json(
          { error: "No valid students found" },
          { status: 404 },
        );
      }

      let added = 0;
      for (const st of students) {
        try {
          await prisma.activityParticipant.create({
            data: {
              activityId,
              studentId: st.id,
              classId: body.classId || st.classId || null,
              note: body.note?.trim() || null,
            },
          });
          added++;
        } catch {
          // unique conflict
        }
      }

      const participants = await prisma.activityParticipant.findMany({
        where: { activityId },
        orderBy: [
          { student: { rollNumber: "asc" } },
          { student: { surname: "asc" } },
        ],
        select: participantSelect(),
      });

      return NextResponse.json({
        success: true,
        added,
        total: participants.length,
        participants,
      });
    }

    if (action === "remove_participant") {
      const activityId = String(body.id || "");
      const participantId = String(body.participantId || "");
      const studentId = String(body.studentId || "");
      if (!activityId || (!participantId && !studentId)) {
        return NextResponse.json(
          { error: "id and participantId/studentId required" },
          { status: 400 },
        );
      }
      const activity = await prisma.activity.findFirst({
        where: { id: activityId, schoolId: session.schoolId },
      });
      if (!activity) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      await prisma.activityParticipant.deleteMany({
        where: {
          activityId,
          ...(participantId ? { id: participantId } : { studentId }),
        },
      });

      const participants = await prisma.activityParticipant.findMany({
        where: { activityId },
        orderBy: [
          { student: { rollNumber: "asc" } },
          { student: { surname: "asc" } },
        ],
        select: participantSelect(),
      });
      return NextResponse.json({ success: true, participants });
    }

    const title = String(body.title || "").trim();
    const date = String(body.date || "").trim();
    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Valid date (YYYY-MM-DD) is required" },
        { status: 400 },
      );
    }
    const type = ACTIVITY_TYPES.includes(
      body.type as (typeof ACTIVITY_TYPES)[number],
    )
      ? String(body.type)
      : "party";

    const payload = {
      title,
      titleGu: String(body.titleGu || "").trim() || null,
      type,
      date,
      academicYear: String(body.academicYear || deriveAcademicYear(date)),
      venue: String(body.venue || "").trim() || null,
      description: String(body.description || "").trim() || null,
    };

    if (action === "update") {
      const id = String(body.id || "");
      if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
      const existing = await prisma.activity.findFirst({
        where: { id, schoolId: session.schoolId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const activity = await prisma.activity.update({
        where: { id },
        data: payload,
        include: { _count: { select: { participants: true } } },
      });
      return NextResponse.json({ activity });
    }

    const activity = await prisma.activity.create({
      data: {
        schoolId: session.schoolId,
        createdById: session.userId,
        ...payload,
      },
      include: { _count: { select: { participants: true } } },
    });
    return NextResponse.json({ activity });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[activities POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
