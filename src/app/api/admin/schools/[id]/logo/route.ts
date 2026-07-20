import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { saveAdminSchoolFile } from "@/lib/admin-school";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;
    const school = await prisma.school.findUnique({ where: { id } });
    if (!school) return NextResponse.json({ error: "School not found" }, { status: 404 });

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "File required" }, { status: 400 });

    const logoPath = await saveAdminSchoolFile(id, file, "logo");
    await prisma.schoolSettings.upsert({
      where: { schoolId: id },
      create: { schoolId: id, schoolName: school.name, logoPath },
      update: { logoPath },
    });

    return NextResponse.json({ logoPath });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
