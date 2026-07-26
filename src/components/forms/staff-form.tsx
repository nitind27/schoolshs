"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { GENDERS, STAFF_DESIGNATIONS, STAFF_QUALIFICATIONS, getStaffRoleWork } from "@/lib/constants";
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
import { BilingualNameField } from "@/components/forms/bilingual-name-field";
import { bilingualNamePair } from "@/lib/gujarati/transliterate-browser";
import { DateField } from "@/components/ui/date-field";
import {
  MultiSelectSearch,
  joinQualificationList,
  parseQualificationList,
} from "@/components/ui/multi-select-search";
import "./staff-form.css";

type StaffFormData = Partial<Staff> & {
  firstNameGu?: string | null;
  lastNameGu?: string | null;
};

type GuTouchKey = "firstNameGu" | "lastNameGu";

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
}

function FormSection({
  step,
  icon: Icon,
  title,
  description,
  children,
}: {
  step: string;
  icon: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="staff-form__card">
      <div className="staff-form__section">
        <header className="staff-form__head">
          <span className="staff-form__head-icon">
            <Icon className="h-4 w-4" />
          </span>
          <div className="staff-form__head-text">
            <p className="staff-form__kicker">{step}</p>
            <h2 className="staff-form__title">{title}</h2>
            {description ? <p className="staff-form__desc">{description}</p> : null}
          </div>
        </header>
        {children}
      </div>
    </section>
  );
}

function ensureStaffGuNames(data: StaffFormData): StaffFormData {
  const out = { ...data };
  const pairs: [keyof StaffFormData, keyof StaffFormData][] = [
    ["firstName", "firstNameGu"],
    ["lastName", "lastNameGu"],
  ];
  for (const [enKey, guKey] of pairs) {
    const en = String(out[enKey] || "").trim();
    const gu = String(out[guKey] || "").trim();
    if (en && !gu) {
      (out as Record<string, string | null | undefined>)[String(guKey)] = bilingualNamePair(en).gu;
    }
  }
  return out;
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
  const [guTouched, setGuTouched] = useState<Partial<Record<GuTouchKey, boolean>>>({});

  const resolvedSubmitLabel = submitLabel ?? t("staffPage.saveStaff");
  const roleWork = getStaffRoleWork(String(form.designation || ""));
  const isEditMode = Boolean(initialData?.id);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const markGuTouched = (key: GuTouchKey) => {
    setGuTouched((prev) => ({ ...prev, [key]: true }));
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
      await onSubmit(ensureStaffGuNames(form));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-form-wrap">
      <form onSubmit={handleSubmit} className="staff-form">
        <FormSection
          step={t("staffPage.sectionStep", { n: 1 })}
          icon={UserRound}
          title={t("staffPage.staffDetails")}
          description={t("staffPage.staffDetailsDesc")}
        >
          <div className="staff-form__grid">
            <Input
              label={t("staffPage.employeeId")}
              placeholder="EMP0001"
              value={form.employeeId || ""}
              onChange={(e) => update("employeeId", e.target.value)}
              disabled={!isEditMode}
            />
            <div className="staff-form__span-full">
              <BilingualNameField
                label={t("staffPage.firstName")}
                required
                enValue={form.firstName || ""}
                guValue={form.firstNameGu || ""}
                onEnChange={(v) => update("firstName", v)}
                onGuChange={(v) => update("firstNameGu", v)}
                guTouched={!!guTouched.firstNameGu}
                onGuTouched={() => markGuTouched("firstNameGu")}
              />
            </div>
            <div className="staff-form__span-full">
              <BilingualNameField
                label={t("staffPage.lastName")}
                required
                enValue={form.lastName || ""}
                guValue={form.lastNameGu || ""}
                onEnChange={(v) => update("lastName", v)}
                onGuChange={(v) => update("lastNameGu", v)}
                guTouched={!!guTouched.lastNameGu}
                onGuTouched={() => markGuTouched("lastNameGu")}
              />
            </div>
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
              required={!isEditMode}
              value={form.email || ""}
              onChange={(e) => update("email", e.target.value)}
              placeholder="teacher@school.com"
            />
            <DateField
              label={t("staffPage.dateOfJoining")}
              value={form.dateOfJoining || ""}
              onChange={(v) => update("dateOfJoining", v)}
              outputFormat="dmy-dash"
            />
            {!isEditMode ? (
              <p className="staff-form__hint staff-form__span-full">{t("staffPage.emailLoginHint")}</p>
            ) : null}
          </div>

          {roleWork.length > 0 ? (
            <div className="staff-form__role">
              <p className="staff-form__role-title">
                {t("staffPage.mainWork")} — {form.designation}
              </p>
              <p className="staff-form__role-body">{roleWork.join(" · ")}</p>
            </div>
          ) : null}
        </FormSection>

        <FormSection
          step={t("staffPage.sectionStep", { n: 2 })}
          icon={Briefcase}
          title={t("staffRegister.serviceSection")}
          description={t("staffPage.serviceSectionDesc")}
        >
          <div className="staff-form__grid">
            <DateField
              label={t("staffRegister.dateOfBirth")}
              value={form.dateOfBirth || ""}
              onChange={(v) => update("dateOfBirth", v)}
              outputFormat="dmy-dash"
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
              onChange={(e) =>
                update("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))
              }
            />
            <MultiSelectSearch
              className="staff-form__span-2"
              label={t("staffRegister.qualification")}
              value={parseQualificationList(form.qualification)}
              onChange={(items) => update("qualification", joinQualificationList(items) || null)}
              options={STAFF_QUALIFICATIONS}
              allowOther
              otherLabel={t("staffRegister.qualificationOther")}
              placeholder={t("staffRegister.qualificationPlaceholder")}
              searchPlaceholder={t("staffRegister.qualificationSearch")}
              otherPlaceholder={t("staffRegister.qualificationOtherPlaceholder")}
              addLabel={t("staffRegister.qualificationAdd")}
              emptyLabel={t("staffRegister.qualificationEmpty")}
              clearAllLabel={t("staffRegister.qualificationClearAll")}
              hint={t("staffRegister.qualificationHint")}
            />
            <Input
              label={t("staffRegister.payLevel")}
              placeholder="LEVEL-8 / FIX PAY"
              value={form.payLevel || ""}
              onChange={(e) => update("payLevel", e.target.value)}
            />
          </div>
        </FormSection>

        <FormSection
          step={t("staffPage.sectionStep", { n: 3 })}
          icon={Banknote}
          title={t("staffHr.salarySection")}
          description={t("staffPage.salarySectionDesc")}
        >
          <div className="staff-form__grid">
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
        </FormSection>

        <div className="staff-form__footer">
          <label className="staff-form__active">
            <input
              type="checkbox"
              checked={form.isActive !== false}
              onChange={(e) => update("isActive", e.target.checked)}
            />
            <BadgeCheck className="h-4 w-4 text-emerald-600" />
            {t("staffPage.activeStaff")}
          </label>
          <div className="staff-form__actions">
            <Link href={cancelHref}>
              <Button type="button" variant="outline">
                <ArrowLeft className="h-4 w-4" />
                {t("common.cancel")}
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="min-w-[150px]">
              <Save className="h-4 w-4" />
              {loading ? t("common.saving") : resolvedSubmitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
