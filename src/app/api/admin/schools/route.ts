import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, hashPassword, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAuth(["super_admin"]);
    const schools = await prisma.school.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { students: true, users: true, classes: true, staff: true } },
        users: { where: { role: "school_admin" }, select: { id: true, email: true, name: true, isActive: true, lastLoginAt: true } },
      },
    });
    return NextResponse.json({ schools });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const body = await request.json();
    const code = String(body.code || "").trim().toUpperCase().replace(/\s/g, "");
    const name = String(body.name || "").trim();

    if (!code || !name) {
      return NextResponse.json({ error: "School name and code required" }, { status: 400 });
    }

    const existing = await prisma.school.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ error: "School code already exists" }, { status: 409 });

    const school = await prisma.school.create({
      data: {
        name,
        code,
        district: body.district || null,
        address: body.address || null,
        phone: body.phone || null,
        email: body.email || null,
        settings: {
          create: {
            schoolName: name,
            schoolAddress: body.address || null,
            schoolPhone: body.phone || null,
            schoolEmail: body.email || null,
          },
        },
      },
    });

    return NextResponse.json(school, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to create school" }, { status: 500 });
  }
}
