import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  const session = await getSession();
  if (!session) {
    return mobileJson({ user: null }, { status: 401 }, origin);
  }

  let photoPath: string | null = null;
  if (session.staffId && session.schoolId) {
    const staff = await prisma.staff.findFirst({
      where: { id: session.staffId, schoolId: session.schoolId },
      select: { photoPath: true },
    });
    photoPath = staff?.photoPath ?? null;
  }

  return mobileJson({ user: { ...session, photoPath } }, undefined, origin);
}
