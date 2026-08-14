import { NextRequest, NextResponse } from "next/server";
import { rm } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import {
  GALLERY_ROLES,
  canDeleteGallery,
  galleryImagePublicUrl,
} from "@/lib/gallery";

type RouteParams = { params: Promise<{ eventId: string }> };

async function loadEvent(schoolId: string, eventId: string) {
  return prisma.galleryEvent.findFirst({
    where: { id: eventId, schoolId },
    include: {
      titles: {
        orderBy: { createdAt: "asc" },
        include: {
          images: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });
}

function serializeEvent(
  event: NonNullable<Awaited<ReturnType<typeof loadEvent>>>,
  role: string,
  userId: string,
) {
  return {
    id: event.id,
    activityName: event.activityName,
    eventDate: event.eventDate,
    createdAt: event.createdAt,
    canDelete: canDeleteGallery(role),
    titles: event.titles.map((t) => ({
      id: t.id,
      title: t.title,
      images: t.images.map((img) => ({
        id: img.id,
        url: galleryImagePublicUrl(img.filePath),
        originalName: img.originalName,
        uploadedByName: img.uploadedByName,
        uploadedById: img.uploadedById,
        createdAt: img.createdAt,
        canDelete: canDeleteGallery(role) || img.uploadedById === userId,
      })),
    })),
  };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { eventId } = await params;
    const event = await loadEvent(session.schoolId, eventId);
    if (!event) return NextResponse.json({ error: "Activity not found" }, { status: 404 });
    return NextResponse.json({ event: serializeEvent(event, session.role, session.userId) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load activity" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    const { eventId } = await params;
    const existing = await prisma.galleryEvent.findFirst({
      where: { id: eventId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    const body = await request.json().catch(() => ({}));
    const activityName = String(body.activityName || "").trim();
    const eventDate = String(body.eventDate || "").trim();
    if (!activityName) return NextResponse.json({ error: "Activity name is required" }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return NextResponse.json({ error: "Select a valid date" }, { status: 400 });
    }

    await prisma.galleryEvent.update({
      where: { id: eventId },
      data: { activityName, eventDate },
    });
    const event = await loadEvent(session.schoolId, eventId);
    return NextResponse.json({ event: serializeEvent(event!, session.role, session.userId) });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to update activity" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");
    if (!canDeleteGallery(session.role)) {
      return NextResponse.json({ error: "You cannot delete this activity" }, { status: 403 });
    }
    const { eventId } = await params;
    const existing = await prisma.galleryEvent.findFirst({
      where: { id: eventId, schoolId: session.schoolId },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    await prisma.galleryEvent.delete({ where: { id: eventId } });
    const dir = path.join(process.cwd(), "uploads", "gallery", session.schoolId, eventId);
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
