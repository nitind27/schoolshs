import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const status = req.nextUrl.searchParams.get("status");
    const where =
      status && ["new", "read", "resolved"].includes(status) ? { status } : {};

    const [messages, counts] = await Promise.all([
      prisma.contactSupportMessage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.contactSupportMessage.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = { new: 0, read: 0, resolved: 0 };
    for (const c of counts) byStatus[c.status] = c._count._all;

    return NextResponse.json({
      messages,
      counts: {
        ...byStatus,
        total: byStatus.new + byStatus.read + byStatus.resolved,
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin contact-support GET", e);
    return NextResponse.json({ error: "Failed to load messages" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await req.json();
    const id = String(body.id || "");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const status = body.status ? String(body.status) : undefined;
    const adminNote =
      body.adminNote !== undefined ? String(body.adminNote).slice(0, 2000) : undefined;

    if (status && !["new", "read", "resolved"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const updated = await prisma.contactSupportMessage.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(adminNote !== undefined ? { adminNote } : {}),
      },
    });

    return NextResponse.json({ message: updated });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin contact-support PATCH", e);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    await prisma.contactSupportMessage.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("admin contact-support DELETE", e);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
