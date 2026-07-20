import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { seedFullSchool } from "@/lib/seed-full-school";

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === "production") {
      await requireSchoolAuth(["school_admin"]);
    }
    const result = await seedFullSchool(prisma);
    return NextResponse.json({
      success: true,
      message: "Full school dummy data seeded",
      ...result,
      logins: {
        admin: "admin@songadh.local / SchoolAdmin@123",
        teacher: "teacher@songadh.local / Teacher@123",
        clerk: "clerk@songadh.local / Clerk@123",
      },
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("seed-full-school:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Seed failed" },
      { status: 500 },
    );
  }
}
