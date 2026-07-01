import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const existing = await prisma.student.findFirst({ where: { id, schoolId: session.schoolId } });
    if (!existing) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const body = await request.json();
    const student = await prisma.student.update({
      where: { id },
      data: {
        dgLoginId: body.dgLoginId || null,
        dgPassword: body.dgPassword || null,
        dgLoginMethod: body.dgLoginMethod || "mobile",
        photoPath: body.photoPath || null,
        aadhaarDocPath: body.aadhaarDocPath || null,
        incomeCertPath: body.incomeCertPath || null,
        casteCertPath: body.casteCertPath || null,
        marksheet10Path: body.marksheet10Path || null,
        marksheet12Path: body.marksheet12Path || null,
        bankPassbookPath: body.bankPassbookPath || null,
        feeReceiptPath: body.feeReceiptPath || null,
      },
    });

    return NextResponse.json(student);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
  }
}
