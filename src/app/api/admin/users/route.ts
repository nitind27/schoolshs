import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashPassword, AuthError } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const name = String(body.name || "").trim();
    const schoolId = String(body.schoolId || "");

    if (!email || !password || !name || !schoolId) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: "Password min 8 characters" }, { status: 400 });
    }

    const school = await prisma.school.findUnique({ where: { id: schoolId } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: "Email already registered" }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
        name,
        role: "school_admin",
        schoolId,
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, schoolId }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await requireAuth(["super_admin"]);
    const users = await prisma.user.findMany({
      where: { role: "school_admin" },
      include: { school: { select: { id: true, name: true, code: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ users });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
