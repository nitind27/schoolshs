import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, setSessionCookie, type SessionUser } from "@/lib/auth";
import { getRoleHome } from "@/lib/roles";
import type { UserRole } from "@/lib/roles";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email aur password required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: String(email).trim().toLowerCase() },
      include: { school: true },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (!verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    if (user.role !== "super_admin" && (!user.schoolId || !user.school?.isActive)) {
      return NextResponse.json({ error: "School inactive or not assigned" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const sessionUser: SessionUser = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      schoolId: user.schoolId,
      schoolName: user.school?.name ?? null,
      schoolCode: user.school?.code ?? null,
      staffId: user.staffId,
      studentId: user.studentId,
    };

    const res = NextResponse.json({
      user: sessionUser,
      redirect: getRoleHome(user.role),
    });
    await setSessionCookie(res, sessionUser);
    return res;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
