import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireSchoolAuth, AuthError } from "@/lib/auth";
import { normalizeFeatureList, SCHOOL_FEATURE_KEYS, type SchoolFeatureKey } from "@/lib/school-features";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const sub = await prisma.schoolSubscription.findUnique({ where: { schoolId: session.schoolId } });

    let features: SchoolFeatureKey[];
    if (!sub) {
      features = [...SCHOOL_FEATURE_KEYS];
    } else {
      const enabled = normalizeFeatureList(sub.enabledFeatures);
      features = enabled.length ? enabled : [...SCHOOL_FEATURE_KEYS];
    }

    return NextResponse.json({
      features,
      planName: sub?.planName ?? "legacy",
      paymentStatus: sub?.paymentStatus ?? "paid",
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
