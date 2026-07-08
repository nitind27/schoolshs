"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GENDERS, STAFF_DESIGNATIONS, getStaffRoleWork } from "@/lib/constants";
import { Save } from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

type StaffFormData = Partial<Staff>;

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
}

export function StaffForm({ initialData = {}, onSubmit, submitLabel }: StaffFormProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<StaffFormData>({
    isActive: true,
    ...initialData,
  });

  const resolvedSubmitLabel = submitLabel ?? t("staffPage.saveStaff");
  const roleWork = getStaffRoleWork(String(form.designation || ""));
  const isEditMode = Boolean(initialData?.id);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (isEditMode || form.employeeId) return;
    fetch("/api/staff?active=false")
      .then((r) => r.json())
      .then((d) => {
        const rows = Array.isArray(d?.staff) ? d.staff : [];
        const used = new Set<string>(
          rows
            .map((s: Staff) => String(s.employeeId || "").trim().toUpperCase())
            .filter((id: string): id is string => id.length > 0)
        );
        let maxSeq = 0;
        for (const id of used) {
          const match = /^EMP(\d+)$/.exec(id);
          if (!match) continue;
          const seq = Number.parseInt(match[1], 10);
          if (!Number.isNaN(seq)) maxSeq = Math.max(maxSeq, seq);
        }
        const next = `EMP${String(maxSeq + 1).padStart(4, "0")}`;
        setForm((prev) => (prev.employeeId ? prev : { ...prev, employeeId: next }));
      })
      .catch(() => {
        // Server also auto-generates employee ID on save.
      });
  }, [isEditMode, form.employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("staffPage.staffDetails")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={t("staffPage.employeeId")}
            placeholder="EMP0001"
            value={form.employeeId || ""}
            onChange={(e) => update("employeeId", e.target.value)}
            disabled={!isEditMode}
          />
          <Input label={t("staffPage.firstName")} required value={form.firstName || ""} onChange={(e) => update("firstName", e.target.value)} />
          <Input label={t("staffPage.lastName")} required value={form.lastName || ""} onChange={(e) => update("lastName", e.target.value)} />
          <Select label={t("staffPage.designation")} required options={STAFF_DESIGNATIONS} value={form.designation || ""} onChange={(e) => update("designation", e.target.value)} />
          <Input label={t("staffPage.department")} value={form.department || ""} onChange={(e) => update("department", e.target.value)} />
          <Select label={t("staffPage.gender")} options={GENDERS} value={form.gender || ""} onChange={(e) => update("gender", e.target.value)} />
          <Input label={t("staffPage.mobileNumber")} required maxLength={10} value={form.mobileNumber || ""} onChange={(e) => update("mobileNumber", e.target.value)} />
          <Input label={t("common.email")} type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
          <Input label={t("staffPage.dateOfJoining")} value={form.dateOfJoining || ""} onChange={(e) => update("dateOfJoining", e.target.value)} />
          {roleWork.length > 0 && (
            <div className="md:col-span-2 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <p className="text-sm font-semibold text-blue-900">Main Work - {form.designation}</p>
              <ul className="mt-2 space-y-1 text-sm text-blue-800 list-disc pl-5">
                {roleWork.map((task) => (
                  <li key={task}>{task}</li>
                ))}
              </ul>
            </div>
          )}
          <label className="flex items-center gap-2 text-sm md:col-span-2">
            <input type="checkbox" checked={form.isActive !== false} onChange={(e) => update("isActive", e.target.checked)} className="rounded" />
            {t("staffPage.activeStaff")}
          </label>
          <div className="md:col-span-2 flex justify-end pt-4">
            <Button type="submit" variant="success" disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? t("common.saving") : resolvedSubmitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
