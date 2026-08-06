"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { StaffForm } from "@/components/forms/staff-form";
import { useT } from "@/i18n/locale-provider";
import type { Staff } from "@/generated/prisma/client";
import { KeyRound, ArrowRight, UserRoundPen } from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";

export default function EditStaffPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [staff, setStaff] = useState<Partial<Staff> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [dashHref, setDashHref] = useState("/dashboard");

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then(setStaff);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        setIsAdmin(d.user?.role === "school_admin");
        if (d?.user?.role === "clerk") setDashHref("/clerk");
      });
  }, [id]);

  const handleSubmit = async (data: Partial<Staff>) => {
    const res = await fetch(`/api/staff/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || t("staffPage.updateFailed"));
      return;
    }
    router.push("/staff");
  };

  if (!staff) {
    return <PageLoader />;
  }

  return (
    <PageShell
      title={t("staffPage.editStaff")}
      subtitle={`${staff.firstName || ""} ${staff.lastName || ""}`.trim()}
      icon={<UserRoundPen className="h-6 w-6 text-teal-700" />}
      accentColor="border-teal-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffPage.editStaff") },
      ]}
    >
      {isAdmin && (
        <Link
          href={`/staff/${id}/account`}
          className="group mb-1 flex items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white px-4 py-3.5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-700 text-white">
              <KeyRound className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">
                {t("accountSettings.loginPasswordAction")}
              </p>
              <p className="text-xs text-slate-500">{t("accountSettings.loginPasswordActionHint")}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 shrink-0 text-teal-700 transition group-hover:translate-x-0.5" />
        </Link>
      )}

      <div className="w-full">
        <StaffForm
          initialData={staff}
          onSubmit={handleSubmit}
          submitLabel={t("staffPage.updateStaff")}
        />
      </div>
    </PageShell>
  );
}
