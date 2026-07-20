"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { PageShell } from "@/components/layout/page-shell";
import { UserPlus } from "lucide-react";

export default function NewStaffPage() {
  const t = useT();
  const router = useRouter();
  const [dashHref, setDashHref] = useState("/dashboard");

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
    router.push("/staff");
  };

  return (
    <PageShell
      title={t("staffPage.addStaff")}
      subtitle={t("staffPage.newStaffSubtitle")}
      icon={<UserPlus className="h-6 w-6 text-blue-600" />}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: dashHref },
        { label: t("nav.staff"), href: "/staff" },
        { label: t("staffPage.addStaff") },
      ]}
    >
      <StaffForm onSubmit={handleSubmit} />
    </PageShell>
  );
}
