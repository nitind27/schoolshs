import { prisma } from "@/lib/db";
import { AuthError } from "@/lib/auth";
import {
  defaultFeaturesForPlan,
  isFeatureEnabled,
  normalizeModuleFormats,
  resolveEnabledFeatures,
  SCHOOL_FEATURE_KEYS,
  type ModuleFormatMap,
  type SchoolFeatureKey,
} from "@/lib/school-features";

export async function getSchoolFeatureBundle(schoolId: string): Promise<{
  features: SchoolFeatureKey[];
  formats: ModuleFormatMap;
  planName: string;
  paymentStatus: string;
}> {
  const sub = await prisma.schoolSubscription.findUnique({ where: { schoolId } });
  if (!sub) {
    return {
      features: [...SCHOOL_FEATURE_KEYS],
      formats: normalizeModuleFormats(null),
      planName: "legacy",
      paymentStatus: "paid",
    };
  }
  return {
    features: resolveEnabledFeatures(sub.enabledFeatures, sub.planName),
    formats: normalizeModuleFormats(sub.moduleFormats),
    planName: sub.planName ?? "standard",
    paymentStatus: sub.paymentStatus ?? "pending",
  };
}

export async function getSchoolEnabledFeatures(schoolId: string): Promise<SchoolFeatureKey[]> {
  const { features } = await getSchoolFeatureBundle(schoolId);
  return features;
}

export async function schoolHasFeature(
  schoolId: string,
  key: SchoolFeatureKey,
): Promise<boolean> {
  const features = await getSchoolEnabledFeatures(schoolId);
  return isFeatureEnabled(features, key);
}

/** Throws 403 when Super Admin has not enabled this module for the school. */
export async function requireSchoolFeature(
  schoolId: string,
  key: SchoolFeatureKey,
): Promise<void> {
  const ok = await schoolHasFeature(schoolId, key);
  if (!ok) {
    throw new AuthError(
      "This module is not enabled for your school. Ask Super Admin to enable it.",
      403,
    );
  }
}

export async function getSchoolModuleFormats(schoolId: string): Promise<ModuleFormatMap> {
  const { formats } = await getSchoolFeatureBundle(schoolId);
  return formats;
}

/** Role portal login gate — Super Admin must enable the matching portal feature. */
export async function assertPortalFeatureForRole(
  schoolId: string | null | undefined,
  role: string,
): Promise<void> {
  if (!schoolId) return;
  const map: Record<string, SchoolFeatureKey> = {
    teacher: "portal_teacher",
    clerk: "portal_clerk",
    ca: "portal_ca",
    student: "portal_student",
  };
  const key = map[role];
  if (!key) return;
  await requireSchoolFeature(schoolId, key);
}

export function fallbackFeaturesForEmptySub(planName?: string | null): SchoolFeatureKey[] {
  return defaultFeaturesForPlan(planName || "standard");
}
