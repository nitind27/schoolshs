"use client";

import { useRouter } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { STAFF_ROLE_WORK } from "@/lib/constants";
import { PageShell } from "@/components/layout/page-shell";

export default function NewStaffPage() {
  const t = useT();
  const router = useRouter();

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
    router.push("/staff");
  };

  return (
    <PageShell
      title={t("staffPage.addStaff")}
      subtitle={t("staffPage.newStaffSubtitle")}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffPage.addStaff") },
      ]}
    >
      <Card className="border-blue-200 bg-blue-50/60">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-blue-900">Core Roles and Main Work</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="font-semibold text-slate-900">Teacher</p>
            <p className="text-slate-600 mt-1">{STAFF_ROLE_WORK.teacher[0]}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="font-semibold text-slate-900">Peon</p>
            <p className="text-slate-600 mt-1">{STAFF_ROLE_WORK.peon[0]}</p>
          </div>
          <div className="rounded-lg border border-blue-100 bg-white p-3">
            <p className="font-semibold text-slate-900">Supervisor</p>
            <p className="text-slate-600 mt-1">{STAFF_ROLE_WORK.supervisor[0]}</p>
          </div>
        </CardContent>
      </Card>
      <StaffForm onSubmit={handleSubmit} />
    </PageShell>
  );
}
