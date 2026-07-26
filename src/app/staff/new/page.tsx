"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import {
  StaffCredentialsModal,
  type StaffPortalCredentials,
} from "@/components/staff/staff-credentials-modal";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { UserPlus } from "lucide-react";

type CreatedStaffResult = Staff & {
  portal?: StaffPortalCredentials;
};

export default function NewStaffPage() {
  const t = useT();
  const router = useRouter();
  const [dashHref, setDashHref] = useState("/dashboard");
  const [created, setCreated] = useState<CreatedStaffResult | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d?.user?.role === "clerk") setDashHref("/clerk");
      })
      .catch(() => {});
  }, []);

  const handleSubmit = async (data: Partial<Staff>) => {
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) {
      alert(result.error || t("staffPage.saveFailed"));
      return;
    }
    setCreated(result as CreatedStaffResult);
  };

  return (
    <PageShell
      title={t("staffPage.addStaff")}
      subtitle={t("staffPage.newStaffSubtitle")}
      icon={<UserPlus className="h-6 w-6 text-teal-700" />}
      accentColor="border-teal-500"
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffPage.addStaff") },
      ]}
    >
      <div className="rounded-2xl bg-gradient-to-b from-slate-50/90 via-white to-slate-50/40 p-3 sm:p-4 md:p-5">
        <StaffForm onSubmit={handleSubmit} />
      </div>

      {created?.portal && (
        <StaffCredentialsModal
          staffName={`${created.firstName} ${created.lastName}`.trim()}
          employeeId={created.employeeId}
          designation={created.designation}
          portal={created.portal}
          onDone={() => router.push("/staff")}
        />
      )}
    </PageShell>
  );
}
