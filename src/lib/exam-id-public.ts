import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { normalizeSchoolAssetPath } from "@/lib/id-card-share";
import { staffPhotoFileExists } from "@/lib/staff-photo.server";
import { projectPath } from "@/lib/project-path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function serveUploadRelative(relativePath: string) {
  const uploadRoot = projectPath("uploads");
  const filePath = path.join(uploadRoot, ...relativePath.split("/"));
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(uploadRoot)) || !existsSync(resolved)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const ext = path.extname(resolved).toLowerCase();
  const buffer = await readFile(resolved);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=3600",
    },
  });
}

export async function getPublicExamStaffCard(staffId: string) {
  const id = String(staffId || "").trim();
  if (!id || id.length < 10) return null;

  const staff = await prisma.staff.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      firstNameGu: true,
      lastNameGu: true,
      employeeId: true,
      designation: true,
      department: true,
      mobileNumber: true,
      photoPath: true,
      qualification: true,
      isActive: true,
      schoolId: true,
    },
  });

  if (!staff?.schoolId || !staff.isActive) return null;

  let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: staff.schoolId } });
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: { schoolId: staff.schoolId, schoolName: "School" },
    });
  }

  const school = await prisma.school.findUnique({
    where: { id: staff.schoolId },
    select: {
      name: true,
      address: true,
      district: true,
      phone: true,
      website: true,
      code: true,
    },
  });

  const hasPhoto = staffPhotoFileExists(staff.photoPath);
  const website = (settings.idCardWebsite || school?.website || "").trim() || null;

  return {
    staff: {
      id: staff.id,
      firstName: staff.firstName,
      lastName: staff.lastName,
      firstNameGu: staff.firstNameGu,
      lastNameGu: staff.lastNameGu,
      employeeId: staff.employeeId,
      designation: staff.designation,
      department: staff.department,
      mobileNumber: staff.mobileNumber,
      qualification: staff.qualification,
      hasPhoto,
    },
    settings: {
      schoolName: settings.schoolName,
      schoolAddress: settings.schoolAddress,
      schoolPhone: settings.schoolPhone || school?.phone || null,
      tagline: settings.tagline,
      academicYear: settings.academicYear,
      idCardWebsite: website,
    },
    school: school
      ? {
          name: school.name,
          address: school.address,
          district: school.district,
          phone: school.phone,
          code: school.code,
        }
      : null,
    website,
    photoUrl: hasPhoto ? `/api/exam-id-cards/public/${staff.id}/photo` : null,
    logoUrl: settings.logoPath ? `/api/exam-id-cards/public/${staff.id}/logo` : null,
    signatureUrl: settings.signaturePath
      ? `/api/exam-id-cards/public/${staff.id}/signature`
      : null,
  };
}

export async function resolvePublicExamPhotoRel(staffId: string) {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { photoPath: true, isActive: true },
  });
  if (!staff?.isActive || !staffPhotoFileExists(staff.photoPath)) return null;
  return staff.photoPath!.replace(/^uploads\//, "").replace(/^\/+/, "");
}

export async function resolvePublicExamAssetRel(staffId: string, kind: "logo" | "signature") {
  const staff = await prisma.staff.findUnique({
    where: { id: staffId },
    select: { schoolId: true, isActive: true },
  });
  if (!staff?.schoolId || !staff.isActive) return null;
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId: staff.schoolId },
    select: { logoPath: true, signaturePath: true },
  });
  if (!settings) return null;
  return normalizeSchoolAssetPath(kind === "logo" ? settings.logoPath : settings.signaturePath);
}
