"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { getRoleHome, type UserRole } from "@/lib/roles";
import {
  pathRequiresFeature,
  isFeatureEnabled,
  SCHOOL_FEATURES,
} from "@/lib/school-features";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

/** Blocks modules Super Admin has not assigned to this school — with a clear message (no silent redirect). */
export function SchoolFeatureRouteGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const t = useT();
  const pathname = usePathname();
  const { features, ready } = useSchoolFeatures();

  if (role === "super_admin") return <>{children}</>;
  if (!ready || !features) return <>{children}</>;

  const key = pathRequiresFeature(pathname);
  if (!key || isFeatureEnabled(features, key)) {
    return <>{children}</>;
  }

  const featureLabel =
    SCHOOL_FEATURES.find((f) => f.key === key)?.label || key;
  const home = getRoleHome(role);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 ring-1 ring-amber-100">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="text-lg font-semibold text-slate-900">
          {t("common.featureUnavailableTitle")}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t("common.featureUnavailableBody", { feature: featureLabel })}
        </p>
        <div className="mt-6">
          <Link href={home}>
            <Button className="w-full sm:w-auto">{t("common.backToHome")}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
