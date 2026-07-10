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

    if (user.role === "ca") {
      const assignments = await prisma.caSchoolAssignment.findMany({
        where: { userId: user.id },
        include: { school: true },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      });
      const activeSchool =
        user.school ||
        assignments.find((a) => a.isPrimary)?.school ||
        assignments[0]?.school;
      if (!activeSchool?.isActive) {
        return NextResponse.json({ error: "No active school assigned for CA" }, { status: 403 });
      }
    } else if (user.role !== "super_admin" && (!user.schoolId || !user.school?.isActive)) {
      return NextResponse.json({ error: "School inactive or not assigned" }, { status: 403 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    let activeSchoolId = user.schoolId;
    let activeSchool = user.school;

    if (user.role === "ca") {
      const primaryAssignment = await prisma.caSchoolAssignment.findFirst({
        where: { userId: user.id },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        include: { school: true },
      });
      activeSchoolId = user.schoolId || primaryAssignment?.schoolId || null;
      activeSchool = user.school || primaryAssignment?.school || null;
    }

    const sessionUser: SessionUser = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      schoolId: activeSchoolId,
      schoolName: activeSchool?.name ?? null,
      schoolCode: activeSchool?.code ?? null,
      activeSchoolId,
      activeSchoolName: activeSchool?.name ?? null,
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
