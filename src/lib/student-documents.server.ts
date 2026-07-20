import "server-only";

import path from "path";
import { existsSync } from "fs";
import {
  DOC_TYPES,
  type DocType,
} from "@/lib/student-documents";

export function getStudentUploadRoot(studentId: string): string {
  return path.join(process.cwd(), "uploads", "students", studentId);
}

export function buildDocAbsolutePath(relativePath: string): string {
  const normalized = relativePath.replace(/^uploads[/\\]/, "").replace(/\\/g, "/");
  return path.join(process.cwd(), "uploads", ...normalized.split("/"));
}

export function resolveDocAbsolutePath(studentId: string, stored: string | null): string | null {
  if (!stored) return null;

  const candidates: string[] = [];

  if (path.isAbsolute(stored)) {
    candidates.push(stored);
  } else {
    candidates.push(buildDocAbsolutePath(stored));
    candidates.push(path.join(process.cwd(), stored));
  }

  // Legacy flat path: uploads/students/{id}/photo.jpg
  for (const type of DOC_TYPES) {
    candidates.push(path.join(getStudentUploadRoot(studentId), `${type}.jpg`));
    candidates.push(path.join(getStudentUploadRoot(studentId), `${type}.pdf`));
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
  const abs = resolveDocAbsolutePath(studentId, stored);
  if (!abs) return null;
  const rel = relativePathFromAbsolute(abs);
  return `/api/uploads/${rel}`;
}
