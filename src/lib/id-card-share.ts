import crypto from "crypto";
import { prisma } from "@/lib/db";
import type { IdCardShareLink } from "@/generated/prisma/client";

export function generateShareSlug(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function buildShareUrl(origin: string, slug: string): string {
  return `${origin}/m/id-cards/${slug}`;
}

export function normalizeUploadPath(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const normalized = raw.replace(/\\/g, "/");
  const idx = normalized.indexOf("students/");
  if (idx >= 0) return normalized.slice(idx);
  if (normalized.startsWith("students/")) return normalized;
  return null;
}

export async function getShareLinkBySlug(slug: string) {
  return prisma.idCardShareLink.findUnique({ where: { slug } });
}

export function isShareLinkValid(link: IdCardShareLink): boolean {
  if (!link.isActive) return false;
  if (link.expiresAt && link.expiresAt < new Date()) return false;
  return true;
}

export async function fetchStudentsForShareLink(link: IdCardShareLink) {
  const where: Record<string, unknown> = { schoolId: link.schoolId };
  if (link.classId) {
    where.classId = link.classId;
  } else {
    if (link.standard) where.standard = link.standard;
    if (link.section) where.section = link.section;
    if (link.academicYear) where.schoolClass = { academicYear: link.academicYear };
  }

  return prisma.student.findMany({
    where,
    orderBy: [{ rollNumber: "asc" }, { surname: "asc" }, { firstName: "asc" }],
    include: {
      schoolClass: {
        select: { id: true, name: true, standard: true, section: true, academicYear: true },
      },
    },
  });
}

export async function getSchoolSettingsForShare(schoolId: string) {
  let settings = await prisma.schoolSettings.findUnique({ where: { schoolId } });
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: { schoolId, schoolName: "My School" },
    });
  }
  return settings;
}

export function sharePhotoApiPath(slug: string, studentId: string): string {
  return `/api/id-cards/share/${slug}/photo/${studentId}`;
}

export function shareLogoApiPath(slug: string): string {
  return `/api/id-cards/share/${slug}/logo`;
}
