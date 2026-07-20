import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import {
  buildNotificationFeed,
  markNotificationsRead,
} from "@/lib/notifications";
import type { UserRole } from "@/lib/roles";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "teacher",
      "clerk",
      "ca",
      "super_admin",
    ]);
    const take = Math.min(
      40,
      Math.max(5, parseInt(request.nextUrl.searchParams.get("take") || "20", 10) || 20)
    );
    const feed = await buildNotificationFeed(session.userId, session.role as UserRole, {
      take,
    });
    return NextResponse.json(feed);
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[notifications GET]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

/** Mark notifications as read. Body: { ids?: string[], all?: boolean } */
export async function POST(request: NextRequest) {
  try {
    const session = await requireSchoolAuth([
      "school_admin",
      "teacher",
      "clerk",
      "ca",
      "super_admin",
    ]);
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids) ? (body.ids as string[]).filter(Boolean) : undefined;
    const all = body.all === true;

    if (!all && (!ids || !ids.length)) {
      return NextResponse.json({ error: "ids or all required" }, { status: 400 });
    }

    const count = await markNotificationsRead(session.userId, all ? undefined : ids);
    const feed = await buildNotificationFeed(session.userId, session.role as UserRole);
    return NextResponse.json({ success: true, marked: count, ...feed });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[notifications POST]", e);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
