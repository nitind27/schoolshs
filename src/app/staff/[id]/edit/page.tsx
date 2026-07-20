"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { StaffForm } from "@/components/forms/staff-form";
import { StaffPortalAccountPanel } from "@/components/staff/staff-portal-account-panel";
import { useT } from "@/i18n/locale-provider";
import type { Staff } from "@/generated/prisma/client";

export default function EditStaffPage() {
  const t = useT();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const [staff, setStaff] = useState<Partial<Staff> | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    fetch(`/api/staff/${id}`)
      .then((r) => r.json())
      .then(setStaff);
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => setIsAdmin(d.user?.role === "school_admin"));
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
        <p className="text-slate-500 mt-1">
          {staff.firstName} {staff.lastName}
        </p>
      </div>
      <StaffForm initialData={staff} onSubmit={handleSubmit} submitLabel={t("staffPage.updateStaff")} />
      {isAdmin && <StaffPortalAccountPanel staffId={id} />}
    </div>
  );
}
