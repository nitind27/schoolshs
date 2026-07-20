import { prisma } from "@/lib/db";

export type SchoolBranding = {
  code: string;
  name: string;
  nameGu?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  udiseCode?: string | null;
  district?: string | null;
  logoPath?: string | null;
};

export async function getSchoolBrandingByCode(code: string): Promise<SchoolBranding | null> {
  const school = await prisma.school.findFirst({
    where: { code: code.trim().toUpperCase(), isActive: true },
    include: { settings: true },
  });
  if (!school) return null;

  return {
    code: school.code,
    name: school.settings?.schoolName || school.name,
    nameGu: school.settings?.schoolName || school.name,
    address: school.settings?.schoolAddress || school.address,
    phone: school.settings?.schoolPhone || school.phone,
    email: school.settings?.schoolEmail || school.email,
    udiseCode: school.udiseCode,
    district: school.district,
    logoPath: school.settings?.logoPath || null,
  };
}

export async function getSchoolBrandingById(schoolId: string): Promise<SchoolBranding | null> {
  const school = await prisma.school.findFirst({
    where: { id: schoolId, isActive: true },
    include: { settings: true },
  });
  if (!school) return null;

  return {
    code: school.code,
    name: school.settings?.schoolName || school.name,
    nameGu: school.settings?.schoolName || school.name,
    address: school.settings?.schoolAddress || school.address,
    phone: school.settings?.schoolPhone || school.phone,
    email: school.settings?.schoolEmail || school.email,
    udiseCode: school.udiseCode,
    district: school.district,
    logoPath: school.settings?.logoPath || null,
  };
}
