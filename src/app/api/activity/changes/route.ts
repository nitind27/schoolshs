import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "supervisor", "clerk"]);
    const { searchParams } = new URL(request.url);
    const kind = searchParams.get("kind");
    const q = String(searchParams.get("q") || "").trim();
    const where: {
      schoolId: string;
      kind?: string;
      OR?: { targetLabel?: { contains: string }; actorName?: { contains: string }; summary?: { contains: string } }[];
    } = { schoolId: session.schoolId };
    if (kind === "student" || kind === "marks") where.kind = kind;
    if (q) {
      where.OR = [
        { targetLabel: { contains: q } },
        { actorName: { contains: q } },
        { summary: { contains: q } },
      ];
    }

    const rows = await prisma.changeLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 150,
    });

    return NextResponse.json({
      changes: rows.map((row) => ({
        id: row.id,
        createdAt: row.createdAt,
        actorName: row.actorName,
        actorRole: row.actorRole,
        kind: row.kind,
        action: row.action,
        targetId: row.targetId,
        targetLabel: row.targetLabel,
        summary: row.summary,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error(error);
    return NextResponse.json({ error: "Failed to load change log" }, { status: 500 });
  }
}
