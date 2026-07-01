"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import { useT } from "@/i18n/locale-provider";
import type { Staff } from "@/generated/prisma/client";

export default function EditStaffPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [staff, setStaff] = useState<Partial<Staff> | null>(null);

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then(setStaff);
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
    return (
      <div className="flex justify-center h-48 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("staffPage.editStaff")}</h1>
        <p className="text-slate-500 mt-1">{staff.firstName} {staff.lastName}</p>
      </div>
      <StaffForm initialData={staff} onSubmit={handleSubmit} submitLabel={t("staffPage.updateStaff")} />
    </div>
  );
}
