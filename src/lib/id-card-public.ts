import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { prisma } from "@/lib/db";
import { normalizeSchoolAssetPath, normalizeUploadPath } from "@/lib/id-card-share";
import { projectPath } from "@/lib/project-path";

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function serveUploadRelative(relativePath: string, cache = "public, max-age=3600") {
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
      "Cache-Control": cache,
    },
  });
}

/** Public student payload for QR-scanned ID card (no login). */
export async function getPublicStudentIdCard(studentId: string) {
  const id = String(studentId || "").trim();
  if (!id || id.length < 10) return null;

  const student = await prisma.student.findUnique({
    where: { id },
    select: {
      id: true,
      firstName: true,
      middleName: true,
      surname: true,
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      fatherName: true,
      fatherNameGu: true,
      mobileNumber: true,
      dateOfBirth: true,
      grNumber: true,
      rollNumber: true,
      standard: true,
      section: true,
      currentAddress: true,
      currentCity: true,
      currentDistrict: true,
      financialYear: true,
      idPhotoProcessedPath: true,
      photoPath: true,
      schoolId: true,
      schoolClass: {
        select: { id: true, name: true, standard: true, section: true, academicYear: true },
      },
    },
  });

  if (!student?.schoolId) return null;

  let settings = await prisma.schoolSettings.findUnique({ where: { schoolId: student.schoolId } });
  if (!settings) {
    settings = await prisma.schoolSettings.create({
      data: { schoolId: student.schoolId, schoolName: "School" },
    });
  }

  const school = await prisma.school.findUnique({
    where: { id: student.schoolId },
    select: { website: true, phone: true, udiseCode: true, code: true, name: true },
  });

  const diseCode = (school?.udiseCode || school?.code || "").trim();
  const website = (settings.idCardWebsite || school?.website || "").trim() || null;
  const hasPhoto = !!(student.idPhotoProcessedPath || student.photoPath);

  const {
    idPhotoProcessedPath: _p,
    photoPath: _ph,
    schoolId: _s,
    ...safeStudent
  } = student;

  return {
    student: safeStudent,
    settings: {
      schoolName: settings.schoolName,
      schoolAddress: settings.schoolAddress,
      schoolPhone: settings.schoolPhone || school?.phone || null,
      schoolEmail: settings.schoolEmail,
      academicYear: settings.academicYear,
      tagline: settings.tagline,
      idCardPrimaryColor: settings.idCardPrimaryColor,
      idCardAccentColor: settings.idCardAccentColor,
      idCardWebsite: website,
      logoPath: settings.logoPath,
      signaturePath: settings.signaturePath,
    },
    diseCode,
    hasPhoto,
    photoUrl: hasPhoto ? `/api/id-cards/public/${student.id}/photo` : null,
    logoUrl: settings.logoPath ? `/api/id-cards/public/${student.id}/logo` : null,
    signatureUrl: settings.signaturePath ? `/api/id-cards/public/${student.id}/signature` : null,
    website,
  };
}

export async function resolvePublicStudentPhotoRel(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { idPhotoProcessedPath: true, photoPath: true },
  });
  if (!student) return null;
  return normalizeUploadPath(student.idPhotoProcessedPath || student.photoPath);
}

export async function resolvePublicStudentAssetRel(
  studentId: string,
  kind: "logo" | "signature",
) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { schoolId: true },
  });
  if (!student?.schoolId) return null;
  const settings = await prisma.schoolSettings.findUnique({
    where: { schoolId: student.schoolId },
    select: { logoPath: true, signaturePath: true },
  });
  if (!settings) return null;
  return normalizeSchoolAssetPath(kind === "logo" ? settings.logoPath : settings.signaturePath);
}
