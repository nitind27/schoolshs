"use client";

import { useRouter } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("staffPage.addStaff")}</h1>
        <p className="text-slate-500 mt-1">{t("staffPage.newStaffSubtitle")}</p>
      </div>
      <StaffForm onSubmit={handleSubmit} />
    </div>
  );
}
