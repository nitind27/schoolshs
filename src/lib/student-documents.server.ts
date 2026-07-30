import path from "path";
import { existsSync } from "fs";
import { type DocType } from "@/lib/student-documents";

export function getStudentUploadRoot(studentId: string): string {
  return path.join(process.cwd(), "uploads", "students", studentId);
}

export function buildDocAbsolutePath(relativePath: string): string {
  const normalized = relativePath.replace(/^uploads[/\\]/, "").replace(/\\/g, "/");
  return path.join(process.cwd(), "uploads", ...normalized.split("/"));
}

export function resolveDocAbsolutePath(
  studentId: string,
  stored: string | null,
  docType?: DocType,
): string | null {
  if (!stored) return null;

  const candidates: string[] = [];

  if (path.isAbsolute(stored)) {
    candidates.push(stored);
  } else {
    candidates.push(buildDocAbsolutePath(stored));
    candidates.push(path.join(process.cwd(), stored));
  }

  // Legacy flat path: only the requested document type, never another file.
  if (docType) {
    candidates.push(path.join(getStudentUploadRoot(studentId), `${docType}.jpg`));
    candidates.push(path.join(getStudentUploadRoot(studentId), `${docType}.jpeg`));
    candidates.push(path.join(getStudentUploadRoot(studentId), `${docType}.png`));
    candidates.push(path.join(getStudentUploadRoot(studentId), `${docType}.pdf`));
  }

  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

export function relativePathFromAbsolute(absolutePath: string): string {
  const uploadsRoot = path.join(process.cwd(), "uploads");
  const resolved = path.resolve(absolutePath);
  if (resolved.startsWith(uploadsRoot)) {
    return path.relative(uploadsRoot, resolved).replace(/\\/g, "/");
  }
  return resolved.replace(/\\/g, "/");
}

export function previewUrlForDoc(studentId: string, stored: string | null, docType: DocType): string | null {
  const abs = resolveDocAbsolutePath(studentId, stored, docType);
  if (!abs) return null;
  const rel = relativePathFromAbsolute(abs);
  return `/api/uploads/${rel}`;
}
