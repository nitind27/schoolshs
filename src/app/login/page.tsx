"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EducationLoginHub } from "@/components/auth/education-login-hub";
import { PageLoader } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";

function LoginLoading() {
  const t = useT();
  return <PageLoader screen label={t("common.loadingPortal")} />;
}

function LoginInner() {
  const params = useSearchParams();
  const next = params.get("next") || "/";
  return <EducationLoginHub next={next} />;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginInner />
    </Suspense>
  );
}
