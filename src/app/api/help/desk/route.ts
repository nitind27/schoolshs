import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";

const STAFF_ROLES = ["school_admin", "clerk"] as const;

/** List help-desk conversations for school staff */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([...STAFF_ROLES]);
    const status = request.nextUrl.searchParams.get("status") || "";
    const q = (request.nextUrl.searchParams.get("q") || "").trim();

    const where: Record<string, unknown> = {
      schoolId: session.schoolId,
    };
    if (status && status !== "all") {
      where.status = status;
    } else {
      where.status = { in: ["waiting", "active", "bot", "closed"] };
    }
    if (q) {
      where.OR = [
        { subject: { contains: q } },
        { user: { name: { contains: q } } },
        { user: { email: { contains: q } } },
      ];
    }

    const [conversations, waitingCount] = await Promise.all([
      prisma.helpConversation.findMany({
        where,
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        take: 80,
        include: {
          user: { select: { id: true, name: true, email: true, role: true } },
          assignedTo: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true, senderRole: true, createdAt: true },
          },
          _count: { select: { messages: true } },
        },
      }),
      prisma.helpConversation.count({
        where: { schoolId: session.schoolId, status: { in: ["waiting", "active"] } },
      }),
    ]);

    return NextResponse.json({
      waitingCount,
      conversations: conversations.map((c) => ({
        id: c.id,
        status: c.status,
        role: c.role,
        lang: c.lang,
        subject: c.subject,
        rating: c.rating,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        closedAt: c.closedAt,
        user: c.user,
        assignedTo: c.assignedTo,
        messageCount: c._count.messages,
        lastMessage: c.messages[0] || null,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[help desk]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
