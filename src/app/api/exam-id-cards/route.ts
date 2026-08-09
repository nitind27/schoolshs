import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { requireSchoolFeature } from "@/lib/school-feature-access";
import { staffPhotoFileExists, staffPhotoPublicUrl } from "@/lib/staff-photo.server";

export async function GET(request: NextRequest) {
  try {
    const session = await requireSchoolAuth(["school_admin", "clerk"]);
    await requireSchoolFeature(session.schoolId, "id_cards");
    const { searchParams } = new URL(request.url);
    const designation = searchParams.get("designation") || "";
    const department = searchParams.get("department") || "";
    const activeOnly = searchParams.get("active") !== "0";
    const idsParam = searchParams.get("ids");
    const search = searchParams.get("q")?.trim() || "";

    const where: Record<string, unknown> = { schoolId: session.schoolId };
    if (activeOnly) where.isActive = true;
    if (designation) where.designation = designation;
    if (department) where.department = department;
    if (idsParam) {
      const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean);
      if (ids.length) where.id = { in: ids };
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { employeeId: { contains: search } },
        { mobileNumber: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const [staffRows, settings, designations, departments] = await Promise.all([
      prisma.staff.findMany({
        where,
        orderBy: [{ designation: "asc" }, { firstName: "asc" }, { lastName: "asc" }],
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
        },
      }),
      prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } }),
      prisma.staff.findMany({
        where: { schoolId: session.schoolId, isActive: true },
        select: { designation: true },
        distinct: ["designation"],
        orderBy: { designation: "asc" },
      }),
      prisma.staff.findMany({
        where: { schoolId: session.schoolId, isActive: true, department: { not: null } },
        select: { department: true },
        distinct: ["department"],
        orderBy: { department: "asc" },
      }),
    ]);

    let schoolSettings = settings;
    if (!schoolSettings) {
      schoolSettings = await prisma.schoolSettings.create({
        data: {
          schoolId: session.schoolId,
          schoolName: session.schoolName || "My School",
        },
      });
    }

    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: {
        name: true,
        address: true,
        district: true,
        phone: true,
        principalName: true,
        code: true,
      },
    });

    // Only expose photoPath when the file actually exists on disk
    const staff = staffRows.map((row) => {
      const hasPhoto = staffPhotoFileExists(row.photoPath);
      const photoPath = hasPhoto ? row.photoPath : null;
      return {
        ...row,
        photoPath,
        hasPhoto,
        photoUrl: staffPhotoPublicUrl(photoPath),
      };
    });

    const withPhoto = staff.filter((s) => s.hasPhoto).length;

    return NextResponse.json({
      staff,
      settings: schoolSettings,
      school,
      filters: {
        designations: designations.map((d) => d.designation).filter(Boolean),
        departments: departments
          .map((d) => d.department)
          .filter((d): d is string => Boolean(d)),
      },
      total: staff.length,
      withPhoto,
      withoutPhoto: staff.length - withPhoto,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[exam-id-cards GET]", e);
    return NextResponse.json({ error: "Failed", staff: [] }, { status: 500 });
  }
}
