import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { saveAdminSchoolFile, deleteAdminSchoolFile } from "@/lib/admin-school";

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

    const contractDocumentPath = await saveAdminSchoolFile(id, file, "contract");
    await prisma.schoolSubscription.upsert({
      where: { schoolId: id },
      create: { schoolId: id, contractDocumentPath, enabledFeatures: [] },
      update: { contractDocumentPath },
    });

    return NextResponse.json({ contractDocumentPath });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAuth(["super_admin"]);
    const { id } = await params;

    const sub = await prisma.schoolSubscription.findUnique({ where: { schoolId: id } });
    if (!sub) {
      return NextResponse.json({ error: "No contract found for this school" }, { status: 404 });
    }

    await deleteAdminSchoolFile(sub.contractDocumentPath);

    await prisma.schoolSubscription.update({
      where: { schoolId: id },
      data: {
        contractNumber: null,
        contractValue: null,
        contractStartDate: null,
        contractEndDate: null,
        contractDocumentPath: null,
        contractNotes: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error(e);
    return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
  }
}
