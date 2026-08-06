"use client";

import { useState, type ComponentType, type ReactNode } from "react";
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
type FieldErrors = Record<string, string>;

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData) => Promise<void>;
  submitLabel?: string;
  cancelHref?: string;
}

const TEACHER_CODE_RE = /^[A-Za-z0-9_-]{2,20}$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;

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

function normalizeTeacherCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
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
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const resolvedSubmitLabel = submitLabel ?? t("staffPage.saveStaff");
  const roleWork = getStaffRoleWork(String(form.designation || ""));
  const isEditMode = Boolean(initialData?.id);

  const clearError = (field: string) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  const markGuTouched = (key: GuTouchKey) => {
    setGuTouched((prev) => ({ ...prev, [key]: true }));
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    const code = normalizeTeacherCode(String(form.employeeId || ""));
    const firstName = String(form.firstName || "").trim();
    const lastName = String(form.lastName || "").trim();
    const designation = String(form.designation || "").trim();
    const mobile = String(form.mobileNumber || "").replace(/\D/g, "");
    const email = String(form.email || "").trim().toLowerCase();
    const pan = String(form.panNumber || "").trim().toUpperCase();
    const aadhaar = String(form.aadhaarNumber || "").replace(/\D/g, "");
    const ifsc = String(form.ifscCode || "").trim().toUpperCase();

    if (!code) next.employeeId = t("staffPage.errTeacherCodeRequired");
    else if (!TEACHER_CODE_RE.test(code)) next.employeeId = t("staffPage.errTeacherCodeFormat");

    if (!firstName) next.firstName = t("staffPage.errFirstNameRequired");
    if (!lastName) next.lastName = t("staffPage.errLastNameRequired");
    if (!designation) next.designation = t("staffPage.errDesignationRequired");

    if (!mobile) next.mobileNumber = t("staffPage.errMobileRequired");
    else if (!MOBILE_RE.test(mobile)) next.mobileNumber = t("staffPage.errMobileFormat");

    if (!isEditMode || email) {
      if (!email) next.email = t("staffPage.errEmailRequired");
      else if (!EMAIL_RE.test(email)) next.email = t("staffPage.errEmailFormat");
    }

    if (pan && !PAN_RE.test(pan)) next.panNumber = t("staffPage.errPanFormat");
    if (aadhaar && aadhaar.length !== 12) next.aadhaarNumber = t("staffPage.errAadhaarFormat");
    if (ifsc && !IFSC_RE.test(ifsc)) next.ifscCode = t("staffPage.errIfscFormat");

    return next;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setFormError(t("staffPage.fixErrors"));
      return;
    }

    setLoading(true);
    setFormError(null);
    try {
      const payload = ensureStaffGuNames({
        ...form,
        employeeId: normalizeTeacherCode(String(form.employeeId || "")),
        firstName: String(form.firstName || "").trim(),
        lastName: String(form.lastName || "").trim(),
        email: String(form.email || "").trim().toLowerCase() || null,
        panNumber: String(form.panNumber || "").trim().toUpperCase() || null,
        ifscCode: String(form.ifscCode || "").trim().toUpperCase() || null,
      });
      await onSubmit(payload);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staff-form-wrap">
      <form onSubmit={handleSubmit} className="staff-form" noValidate>
        <FormSection
          step={t("staffPage.sectionStep", { n: 1 })}
          icon={UserRound}
          title={t("staffPage.staffDetails")}
          description={t("staffPage.staffDetailsDesc")}
        >
          {formError ? <p className="staff-form__banner-error">{formError}</p> : null}

          <div className="staff-form__grid">
            <div className="staff-form__field-stack">
              <Input
                label={t("staffPage.teacherCode")}
                placeholder={t("staffPage.teacherCodePlaceholder")}
                required
                maxLength={20}
                value={form.employeeId || ""}
                error={errors.employeeId}
                onChange={(e) =>
                  update(
                    "employeeId",
                    e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, "").slice(0, 20)
                  )
                }
              />
              <p className="staff-form__hint">{t("staffPage.teacherCodeHint")}</p>
            </div>

            <Select
              label={t("staffPage.designation")}
              required
              options={STAFF_DESIGNATIONS}
              value={form.designation || ""}
              error={errors.designation}
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

            <div className="staff-form__span-2">
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
              {errors.firstName ? <p className="text-xs text-red-500 mt-1">{errors.firstName}</p> : null}
            </div>

            <div className="staff-form__span-2">
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
              {errors.lastName ? <p className="text-xs text-red-500 mt-1">{errors.lastName}</p> : null}
            </div>

            <Input
              label={t("staffPage.mobileNumber")}
              required
              maxLength={10}
              inputMode="numeric"
              value={form.mobileNumber || ""}
              error={errors.mobileNumber}
              onChange={(e) => update("mobileNumber", e.target.value.replace(/\D/g, "").slice(0, 10))}
            />

            <Input
              label={t("common.email")}
              type="email"
              required={!isEditMode}
              value={form.email || ""}
              error={errors.email}
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
              error={errors.panNumber}
              onChange={(e) =>
                update("panNumber", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))
              }
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
              inputMode="numeric"
              value={form.aadhaarNumber || ""}
              error={errors.aadhaarNumber}
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
              error={errors.ifscCode}
              maxLength={11}
              onChange={(e) =>
                update("ifscCode", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11))
              }
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
            <Button type="submit" disabled={loading} className="sm:min-w-[150px]">
              <Save className="h-4 w-4" />
              {loading ? t("common.saving") : resolvedSubmitLabel}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
