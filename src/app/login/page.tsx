"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EducationLoginHub } from "@/components/auth/education-login-hub";
import { useT } from "@/i18n/locale-provider";

function LoginLoading() {
  const t = useT();
  return (
    <div
      className="flex min-h-screen min-h-dvh flex-col items-center justify-center gap-4"
      style={{ background: "linear-gradient(180deg, #eef4f1 0%, #f2f6f4 100%)" }}
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[#d4dfd9] border-t-[#1a6550]"
        aria-hidden
      />
      <p className="text-sm font-medium text-[#5a6d65]">{t("common.loadingPortal")}</p>
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
