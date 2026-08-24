import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import {
  GALLERY_ROLES,
  canDeleteGallery,
  serializeGalleryMedia,
} from "@/lib/gallery";
import { removeGalleryFolder, unlinkGalleryFile } from "@/lib/gallery-upload";

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
      images: t.images.map((img) =>
        serializeGalleryMedia(img, canDeleteGallery(role) || img.uploadedById === userId),
      ),
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
      include: {
        titles: { select: { id: true, images: { select: { filePath: true } } } },
      },
    });
    if (!existing) return NextResponse.json({ error: "Activity not found" }, { status: 404 });

    const filePaths = existing.titles.flatMap((t) => t.images.map((img) => img.filePath));
    const titleIds = existing.titles.map((t) => t.id);

    await prisma.$transaction([
      prisma.galleryImage.deleteMany({ where: { titleId: { in: titleIds } } }),
      prisma.galleryTitle.deleteMany({ where: { eventId } }),
      prisma.galleryEvent.delete({ where: { id: eventId } }),
    ]);

    await Promise.all(filePaths.map((fp) => unlinkGalleryFile(fp)));
    await removeGalleryFolder(session.schoolId, eventId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to delete activity" }, { status: 500 });
  }
}
