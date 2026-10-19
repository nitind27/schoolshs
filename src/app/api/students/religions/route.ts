import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  isBuiltinReligion,
  mergeReligionNames,
  normalizeReligionName,
  resolveReligionName,
} from "@/lib/school-religions";

async function religionPayload(schoolId: string) {
  const [custom, used] = await Promise.all([
    prisma.schoolReligion.findMany({
      where: { schoolId },
      select: { name: true },
    }),
    prisma.student.findMany({
      where: { schoolId },
      select: { religion: true },
      distinct: ["religion"],
    }),
  ]);
  const added = custom
    .map((row) => row.name)
    .filter((name) => !isBuiltinReligion(name))
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return {
    religions: mergeReligionNames(
      added,
      used.map((row) => row.religion),
    ),
    custom: added,
  };
}

export async function GET() {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk", "teacher"]);
    return NextResponse.json(await religionPayload(session.schoolId));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load religions" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const body = (await request.json()) as { name?: string };
    const name = resolveReligionName(String(body.name || ""));
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Religion name is required" }, { status: 400 });
    }

    let stored = name;
    if (!isBuiltinReligion(name)) {
      const existing = await prisma.schoolReligion.findMany({
        where: { schoolId: session.schoolId },
        select: { name: true },
      });
      const match = existing.find((row) => row.name.toLowerCase() === name.toLowerCase());
      if (match) stored = match.name;
      else {
        await prisma.schoolReligion.create({
          data: { schoolId: session.schoolId, name },
        });
      }
    }

    return NextResponse.json({ name: stored, ...(await religionPayload(session.schoolId)) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to add religion" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    const name = normalizeReligionName(new URL(request.url).searchParams.get("name") || "");
    if (!name || isBuiltinReligion(name)) {
      return NextResponse.json({ error: "This religion stays in the list" }, { status: 400 });
    }

    const row = await prisma.schoolReligion.findFirst({
      where: { schoolId: session.schoolId, name },
    });
    if (!row) {
      return NextResponse.json(await religionPayload(session.schoolId));
    }

    const used = await prisma.student.count({
      where: { schoolId: session.schoolId, religion: row.name },
    });
    if (used > 0) {
      return NextResponse.json(
        { error: "Students still use this religion", used },
        { status: 409 },
      );
    }

    await prisma.schoolReligion.delete({ where: { id: row.id } });
    return NextResponse.json(await religionPayload(session.schoolId));
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Failed to remove religion" }, { status: 500 });
  }
}
