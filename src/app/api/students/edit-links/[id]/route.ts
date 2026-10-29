import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { cleanEditLinkFields, formatStoredEditLink } from "@/lib/student-edit-link";

type RouteParams = { params: Promise<{ id: string }> };

const linkInclude = {
  schoolClass: {
    select: { id: true, name: true, standard: true, section: true, academicYear: true },
  },
} as const;

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const existing = await prisma.studentEditLink.findFirst({
      where: { id, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });

    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      body = {};
    }

    if (Array.isArray(body.fields)) {
      const fields = cleanEditLinkFields(body.fields);
      if (!fields.length) {
        return NextResponse.json({ error: "Select at least one field" }, { status: 400 });
      }
      const updated = await prisma.studentEditLink.update({
        where: { id },
        data: { fieldsJson: fields },
        include: linkInclude,
      });
      return NextResponse.json({ success: true, link: formatStoredEditLink(updated) });
    }

    await prisma.studentEditLink.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[edit-links PATCH]", error);
    return NextResponse.json({ error: "Failed to update link" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(["school_admin"]);
    const { id } = await params;
    const existing = await prisma.studentEditLink.findFirst({
      where: { id, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Link not found" }, { status: 404 });
    await prisma.studentEditLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[edit-links DELETE]", error);
    return NextResponse.json({ error: "Failed to delete link" }, { status: 500 });
  }
}
