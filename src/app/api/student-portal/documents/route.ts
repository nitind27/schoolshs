import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireStudentAuth } from "@/lib/auth";
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { compressDocumentServer } from "@/lib/compress-document.server";
import { DG_DOC_LIMITS, formatKB } from "@/lib/dg-document-limits";
import {
  catalogForStandard,
  DOC_FIELD_MAP,
  buildDocRelativePath,
  getDocCatalogItem,
  isDocVisibleForStandard,
  isDocType,
  visibleDocTypesForStandard,
} from "@/lib/student-documents";
import {
  buildDocAbsolutePath,
  previewUrlForDoc,
  relativePathFromAbsolute,
  resolveDocAbsolutePath,
} from "@/lib/student-documents.server";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";

const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];

async function removeFileIfExists(filePath: string | null) {
  if (!filePath) return;
  const abs = path.isAbsolute(filePath) ? filePath : buildDocAbsolutePath(filePath);
  await unlink(abs).catch(() => {});
}

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

/** Student self-service documents — only own studentId. */
export async function GET(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireStudentAuth();
    const id = session.studentId;
    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!student) {
      return mobileJson({ error: "Student not found" }, { status: 404 }, origin);
    }

    const visibleTypes = visibleDocTypesForStandard(student.standard);
    const catalog = catalogForStandard(student.standard);

    const documents = await Promise.all(
      visibleTypes.map(async (type) => {
        const meta = getDocCatalogItem(type);
        const field = DOC_FIELD_MAP[type];
        const stored = student[field as keyof typeof student] as string | null;
        const abs = resolveDocAbsolutePath(id, stored, type);
        let previewUrl: string | null = null;
        let fileName: string | null = null;
        let size: number | null = null;
        let mimeType: string | null = null;
        let dgReady = false;
        let filePath: string | null = stored;
        let uploaded = false;

        if (abs) {
          uploaded = true;
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
          ...meta,
          filePath,
          fileName,
          previewUrl,
          size,
          mimeType,
          dgReady,
          uploaded,
        };
      }),
    );

    const uploadedCount = documents.filter((d) => d.uploaded).length;
    const dgReadyCount = documents.filter((d) => d.dgReady).length;

    return mobileJson(
      {
        studentId: id,
        standard: student.standard || "",
        catalog,
        documents,
        summary: {
          total: documents.length,
          uploaded: uploadedCount,
          dgReady: dgReadyCount,
        },
        rules: {
          maxInputBytes: MAX_INPUT_SIZE,
          allowedMimeTypes: ALLOWED_TYPES,
          dgMaxKB: 200,
          marksheet10: "Show only after student has passed Std 10 (class 11+)",
          marksheet12: "Show only after student has passed Std 12 (not before)",
          formFields: {
            file: "file",
            docType: "docType",
            originalSize: "originalSize (optional)",
          },
        },
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    return mobileJson({ error: "Failed" }, { status: 500 }, origin);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireStudentAuth();
    const id = session.studentId;
    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!student) {
      return mobileJson({ error: "Student not found" }, { status: 404 }, origin);
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = formData.get("docType") as string | null;
    const clientOriginalSize = parseInt(String(formData.get("originalSize") || "0"), 10);

    if (!file || !docType || !isDocType(docType)) {
      return mobileJson(
        { error: "Invalid file or document type", allowedTypes: visibleDocTypesForStandard(student.standard) },
        { status: 400 },
        origin,
      );
    }

    if (!isDocVisibleForStandard(docType, student.standard)) {
      return mobileJson(
        {
          error:
            docType === "marksheet10"
              ? "10th marksheet is only for students who have passed Std 10"
              : docType === "marksheet12"
                ? "12th marksheet is only for students who have passed Std 12"
                : "This document is not required for this class",
          allowedTypes: visibleDocTypesForStandard(student.standard),
        },
        { status: 400 },
        origin,
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return mobileJson(
        { error: "Only JPG, PNG, WEBP or PDF allowed", errorKey: "documents.invalidFileType" },
        { status: 400 },
        origin,
      );
    }

    if (file.size > MAX_INPUT_SIZE) {
      return mobileJson(
        { error: "File must be smaller than 10 MB", errorKey: "documents.fileTooLarge" },
        { status: 400 },
        origin,
      );
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

    const meta = getDocCatalogItem(docType);
    const maxKB = DG_DOC_LIMITS[docType].maxKB;
    const dgReady = compressed.compressedSize <= maxKB * 1024;

    return mobileJson(
      {
        ...meta,
        filePath: relativePath,
        fileName: path.basename(absolutePath),
        previewUrl: `/api/uploads/${relativePath}`,
        mimeType: compressed.mimeType,
        size: compressed.compressedSize,
        originalSize,
        compressed: compressed.compressed || originalSize > compressed.compressedSize,
        dgReady,
        uploaded: true,
        compressMessage:
          originalSize > compressed.compressedSize
            ? `${formatKB(originalSize)} → ${formatKB(compressed.compressedSize)} (DG ${maxKB} KB limit)`
            : `${formatKB(compressed.compressedSize)} — DG ready`,
      },
      undefined,
      origin,
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    console.error("Student document upload error:", error);
    return mobileJson({ error: "Upload failed" }, { status: 500 }, origin);
  }
}

export async function DELETE(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    const session = await requireStudentAuth();
    const id = session.studentId;
    const { docType } = await request.json();

    if (!docType || !isDocType(docType)) {
      return mobileJson(
        { error: "Invalid document type" },
        { status: 400 },
        origin,
      );
    }

    const student = await prisma.student.findFirst({
      where: { id, schoolId: session.schoolId },
    });
    if (!student) {
      return mobileJson({ error: "Student not found" }, { status: 404 }, origin);
    }

    const field = DOC_FIELD_MAP[docType];
    const stored = student[field as keyof typeof student] as string | null;
    await removeFileIfExists(stored);

    await prisma.student.update({
      where: { id },
      data: { [field]: null },
    });

    return mobileJson({ success: true, type: docType }, undefined, origin);
  } catch (error) {
    if (error instanceof AuthError) {
      return mobileJson({ error: error.message }, { status: error.status }, origin);
    }
    return mobileJson({ error: "Delete failed" }, { status: 500 }, origin);
  }
}
