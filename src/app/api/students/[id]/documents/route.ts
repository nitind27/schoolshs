import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { writeFile, mkdir, unlink, stat } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { compressDocumentServer } from "@/lib/compress-document.server";
import { DG_DOC_LIMITS, formatKB } from "@/lib/dg-document-limits";
import type { DocType } from "@/components/documents/document-uploader";

const DOC_TYPES = [
  "photo",
  "aadhaar",
  "income",
  "caste",
  "marksheet10",
  "marksheet12",
  "bankPassbook",
  "feeReceipt",
] as const;

const DOC_FIELD_MAP: Record<DocType, string> = {
  photo: "photoPath",
  aadhaar: "aadhaarDocPath",
  income: "incomeCertPath",
  caste: "casteCertPath",
  marksheet10: "marksheet10Path",
  marksheet12: "marksheet12Path",
  bankPassbook: "bankPassbookPath",
  feeReceipt: "feeReceiptPath",
};

const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10MB input allowed — auto-compress to 200KB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

function getUploadDir(studentId: string) {
  return path.join(process.cwd(), "uploads", "students", studentId);
}

function getPreviewUrl(studentId: string, filename: string) {
  return `/api/uploads/students/${studentId}/${filename}`;
}

async function getOwnedStudent(id: string, schoolId: string) {
  return prisma.student.findFirst({ where: { id, schoolId } });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
  const session = await requireSchoolAuth();
  const { id } = await params;
  const student = await getOwnedStudent(id, session.schoolId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const documents = await Promise.all(
    DOC_TYPES.map(async (type) => {
      const field = DOC_FIELD_MAP[type];
      const filePath = student[field as keyof typeof student] as string | null;
      let previewUrl: string | null = null;
      let fileName: string | null = null;
      let size: number | null = null;
      let mimeType: string | null = null;
      let dgReady = false;

      if (filePath) {
        fileName = path.basename(filePath);
        const uploadDir = getUploadDir(id);
        const resolved = path.resolve(filePath);
        if (resolved.startsWith(uploadDir) && existsSync(resolved)) {
          previewUrl = getPreviewUrl(id, fileName);
          const fileStat = await stat(resolved);
          size = fileStat.size;
          const ext = path.extname(resolved).toLowerCase();
          mimeType = ext === ".pdf" ? "application/pdf" : "image/jpeg";
          dgReady = size <= DG_DOC_LIMITS[type].maxKB * 1024;
        }
      }

      return { type, field, filePath, fileName, previewUrl, size, mimeType, dgReady, maxKB: DG_DOC_LIMITS[type].maxKB };
    })
  );

  return NextResponse.json({ documents });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("docType") as DocType | null;
    const clientOriginalSize = parseInt(String(formData.get("originalSize") || "0"), 10);

    if (!file || !docType || !DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: "Invalid file or document type" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Sirf JPG, PNG, WEBP ya PDF allowed hai" },
        { status: 400 }
      );
    }

    if (file.size > MAX_INPUT_SIZE) {
      return NextResponse.json(
        { error: "File 10MB se chhoti honi chahiye" },
        { status: 400 }
      );
    }

    const originalSize = clientOriginalSize || file.size;
    const inputBuffer = Buffer.from(await file.arrayBuffer());

    const compressed = await compressDocumentServer(inputBuffer, file.type, docType);

    const uploadDir = getUploadDir(id);
    await mkdir(uploadDir, { recursive: true });

    const filename = `${docType}${compressed.ext}`;
    const filePath = path.join(uploadDir, filename);

    const field = DOC_FIELD_MAP[docType];
    const oldPath = student[field as keyof typeof student] as string | null;
    if (oldPath && oldPath !== filePath && existsSync(oldPath)) {
      await unlink(oldPath).catch(() => {});
    }

    await writeFile(filePath, compressed.buffer);

    const absolutePath = path.resolve(filePath);
    await prisma.student.update({
      where: { id },
      data: { [field]: absolutePath },
    });

    const maxKB = DG_DOC_LIMITS[docType].maxKB;
    const dgReady = compressed.compressedSize <= maxKB * 1024;

    return NextResponse.json({
      type: docType,
      field,
      filePath: absolutePath,
      fileName: filename,
      previewUrl: getPreviewUrl(id, filename),
      mimeType: compressed.mimeType,
      size: compressed.compressedSize,
      originalSize,
      compressed: compressed.compressed || originalSize > compressed.compressedSize,
      dgReady,
      maxKB,
      compressMessage:
        originalSize > compressed.compressedSize
          ? `${formatKB(originalSize)} → ${formatKB(compressed.compressedSize)} (DG ${maxKB} KB limit)`
          : `${formatKB(compressed.compressedSize)} — DG ready`,
    });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Document upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSchoolAuth();
    const { id } = await params;
    const { docType } = await request.json();

    if (!docType || !DOC_TYPES.includes(docType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const field = DOC_FIELD_MAP[docType as DocType];
    const filePath = student[field as keyof typeof student] as string | null;

    if (filePath && existsSync(filePath)) {
      const uploadDir = getUploadDir(id);
      if (path.resolve(filePath).startsWith(uploadDir)) {
        await unlink(filePath).catch(() => {});
      }
    }

    await prisma.student.update({
      where: { id },
      data: { [field]: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
