"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EducationLoginHub } from "@/components/auth/education-login-hub";
import { useT } from "@/i18n/locale-provider";

function LoginLoading() {
  const t = useT();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-blue-200 border-t-blue-600" />
        <p className="text-sm text-slate-500">{t("common.loadingPortal")}</p>
      </div>
    </div>
  );
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
