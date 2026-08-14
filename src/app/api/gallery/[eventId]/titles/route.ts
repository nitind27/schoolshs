import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES } from "@/lib/gallery";

type RouteParams = { params: Promise<{ eventId: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { eventId } = await params;
    const event = await prisma.galleryEvent.findFirst({
      where: { id: eventId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!event) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const title = String(body.title || "").trim();
    if (!title) return NextResponse.json({ error: "Title is required" }, { status: 400 });

    const created = await prisma.galleryTitle.create({
      data: { eventId, title },
    });
    return NextResponse.json({ title: { id: created.id, title: created.title, images: [] } }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to add title" }, { status: 500 });
  }
}
