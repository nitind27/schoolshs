"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getRoleHome, type UserRole } from "@/lib/roles";
import { pathRequiresFeature, isFeatureEnabled } from "@/lib/school-features";
import { useSchoolFeatures } from "@/components/school/use-school-features";

/** Redirects away from modules Super Admin has not assigned to this school. */
export function SchoolFeatureRouteGuard({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { features, ready } = useSchoolFeatures();

  useEffect(() => {
    if (role === "super_admin") return;
    if (!ready || !features) return;
    const key = pathRequiresFeature(pathname);
    if (!key) return;
    if (!isFeatureEnabled(features, key)) {
      router.replace(getRoleHome(role));
    }
  }, [role, pathname, features, ready, router]);

  return <>{children}</>;
}
