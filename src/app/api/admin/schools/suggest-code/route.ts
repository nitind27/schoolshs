import { NextRequest, NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { suggestSchoolCode } from "@/lib/school-code";

export async function GET(request: NextRequest) {
  try {
    await requireAuth(["super_admin"]);
    const { searchParams } = new URL(request.url);
    const name = searchParams.get("name")?.trim() || "";
    const city = searchParams.get("city");
    const taluka = searchParams.get("taluka");
    const district = searchParams.get("district");

    if (!name || name.length < 2) {
      return NextResponse.json({ error: "School name required" }, { status: 400 });
    }

    const suggestion = await suggestSchoolCode(prisma, name, { city, taluka, district });
    return NextResponse.json(suggestion);
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed to suggest code" }, { status: 500 });
  }
}
