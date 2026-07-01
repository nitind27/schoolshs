import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { processIdCardPhoto } from "@/lib/id-photo-processor";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import fs from "fs/promises";
import path from "path";

type RouteParams = { params: Promise<{ id: string }> };

async function getOwnedStudent(id: string, schoolId: string) {
  return prisma.student.findFirst({ where: { id, schoolId } });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const photoRel = student.photoPath || student.idPhotoProcessedPath;
    if (!photoRel) {
      return NextResponse.json({ error: "Student photo not uploaded" }, { status: 400 });
    }

    const photoPath = path.join(process.cwd(), "uploads", photoRel.replace(/^\/+/, ""));
    let inputBuffer: Buffer;
    try {
      inputBuffer = await fs.readFile(photoPath);
    } catch {
      return NextResponse.json({ error: "Photo file not found on disk" }, { status: 404 });
    }

    const processed = await processIdCardPhoto(inputBuffer);
    const outDir = path.join(process.cwd(), "uploads", "students", id);
    await fs.mkdir(outDir, { recursive: true });
    const outRel = `students/${id}/id-photo-processed.jpg`;
    const outPath = path.join(process.cwd(), "uploads", outRel);
    await fs.writeFile(outPath, processed.buffer);

    await prisma.student.update({
      where: { id },
      data: { idPhotoProcessedPath: outRel },
    });

    return NextResponse.json({
      success: true,
      idPhotoProcessedPath: outRel,
      width: processed.width,
      height: processed.height,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("POST /api/students/[id]/id-photo error:", error);
    return NextResponse.json({ error: "Failed to process ID photo" }, { status: 500 });
  }
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    return NextResponse.json({
      photoPath: student.photoPath,
      idPhotoProcessedPath: student.idPhotoProcessedPath,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
