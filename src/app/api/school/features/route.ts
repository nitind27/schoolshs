import { NextResponse } from "next/server";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { getSchoolFeatureBundle } from "@/lib/school-feature-access";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const bundle = await getSchoolFeatureBundle(session.schoolId);

    return NextResponse.json({
      features: bundle.features,
      formats: bundle.formats,
      planName: bundle.planName,
      paymentStatus: bundle.paymentStatus,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
