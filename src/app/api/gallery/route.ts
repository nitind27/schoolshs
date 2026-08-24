import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { GALLERY_ROLES, canDeleteGallery, galleryImagePublicUrl, galleryMediaKind } from "@/lib/gallery";

function coverOf(event: {
  titles: { images: { filePath: string }[] }[];
}) {
  for (const title of event.titles) {
    const photo = title.images.find((img) => galleryMediaKind(img.filePath) === "image");
    if (photo?.filePath) return galleryImagePublicUrl(photo.filePath);
  }
  return null;
}

export async function GET() {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");

    const events = await prisma.galleryEvent.findMany({
      where: { schoolId: session.schoolId },
      orderBy: [{ eventDate: "desc" }, { createdAt: "desc" }],
      include: {
        titles: {
          orderBy: { createdAt: "asc" },
          include: {
            images: { orderBy: { createdAt: "asc" }, take: 12, select: { filePath: true } },
            _count: { select: { images: true } },
          },
        },
      },
    });

    return NextResponse.json({
      canDelete: canDeleteGallery(session.role),
      events: events.map((e) => ({
        id: e.id,
        activityName: e.activityName,
        eventDate: e.eventDate,
        titleCount: e.titles.length,
        imageCount: e.titles.reduce((n, t) => n + t._count.images, 0),
        coverUrl: coverOf(e),
        createdAt: e.createdAt,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed to load gallery" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(GALLERY_ROLES);
    await requireSchoolFeature(session.schoolId, "gallery");

    const body = await request.json().catch(() => ({}));
    const activityName = String(body.activityName || "").trim();
    const eventDate = String(body.eventDate || "").trim();
    const title = String(body.title || "").trim();

    if (!activityName) {
      return NextResponse.json({ error: "Activity name is required" }, { status: 400 });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate)) {
      return NextResponse.json({ error: "Select a valid date" }, { status: 400 });
    }

    const event = await prisma.galleryEvent.create({
      data: {
        schoolId: session.schoolId,
        activityName,
        eventDate,
        createdById: session.userId,
        titles: title ? { create: { title } } : undefined,
      },
      include: {
        titles: { include: { images: true, _count: { select: { images: true } } } },
      },
    });

    return NextResponse.json({ event }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[gallery POST]", error);
    return NextResponse.json({ error: "Failed to create activity" }, { status: 500 });
  }
}
