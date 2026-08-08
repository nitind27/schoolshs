import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getSchoolFeatureBundle } from "@/lib/school-feature-access";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const bundle = await getSchoolFeatureBundle(session.schoolId);
    const school = await prisma.school.findUnique({
      where: { id: session.schoolId },
      select: {
        name: true,
        code: true,
        address: true,
        phone: true,
        udiseCode: true,
        city: true,
        district: true,
        taluka: true,
        pincode: true,
        settings: { select: { schoolName: true, schoolAddress: true, schoolPhone: true } },
      },
    });

    const letterhead = school
      ? {
          name: school.settings?.schoolName || school.name,
          code: school.code,
          address: school.settings?.schoolAddress || school.address,
          phone: school.settings?.schoolPhone || school.phone,
          udiseCode: school.udiseCode || school.code,
          city: school.city,
          district: school.district,
          taluka: school.taluka,
          pincode: school.pincode,
        }
      : null;

    return NextResponse.json({
      features: bundle.features,
      formats: bundle.formats,
      planName: bundle.planName,
      paymentStatus: bundle.paymentStatus,
      letterhead,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
