"use client";

import { useEffect, useId, useRef, useState, type ComponentType, type InputHTMLAttributes, type ReactNode } from "react";
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
import {
  StaffPhotoField,
} from "@/components/staff/staff-photo-field";
import {
  FIRST_HIGHER_GRADE_YEARS,
  SECOND_HIGHER_GRADE_YEARS,
  computeRetirementDate,
  higherGradeDate,
  higherGradeOptions,
  retirementAgeForDesignation,
  selectedHigherGradeYears,
} from "@/lib/staff-register";
import { applyDaHraFromPercent, computeStaffFullPay } from "@/lib/staff-salary";
import "./staff-form.css";

type StaffFormData = Partial<Staff> & {
  firstNameGu?: string | null;
  lastNameGu?: string | null;
  daPercent?: number | string | null;
  hraPercent?: number | string | null;
  da?: number | string | null;
  ma?: number | string | null;
  fpa?: number | string | null;
  hndA?: number | string | null;
  suA?: number | string | null;
  caA?: number | string | null;
  wa?: number | string | null;
  prA?: number | string | null;
  bonus?: number | string | null;
  daArrears?: number | string | null;
  salaryArrears?: number | string | null;
  fullPay?: number | string | null;
  retirementDate?: string | null;
  higherGradeFirst?: string | null;
  higherGradeFirstYears?: number | string | null;
  higherGradeSecond?: string | null;
  higherGradeSecondYears?: number | string | null;
};

type GuTouchKey = "firstNameGu" | "lastNameGu";
type FieldErrors = Record<string, string>;

interface StaffFormProps {
  initialData?: StaffFormData;
  onSubmit: (data: StaffFormData, photoFile?: File | null) => Promise<void>;
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

function FieldBlock({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="staff-form__block">
      <div className="staff-form__block-head">
        <h3 className="staff-form__block-title">{title}</h3>
        {hint ? <p className="staff-form__block-hint">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function AffixInput({
  label,
  prefix,
  suffix,
  hint,
  badge,
  readOnly,
  className,
  ...inputProps
}: {
  label: string;
  prefix?: string;
  suffix?: string;
  hint?: string;
  badge?: string;
  readOnly?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "prefix">) {
  const id = useId();
  return (
    <div className={`staff-form__affix${className ? ` ${className}` : ""}`}>
      <label htmlFor={id} className="staff-form__affix-label">
        <span>{label}</span>
        {badge ? <span className="staff-form__chip">{badge}</span> : null}
      </label>
      <div className={`staff-form__affix-box${readOnly ? " is-readonly" : ""}`}>
        {prefix ? <span className="staff-form__affix-mark is-prefix">{prefix}</span> : null}
        <input id={id} className="staff-form__affix-input" readOnly={readOnly} {...inputProps} />
        {suffix ? <span className="staff-form__affix-mark is-suffix">{suffix}</span> : null}
      </div>
      {hint ? <p className="staff-form__hint">{hint}</p> : null}
    </div>
  );
}

function formatInr(value: unknown) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
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
  const [pendingPhoto, setPendingPhoto] = useState<File | null>(null);
  const [ifscStatus, setIfscStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const ifscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastIfsc = useRef("");
  const retirementTouched = useRef(false);

  const resolvedSubmitLabel = submitLabel ?? t("staffPage.saveStaff");
  const roleWork = getStaffRoleWork(String(form.designation || ""));
  const isEditMode = Boolean(initialData?.id);
  const staffId = form.id || initialData?.id || null;

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

  const moneyValue = (v: unknown) => (v == null || v === "" ? "" : String(v));
  const setMoney = (field: string, raw: string) => update(field, raw === "" ? null : raw);
  const daLocked = form.daPercent != null && String(form.daPercent) !== "";
  const hraLocked = form.hraPercent != null && String(form.hraPercent) !== "";
  const firstHgOptions = higherGradeOptions(form.dateOfJoining, FIRST_HIGHER_GRADE_YEARS).map((o) => ({
    value: o.value,
    label: t("staffPage.higherGradeOption", { years: o.years, date: o.date }),
  }));
  const secondHgOptions = higherGradeOptions(form.dateOfJoining, SECOND_HIGHER_GRADE_YEARS).map((o) => ({
    value: o.value,
    label: t("staffPage.higherGradeOption", { years: o.years, date: o.date }),
  }));
  const retireAge = retirementAgeForDesignation(form.designation);

  const setHigherGrade = (
    slot: "first" | "second",
    yearsRaw: string,
  ) => {
    const years = yearsRaw ? Number(yearsRaw) : null;
    const date = years ? higherGradeDate(form.dateOfJoining, years) || null : null;
    if (slot === "first") {
      setForm((prev) => ({ ...prev, higherGradeFirstYears: years, higherGradeFirst: date }));
    } else {
      setForm((prev) => ({ ...prev, higherGradeSecondYears: years, higherGradeSecond: date }));
    }
  };

  const lookupIfsc = async (code: string) => {
    if (code === lastIfsc.current) return;
    lastIfsc.current = code;
    setIfscStatus("loading");
    try {
      const res = await fetch(`/api/ifsc/${code}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "fail");
      setForm((prev) => ({
        ...prev,
        ifscCode: code,
        bankName: data.bankName || prev.bankName,
      }));
      clearError("ifscCode");
      setIfscStatus("ok");
    } catch {
      setIfscStatus("error");
    }
  };

  useEffect(() => {
    const code = String(form.ifscCode || "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    if (!IFSC_RE.test(code)) {
      setIfscStatus("idle");
      return;
    }
    if (ifscTimer.current) clearTimeout(ifscTimer.current);
    ifscTimer.current = setTimeout(() => void lookupIfsc(code), 400);
    return () => {
      if (ifscTimer.current) clearTimeout(ifscTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ifscCode]);

  useEffect(() => {
    const computed = computeRetirementDate(initialData.dateOfBirth, initialData.designation);
    if (initialData.retirementDate && computed && initialData.retirementDate !== computed) {
      retirementTouched.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (retirementTouched.current) return;
    const computed = computeRetirementDate(form.dateOfBirth, form.designation) || null;
    setForm((prev) => {
      if ((prev.retirementDate || null) === computed) return prev;
      return { ...prev, retirementDate: computed };
    });
  }, [form.dateOfBirth, form.designation]);

  useEffect(() => {
    setForm((prev) => {
      const first = prev.higherGradeFirstYears
        ? higherGradeDate(prev.dateOfJoining, Number(prev.higherGradeFirstYears)) || null
        : prev.higherGradeFirst;
      const second = prev.higherGradeSecondYears
        ? higherGradeDate(prev.dateOfJoining, Number(prev.higherGradeSecondYears)) || null
        : prev.higherGradeSecond;
      if (first === prev.higherGradeFirst && second === prev.higherGradeSecond) return prev;
      return { ...prev, higherGradeFirst: first, higherGradeSecond: second };
    });
  }, [form.dateOfJoining]);

  useEffect(() => {
    setForm((prev) => {
      const toNum = (v: unknown) => {
        if (v == null || v === "") return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      };
      const derived = applyDaHraFromPercent({
        monthlySalary: toNum(prev.monthlySalary),
        daPercent: toNum(prev.daPercent),
        hraPercent: toNum(prev.hraPercent),
        da: toNum(prev.da),
        hra: toNum(prev.hra),
      });
      const next: StaffFormData = { ...prev, da: derived.da, hra: derived.hra };
      const fullPay = computeStaffFullPay(next);
      if (next.da === prev.da && next.hra === prev.hra && next.fullPay === fullPay) return prev;
      return { ...next, fullPay };
    });
  }, [
    form.monthlySalary,
    form.daPercent,
    form.hraPercent,
    form.da,
    form.hra,
    form.ma,
    form.fpa,
    form.hndA,
    form.suA,
    form.caA,
    form.wa,
    form.prA,
    form.bonus,
    form.daArrears,
    form.salaryArrears,
  ]);

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
      await onSubmit(payload, pendingPhoto);
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

          <StaffPhotoField
            staffId={staffId}
            photoPath={form.photoPath}
            pendingFile={pendingPhoto}
            onPendingFileChange={setPendingPhoto}
            onPhotoPathChange={(photoPath) => update("photoPath", photoPath)}
          />

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
          <div className="staff-form__blocks">
            <FieldBlock
              title={t("staffPage.blockDates")}
              hint={t("staffPage.retirementHint", { years: retireAge })}
            >
              <div className="staff-form__grid staff-form__grid--2">
                <DateField
                  label={t("staffRegister.dateOfBirth")}
                  value={form.dateOfBirth || ""}
                  onChange={(v) => update("dateOfBirth", v)}
                  outputFormat="dmy-dash"
                />
                <DateField
                  label={t("staffPage.retirementDate")}
                  value={form.retirementDate || ""}
                  onChange={(v) => {
                    retirementTouched.current = true;
                    update("retirementDate", v);
                  }}
                  outputFormat="dmy-dash"
                />
              </div>
            </FieldBlock>

            <FieldBlock
              title={t("staffPage.blockHigherGrade")}
              hint={t("staffPage.higherGradeBlockHint")}
            >
              <div className="staff-form__grid staff-form__grid--2">
                <Select
                  label={t("staffPage.higherGradeFirst")}
                  options={firstHgOptions}
                  value={selectedHigherGradeYears(
                    form.higherGradeFirstYears,
                    form.dateOfJoining,
                    form.higherGradeFirst,
                    FIRST_HIGHER_GRADE_YEARS,
                  )}
                  emptyLabel={
                    form.dateOfJoining
                      ? t("staffPage.higherGradeSelect")
                      : t("staffPage.higherGradeNeedJoining")
                  }
                  onChange={(e) => setHigherGrade("first", e.target.value)}
                  disabled={!form.dateOfJoining}
                />
                <Select
                  label={t("staffPage.higherGradeSecond")}
                  options={secondHgOptions}
                  value={selectedHigherGradeYears(
                    form.higherGradeSecondYears,
                    form.dateOfJoining,
                    form.higherGradeSecond,
                    SECOND_HIGHER_GRADE_YEARS,
                  )}
                  emptyLabel={
                    form.dateOfJoining
                      ? t("staffPage.higherGradeSelect")
                      : t("staffPage.higherGradeNeedJoining")
                  }
                  onChange={(e) => setHigherGrade("second", e.target.value)}
                  disabled={!form.dateOfJoining}
                />
              </div>
            </FieldBlock>

            <FieldBlock title={t("staffPage.blockIds")}>
              <div className="staff-form__grid">
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
                <Input
                  label={t("staffRegister.payLevel")}
                  placeholder="LEVEL-8 / FIX PAY"
                  value={form.payLevel || ""}
                  onChange={(e) => update("payLevel", e.target.value)}
                />
                <MultiSelectSearch
                  className="staff-form__span-full"
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
              </div>
            </FieldBlock>
          </div>
        </FormSection>

        <FormSection
          step={t("staffPage.sectionStep", { n: 3 })}
          icon={Banknote}
          title={t("staffHr.salarySection")}
          description={t("staffPage.salarySectionDesc")}
        >
          <div className="staff-form__blocks">
            <FieldBlock title={t("staffHr.blockPay")} hint={t("staffHr.basicHint")}>
              <div className="staff-form__pay-row">
                <AffixInput
                  label={t("staffHr.basic")}
                  prefix="₹"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={moneyValue(form.monthlySalary)}
                  onChange={(e) => setMoney("monthlySalary", e.target.value)}
                />
                <div className="staff-form__total-card">
                  <p className="staff-form__total-kicker">
                    {t("staffHr.fullPay")}
                    <span className="staff-form__chip">{t("staffHr.autoBadge")}</span>
                  </p>
                  <p className="staff-form__total-value">₹ {formatInr(form.fullPay)}</p>
                  <p className="staff-form__hint">{t("staffHr.fullPayHint")}</p>
                </div>
              </div>
            </FieldBlock>

            <FieldBlock title={t("staffHr.blockDaHra")} hint={t("staffHr.percentHint")}>
              <div className="staff-form__calc-grid">
                <article className="staff-form__calc-card">
                  <p className="staff-form__calc-title">{t("staffHr.da")}</p>
                  <div className="staff-form__calc-row">
                    <AffixInput
                      label={t("staffHr.daPercent")}
                      suffix="%"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      value={moneyValue(form.daPercent)}
                      onChange={(e) => setMoney("daPercent", e.target.value)}
                    />
                    <AffixInput
                      label={t("staffHr.daAmount")}
                      prefix="₹"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      readOnly={daLocked}
                      badge={daLocked ? t("staffHr.autoBadge") : undefined}
                      value={moneyValue(form.da)}
                      onChange={(e) => setMoney("da", e.target.value)}
                    />
                  </div>
                </article>
                <article className="staff-form__calc-card">
                  <p className="staff-form__calc-title">{t("staffHr.hra")}</p>
                  <div className="staff-form__calc-row">
                    <AffixInput
                      label={t("staffHr.hraPercent")}
                      suffix="%"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      value={moneyValue(form.hraPercent)}
                      onChange={(e) => setMoney("hraPercent", e.target.value)}
                    />
                    <AffixInput
                      label={t("staffHr.hraAmount")}
                      prefix="₹"
                      type="number"
                      min={0}
                      step="0.01"
                      inputMode="decimal"
                      placeholder="0"
                      readOnly={hraLocked}
                      badge={hraLocked ? t("staffHr.autoBadge") : undefined}
                      value={moneyValue(form.hra)}
                      onChange={(e) => setMoney("hra", e.target.value)}
                    />
                  </div>
                </article>
              </div>
            </FieldBlock>

            <FieldBlock title={t("staffHr.blockAllowances")}>
              <div className="staff-form__grid">
                {(
                  [
                    ["ma", "staffHr.ma"],
                    ["fpa", "staffHr.fpa"],
                    ["hndA", "staffHr.hndA"],
                    ["suA", "staffHr.suA"],
                    ["caA", "staffHr.caA"],
                    ["wa", "staffHr.wa"],
                    ["prA", "staffHr.prA"],
                    ["bonus", "staffHr.bonus"],
                    ["daArrears", "staffHr.daArrears"],
                    ["salaryArrears", "staffHr.salaryArrears"],
                  ] as const
                ).map(([field, key]) => (
                  <AffixInput
                    key={field}
                    label={t(key)}
                    prefix="₹"
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    placeholder="0"
                    value={moneyValue(form[field])}
                    onChange={(e) => setMoney(field, e.target.value)}
                  />
                ))}
              </div>
            </FieldBlock>

            <FieldBlock title={t("staffHr.blockOther")}>
              <div className="staff-form__grid staff-form__grid--2">
                <AffixInput
                  label={t("staffHr.conveyance")}
                  prefix="₹"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={moneyValue(form.conveyance)}
                  onChange={(e) => setMoney("conveyance", e.target.value)}
                />
                <AffixInput
                  label={t("staffHr.pfDeduction")}
                  prefix="₹"
                  type="number"
                  min={0}
                  step="0.01"
                  inputMode="decimal"
                  placeholder="0"
                  value={moneyValue(form.pfDeduction)}
                  onChange={(e) => setMoney("pfDeduction", e.target.value)}
                />
              </div>
            </FieldBlock>

            <FieldBlock title={t("staffHr.blockBank")} hint={t("staffHr.ifscHint")}>
              <div className="staff-form__grid">
                <div className="staff-form__field-stack staff-form__span-2">
                  <Input
                    label={t("staffHr.ifscCode")}
                    value={form.ifscCode || ""}
                    error={errors.ifscCode}
                    placeholder="SBIN0001234"
                    maxLength={11}
                    autoComplete="off"
                    onChange={(e) =>
                      update(
                        "ifscCode",
                        e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11),
                      )
                    }
                  />
                  {ifscStatus !== "idle" ? (
                    <p
                      className={`staff-form__hint${
                        ifscStatus === "ok"
                          ? " is-ok"
                          : ifscStatus === "error"
                            ? " is-error"
                            : ifscStatus === "loading"
                              ? " is-loading"
                              : ""
                      }`}
                    >
                      {ifscStatus === "loading"
                        ? t("staffHr.ifscLookup")
                        : ifscStatus === "ok"
                          ? t("staffHr.ifscFilled")
                          : ifscStatus === "error"
                            ? t("staffHr.ifscFailed")
                            : null}
                    </p>
                  ) : null}
                </div>
                <Input
                  label={`${t("staffHr.bankName")} (${t("staffHr.bankFromIfsc")})`}
                  value={form.bankName || ""}
                  placeholder="State Bank of India"
                  onChange={(e) => update("bankName", e.target.value)}
                />
                <Input
                  label={t("staffHr.bankAccount")}
                  value={form.bankAccount || ""}
                  onChange={(e) => update("bankAccount", e.target.value)}
                />
              </div>
            </FieldBlock>
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
