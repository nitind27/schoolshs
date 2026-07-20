import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { compressDocumentServer } from "@/lib/compress-document.server";
import { DG_DOC_LIMITS, formatKB } from "@/lib/dg-document-limits";
import {
  DOC_FIELD_MAP,
  DOC_TYPES,
  buildDocRelativePath,
  isDocType,
  type DocType,
} from "@/lib/student-documents";
import {
  buildDocAbsolutePath,
  previewUrlForDoc,
  relativePathFromAbsolute,
  resolveDocAbsolutePath,
} from "@/lib/student-documents.server";

const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

async function getOwnedStudent(id: string, schoolId: string) {
  return prisma.student.findFirst({ where: { id, schoolId } });
}

async function removeFileIfExists(filePath: string | null) {
  if (!filePath) return;
  const abs = path.isAbsolute(filePath) ? filePath : buildDocAbsolutePath(filePath);
  await unlink(abs).catch(() => {});
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
        const stored = student[field as keyof typeof student] as string | null;
        const abs = resolveDocAbsolutePath(id, stored);
        let previewUrl: string | null = null;
        let fileName: string | null = null;
        let size: number | null = null;
        let mimeType: string | null = null;
        let dgReady = false;
        let filePath: string | null = stored;

        if (abs) {
          fileName = path.basename(abs);
          previewUrl = previewUrlForDoc(id, stored, type);
          const { stat } = await import("fs/promises");
          const fileStat = await stat(abs);
          size = fileStat.size;
          const ext = path.extname(abs).toLowerCase();
          mimeType = ext === ".pdf" ? "application/pdf" : "image/jpeg";
          dgReady = size <= DG_DOC_LIMITS[type].maxKB * 1024;
          filePath = relativePathFromAbsolute(abs);
        }

        return {
          type,
          field,
          filePath,
          fileName,
          previewUrl,
          size,
          mimeType,
          dgReady,
          maxKB: DG_DOC_LIMITS[type].maxKB,
        };
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
    const docType = formData.get("docType") as string | null;
    const clientOriginalSize = parseInt(String(formData.get("originalSize") || "0"), 10);

    if (!file || !docType || !isDocType(docType)) {
      return NextResponse.json({ error: "Invalid file or document type" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ errorKey: "documents.invalidFileType" }, { status: 400 });
    }

    if (file.size > MAX_INPUT_SIZE) {
      return NextResponse.json({ errorKey: "documents.fileTooLarge" }, { status: 400 });
    }

    const originalSize = clientOriginalSize || file.size;
    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const compressed = await compressDocumentServer(inputBuffer, file.type, docType);

    const relativePath = buildDocRelativePath(id, docType, compressed.ext);
    const absolutePath = buildDocAbsolutePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });

    const field = DOC_FIELD_MAP[docType];
    const oldStored = student[field as keyof typeof student] as string | null;
    await removeFileIfExists(oldStored);

    await writeFile(absolutePath, compressed.buffer);

    await prisma.student.update({
      where: { id },
      data: { [field]: relativePath },
    });

    const maxKB = DG_DOC_LIMITS[docType].maxKB;
    const dgReady = compressed.compressedSize <= maxKB * 1024;

    return NextResponse.json({
      type: docType,
      field,
      filePath: relativePath,
      fileName: path.basename(absolutePath),
      previewUrl: `/api/uploads/${relativePath}`,
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

    if (!docType || !isDocType(docType)) {
      return NextResponse.json({ error: "Invalid document type" }, { status: 400 });
    }

    const student = await getOwnedStudent(id, session.schoolId);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const field = DOC_FIELD_MAP[docType];
    const stored = student[field as keyof typeof student] as string | null;
    await removeFileIfExists(stored);

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
