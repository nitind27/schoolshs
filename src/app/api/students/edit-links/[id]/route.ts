import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const existing = await prisma.studentEditLink.findFirst({
      where: { id, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    await prisma.studentEditLink.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[edit-links DELETE]", error);
    return NextResponse.json({ error: "Failed to close link" }, { status: 500 });
  }
}
