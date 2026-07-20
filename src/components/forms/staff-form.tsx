"use client";

import { useEffect, useState, type ComponentType } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GENDERS, STAFF_DESIGNATIONS, getStaffRoleWork } from "@/lib/constants";
import {
  ArrowLeft,
  BadgeCheck,
  Banknote,
  Briefcase,
  Save,
  UserRound,
} from "lucide-react";
import type { Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import Link from "next/link";

type StaffFormData = Partial<Staff>;

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
}

function SectionHead({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
    </div>
  );
}

export function StaffForm({
  initialData = {},
  onSubmit,
  submitLabel,
  cancelHref = "/staff",
}: StaffFormProps) {
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
      .catch(() => {});
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
    <form
      onSubmit={handleSubmit}
      className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-200/40"
    >
      {/* Basic identity */}
      <section className="border-b border-slate-100 p-4 md:p-5">
        <SectionHead icon={UserRound} title={t("staffPage.staffDetails")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t("staffPage.employeeId")}
            placeholder="EMP0001"
            value={form.employeeId || ""}
            onChange={(e) => update("employeeId", e.target.value)}
            disabled={!isEditMode}
          />
          <Input
            label={t("staffPage.firstName")}
            required
            value={form.firstName || ""}
            onChange={(e) => update("firstName", e.target.value)}
          />
          <Input
            label={t("staffPage.lastName")}
            required
            value={form.lastName || ""}
            onChange={(e) => update("lastName", e.target.value)}
          />
          <Select
            label={t("staffPage.designation")}
            required
            options={STAFF_DESIGNATIONS}
            value={form.designation || ""}
            onChange={(e) => update("designation", e.target.value)}
          />
          <Input
            label={t("staffPage.department")}
            value={form.department || ""}
            onChange={(e) => update("department", e.target.value)}
          />
          <Select
            label={t("staffPage.gender")}
            options={GENDERS}
            value={form.gender || ""}
            onChange={(e) => update("gender", e.target.value)}
          />
          <Input
            label={t("staffPage.mobileNumber")}
            required
            maxLength={10}
            value={form.mobileNumber || ""}
            onChange={(e) => update("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
          />
          <Input
            label={t("common.email")}
            type="email"
            value={form.email || ""}
            onChange={(e) => update("email", e.target.value)}
          />
          <Input
            label={t("staffPage.dateOfJoining")}
            placeholder="DD-MM-YYYY"
            value={form.dateOfJoining || ""}
            onChange={(e) => update("dateOfJoining", e.target.value)}
          />
        </div>
        {roleWork.length > 0 && (
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-slate-700">
              {t("staffPage.mainWork")} — {form.designation}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">
              {roleWork.join(" · ")}
            </p>
          </div>
        )}
      </section>

      {/* Service register */}
      <section className="border-b border-slate-100 p-4 md:p-5">
        <SectionHead icon={Briefcase} title={t("staffRegister.serviceSection")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t("staffRegister.dateOfBirth")}
            placeholder="DD-MM-YYYY"
            value={form.dateOfBirth || ""}
            onChange={(e) => update("dateOfBirth", e.target.value)}
          />
          <Input
            label={t("staffRegister.panNumber")}
            placeholder="ABCDE1234F"
            maxLength={10}
            value={form.panNumber || ""}
            onChange={(e) => update("panNumber", e.target.value.toUpperCase())}
          />
          <Input
            label={t("staffRegister.gpfCpfNo")}
            placeholder="TP/167/019"
            value={form.gpfCpfNo || ""}
            onChange={(e) => update("gpfCpfNo", e.target.value)}
          />
          <Input
            label={t("staffRegister.aadhaarNumber")}
            maxLength={12}
            value={form.aadhaarNumber || ""}
            onChange={(e) => update("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))}
          />
          <Input
            label={t("staffRegister.qualification")}
            placeholder="M.A. B.ED"
            value={form.qualification || ""}
            onChange={(e) => update("qualification", e.target.value)}
          />
          <Input
            label={t("staffRegister.payLevel")}
            placeholder="LEVEL-8 / FIX PAY"
            value={form.payLevel || ""}
            onChange={(e) => update("payLevel", e.target.value)}
          />
        </div>
      </section>

      {/* Salary & bank */}
      <section className="border-b border-slate-100 p-4 md:p-5">
        <SectionHead icon={Banknote} title={t("staffHr.salarySection")} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t("staffHr.monthlySalary")}
            type="number"
            min={0}
            value={form.monthlySalary ?? ""}
            onChange={(e) => update("monthlySalary", e.target.value)}
          />
          <Input
            label={t("staffHr.hra")}
            type="number"
            min={0}
            value={form.hra ?? ""}
            onChange={(e) => update("hra", e.target.value)}
          />
          <Input
            label={t("staffHr.conveyance")}
            type="number"
            min={0}
            value={form.conveyance ?? ""}
            onChange={(e) => update("conveyance", e.target.value)}
          />
          <Input
            label={t("staffHr.pfDeduction")}
            type="number"
            min={0}
            value={form.pfDeduction ?? ""}
            onChange={(e) => update("pfDeduction", e.target.value)}
          />
          <Input
            label={t("staffHr.bankName")}
            value={form.bankName || ""}
            onChange={(e) => update("bankName", e.target.value)}
          />
          <Input
            label={t("staffHr.bankAccount")}
            value={form.bankAccount || ""}
            onChange={(e) => update("bankAccount", e.target.value)}
          />
          <Input
            label={t("staffHr.ifscCode")}
            value={form.ifscCode || ""}
            onChange={(e) => update("ifscCode", e.target.value.toUpperCase())}
          />
        </div>
      </section>

      {/* Footer */}
      <div className="flex flex-col gap-3 bg-slate-50/80 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-5">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.isActive !== false}
            onChange={(e) => update("isActive", e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500/30"
          />
          <BadgeCheck className="h-4 w-4 text-emerald-600" />
          {t("staffPage.activeStaff")}
        </label>
        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Link href={cancelHref}>
            <Button type="button" variant="outline" className="w-full sm:w-auto">
              <ArrowLeft className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
          </Link>
          <Button type="submit" disabled={loading} className="w-full min-w-[140px] sm:w-auto">
            <Save className="h-4 w-4" />
            {loading ? t("common.saving") : resolvedSubmitLabel}
          </Button>
        </div>
      </div>
    </form>
  );
}
