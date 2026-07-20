"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  GUJARAT_DISTRICTS,
  CATEGORIES,
  GENDERS,
  RELIGIONS,
  FINANCIAL_YEARS,
  COURSE_TYPES,
  CURRENT_YEARS,
  BOARDS,
  BLOOD_GROUPS,
  standardToCourseName,
  standardToCurrentYear,
} from "@/lib/constants";
import { PRE_MATRIC_SCHEMES, POST_MATRIC_SCHEMES } from "@/lib/dg-portal";
import { ChevronLeft, ChevronRight, Save, CheckCircle, Sparkles, Cloud, CloudOff, Loader2 } from "lucide-react";
import type { Student, SchoolClass } from "@/generated/prisma/client";
import { getDgPortalConfig } from "@/lib/dg-portal";
import { SsgujaratFetch } from "@/components/forms/ssgujarat-fetch";
import { BilingualNameField } from "@/components/forms/bilingual-name-field";
import { inferCategoryFromFields } from "@/lib/category-inference";
import { bilingualNamePair } from "@/lib/gujarati/transliterate-browser";
import { studentFullNameGu, studentDisplayAadhaarName, studentDisplayFatherName, studentDisplayMotherName } from "@/lib/student-names";
import { CategoryBadge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";
import { StudentDocumentsSection } from "@/components/documents/student-documents-section";
import { GrSetupPanel } from "@/components/forms/gr-setup-panel";
import { hasDraftContent } from "@/lib/student-draft";
import { getCompletionPercentage } from "@/lib/validation";

type FormData = Partial<Student>;

type GuTouchKey =
  | "firstNameGu"
  | "middleNameGu"
  | "surnameGu"
  | "aadhaarNameGu"
  | "motherNameGu"
  | "fatherNameGu"
  | "guardianNameGu";

function guTouchedFromData(_data: FormData): Partial<Record<GuTouchKey, boolean>> {
  return {};
}

function ensureGuNameFields(data: FormData): FormData {
  const out = { ...data };
  const pairs: [keyof FormData, keyof FormData][] = [
    ["firstName", "firstNameGu"],
    ["middleName", "middleNameGu"],
    ["surname", "surnameGu"],
    ["aadhaarName", "aadhaarNameGu"],
    ["motherName", "motherNameGu"],
    ["fatherName", "fatherNameGu"],
    ["guardianName", "guardianNameGu"],
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

interface StudentFormProps {
  initialData?: FormData;
  initialClassId?: string;
  studentId?: string;
  onSubmit: (data: FormData) => Promise<string | void>;
  onFinish?: () => void;
  submitLabel?: string;
}

export function StudentForm({
  initialData = {},
  initialClassId,
  studentId: studentIdProp,
  onSubmit,
  onFinish,
  submitLabel,
}: StudentFormProps) {
  const t = useT();
  const router = useRouter();
  const isEditMode = Boolean(studentIdProp || initialData.id);
  const defaultSubmitLabel = submitLabel ?? t("studentForm.saveStudent");

  const STEPS = [
    { id: 1, title: t("studentForm.step1Title"), desc: t("studentForm.step1Desc") },
    { id: 2, title: t("studentForm.step2Title"), desc: t("studentForm.step2Desc") },
    { id: 3, title: t("studentForm.step3Title"), desc: t("studentForm.step3Desc") },
    { id: 4, title: t("studentForm.step4Title"), desc: t("studentForm.step4Desc") },
    { id: 5, title: t("studentForm.step5Title"), desc: t("studentForm.step5Desc") },
    { id: 6, title: t("studentForm.step6Title"), desc: t("studentForm.step6Desc") },
  ];

  const SCHOLARSHIP_SCHEME_OPTIONS = [
    ...PRE_MATRIC_SCHEMES.map((s) => ({ value: s, label: `${t("studentForm.preMatric")} ${s}` })),
    ...POST_MATRIC_SCHEMES.map((s) => ({ value: s, label: `${t("studentForm.postMatric")} ${s}` })),
  ];

  const genderOptions = GENDERS.map((g) => ({ value: g, label: t(`gender.${g}`) }));
  const maritalOptions = [
    { value: "Unmarried", label: t("studentForm.unmarried") },
    { value: "Married", label: t("studentForm.married") },
  ];
  const residentOptions = [
    { value: "Rural", label: t("studentForm.rural") },
    { value: "Urban", label: t("studentForm.urban") },
  ];
  const habitationOptions = [
    { value: "Own", label: t("studentForm.own") },
    { value: "Rent", label: t("studentForm.rent") },
  ];
  const admissionOptions = [
    { value: "Regular", label: t("studentForm.regular") },
    { value: "Lateral", label: t("studentForm.lateral") },
    { value: "Transfer", label: t("studentForm.transfer") },
  ];

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [savedStudentId, setSavedStudentId] = useState<string | undefined>(studentIdProp || initialData.id);
  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [form, setForm] = useState<FormData>({
    maritalStatus: "Unmarried",
    habitationType: "Own",
    familySize: 4,
    residentType: "Rural",
    isHosteler: false,
    isOrphan: false,
    admissionType: "Regular",
    financialYear: "2025-26",
    classId: initialClassId || initialData.classId || undefined,
    ...initialData,
  });
  const [guTouched, setGuTouched] = useState<Partial<Record<GuTouchKey, boolean>>>(() =>
    guTouchedFromData({ ...initialData }),
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoSave = useRef(true);
  const [grReady, setGrReady] = useState(isEditMode && Boolean(initialData.grNumber || studentIdProp));
  const [grLocked, setGrLocked] = useState(isEditMode && Boolean(initialData.grNumber));

  const markGuTouched = (key: GuTouchKey) => {
    setGuTouched((prev) => ({ ...prev, [key]: true }));
  };

  useEffect(() => {
    if (studentIdProp) setSavedStudentId(studentIdProp);
    else if (initialData.id) setSavedStudentId(initialData.id);
  }, [studentIdProp, initialData.id]);

  useEffect(() => {
    fetch("/api/classes?academicYear=2025-26")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
  }, []);

  useEffect(() => {
    if (!form.classId) return;
    const cls = classes.find((c) => c.id === form.classId);
    if (!cls) return;
    setForm((prev) => ({
      ...prev,
      standard: cls.standard,
      section: cls.section,
      courseName: standardToCourseName(cls.standard),
      currentYear: standardToCurrentYear(cls.standard),
      institutionName: cls.institutionName || prev.institutionName,
      institutionDistrict: cls.institutionDistrict || prev.institutionDistrict,
      financialYear: cls.academicYear || prev.financialYear,
    }));
  }, [form.classId, classes]);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const completionPct = getCompletionPercentage(form);

  const handleGrReady = ({
    studentId,
    suggested,
    isNew,
  }: {
    studentId?: string;
    suggested: Partial<Student>;
    isNew: boolean;
  }) => {
    skipAutoSave.current = true;
    setForm((prev) => ({ ...prev, ...suggested }));
    if (studentId) {
      setSavedStudentId(studentId);
      if (!isEditMode && isNew) {
        router.replace(`/students/${studentId}/edit`, { scroll: false });
      }
    }
    setGrReady(true);
    setGrLocked(true);
  };

  useEffect(() => {
    if (!grReady) return;
    if (!form.grNumber?.trim() || !form.classId) return;
    if (skipAutoSave.current) {
      skipAutoSave.current = false;
      return;
    }
    if (!hasDraftContent(form)) return;

    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);

    autoSaveTimer.current = setTimeout(async () => {
      setAutoSaveStatus("saving");
      try {
        const payload = { ...ensureGuNameFields(form), draft: true };
        let id = savedStudentId;

        if (id) {
          const res = await fetch(`/api/students/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
        } else {
          const res = await fetch("/api/students", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!res.ok) throw new Error("save failed");
          const student = await res.json();
          id = student.id as string;
          setSavedStudentId(id);
        }

        setAutoSaveStatus("saved");
      } catch {
        setAutoSaveStatus("error");
      }
    }, 1200);

    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [form, savedStudentId, grReady]);

  const applySsgujaratData = (data: Partial<Student>) => {
    setForm((prev) => {
      const merged: FormData = { ...prev };
      for (const [key, value] of Object.entries(data)) {
        if (value !== undefined && value !== null && value !== "") {
          (merged as Record<string, unknown>)[key] = value;
        }
      }
      if (data.notes) {
        merged.notes = [prev.notes, data.notes].filter(Boolean).join(" | ");
      }
      const namePairs: [keyof FormData, keyof FormData][] = [
        ["firstName", "firstNameGu"],
        ["middleName", "middleNameGu"],
        ["surname", "surnameGu"],
        ["aadhaarName", "aadhaarNameGu"],
        ["motherName", "motherNameGu"],
        ["fatherName", "fatherNameGu"],
        ["guardianName", "guardianNameGu"],
      ];
      for (const [enKey, guKey] of namePairs) {
        const en = String(merged[enKey] || "").trim();
        if (en) {
          const pair = bilingualNamePair(en);
          const rec = merged as Record<string, string | null | undefined>;
          rec[String(enKey)] = pair.en;
          rec[String(guKey)] = pair.gu;
        }
      }
      return merged;
    });
    setGuTouched((prev) => ({
      ...prev,
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      aadhaarNameGu: true,
      motherNameGu: true,
      fatherNameGu: true,
      guardianNameGu: true,
    }));
  };

  const [categoryHint, setCategoryHint] = useState<ReturnType<typeof inferCategoryFromFields> | null>(null);

  useEffect(() => {
    if (!form.surname && !form.caste) {
      setCategoryHint(null);
      return;
    }
    const hint = inferCategoryFromFields({
      surname: form.surname,
      caste: form.caste,
      religion: form.religion,
      storedCategory: form.category,
    });
    if (!form.category && hint.source !== "stored") {
      setCategoryHint(hint);
    } else {
      setCategoryHint(hint.source === "stored" ? null : hint);
    }
  }, [form.surname, form.caste, form.religion, form.category]);

  const applySuggestedCategory = () => {
    if (categoryHint) update("category", categoryHint.category);
  };

  const handleSubmit = async (): Promise<string | void> => {
    if (!form.classId) {
      alert("Please select a class first. Class setup is managed by admin.");
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      const data = ensureGuNameFields(form);
      if (savedStudentId) {
        const res = await fetch(`/api/students/${savedStudentId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert((err as { error?: string }).error || "Failed to save student");
          return undefined;
        }
        return savedStudentId;
      }
      const result = await onSubmit(data);
      if (typeof result === "string") {
        setSavedStudentId(result);
        return result;
      }
      return savedStudentId;
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAndContinue = async () => {
    const id = await handleSubmit();
    if (id || savedStudentId) {
      if (id) setSavedStudentId(id);
      setStep(6);
    }
  };

  const copyCurrentToPermanent = () => {
    setForm((prev) => ({
      ...prev,
      permanentAddress: prev.currentAddress,
      permanentDistrict: prev.currentDistrict,
      permanentCity: prev.currentCity,
      permanentPincode: prev.currentPincode,
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <GrSetupPanel
        classes={classes}
        classId={form.classId || ""}
        grNumber={form.grNumber || ""}
        locked={grLocked}
        studentId={savedStudentId}
        onClassChange={(id) => update("classId", id || null)}
        onGrNumberChange={(v) => update("grNumber", v)}
        onReady={handleGrReady}
      />

      {!grReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("studentForm.grSetupRequired")}
        </div>
      )}

      {grReady && (
        <>
      {/* Portal-style header */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 px-6 py-5 text-white shadow-lg">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-6 left-1/3 h-24 w-24 rounded-full bg-indigo-400/20 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-blue-100">
              {t("studentForm.portalBadge")}
            </p>
            <h2 className="text-xl font-bold mt-0.5">{t("studentForm.portalTitle")}</h2>
            <p className="text-sm text-blue-100 mt-1 max-w-xl">{t("studentForm.portalSubtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-white/15 backdrop-blur px-4 py-2 text-center min-w-[72px]">
              <p className="text-2xl font-bold leading-none">{completionPct}%</p>
              <p className="text-[10px] uppercase tracking-wide text-blue-100 mt-1">{t("studentForm.complete")}</p>
            </div>
            <div
              className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium backdrop-blur ${
                autoSaveStatus === "saved"
                  ? "bg-emerald-500/25 text-emerald-50"
                  : autoSaveStatus === "saving"
                    ? "bg-white/15 text-blue-50"
                    : autoSaveStatus === "error"
                      ? "bg-red-500/25 text-red-50"
                      : "bg-white/10 text-blue-100"
              }`}
            >
              {autoSaveStatus === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}
              {autoSaveStatus === "saved" && <Cloud className="h-4 w-4" />}
              {autoSaveStatus === "error" && <CloudOff className="h-4 w-4" />}
              {autoSaveStatus === "idle" && <Cloud className="h-4 w-4 opacity-70" />}
              <span>
                {autoSaveStatus === "saving"
                  ? t("studentForm.autoSaving")
                  : autoSaveStatus === "saved"
                    ? t("studentForm.autoSaved")
                    : autoSaveStatus === "error"
                      ? t("studentForm.autoSaveError")
                      : t("studentForm.autoSaveIdle")}
              </span>
            </div>
          </div>
        </div>
        <div className="relative mt-4 h-1.5 rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-300 to-cyan-300 transition-all duration-500"
            style={{ width: `${completionPct}%` }}
          />
        </div>
      </div>

      {/* Step Indicator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between overflow-x-auto pb-1">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 min-w-[80px]">
              <button
                type="button"
                onClick={() => {
                  if (s.id === 6 && !savedStudentId) return;
                  setStep(s.id);
                }}
                disabled={s.id === 6 && !savedStudentId}
                className={`flex items-center gap-2 ${step >= s.id ? "text-blue-600" : "text-slate-400"} ${s.id === 6 && !savedStudentId ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 shrink-0 transition-colors ${
                    step === s.id
                      ? "bg-blue-600 text-white border-blue-600 ring-4 ring-blue-100"
                      : step > s.id
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-slate-300 text-slate-400 bg-white"
                  }`}
                >
                  {step > s.id ? <CheckCircle className="h-4 w-4" /> : s.id}
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium leading-tight">{s.title}</p>
                  <p className="text-[11px] text-slate-400">{s.desc}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 min-w-[12px] ${step > s.id ? "bg-blue-500" : "bg-slate-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{STEPS[step - 1].title}</CardTitle>
            <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
              {t("studentForm.stepOf", { current: step, total: STEPS.length })}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">{STEPS[step - 1].desc}</p>
        </CardHeader>
        <CardContent>
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <BilingualNameField
                label={t("fields.firstName")}
                required
                enValue={form.firstName || ""}
                guValue={form.firstNameGu || ""}
                onEnChange={(v) => update("firstName", v)}
                onGuChange={(v) => update("firstNameGu", v)}
                guTouched={!!guTouched.firstNameGu}
                onGuTouched={() => markGuTouched("firstNameGu")}
              />
              <BilingualNameField
                label={t("fields.middleName")}
                enValue={form.middleName || ""}
                guValue={form.middleNameGu || ""}
                onEnChange={(v) => update("middleName", v)}
                onGuChange={(v) => update("middleNameGu", v)}
                guTouched={!!guTouched.middleNameGu}
                onGuTouched={() => markGuTouched("middleNameGu")}
              />
              <BilingualNameField
                label={t("fields.surname")}
                required
                enValue={form.surname || ""}
                guValue={form.surnameGu || ""}
                onEnChange={(v) => update("surname", v)}
                onGuChange={(v) => update("surnameGu", v)}
                guTouched={!!guTouched.surnameGu}
                onGuTouched={() => markGuTouched("surnameGu")}
              />
              {categoryHint && categoryHint.source !== "stored" && (
                <div className="md:col-span-2 flex flex-wrap items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span className="text-amber-900">
                    {t("studentForm.categorySuggest")} <CategoryBadge category={categoryHint.category} />
                    <span className="text-xs text-amber-700 ml-1">({categoryHint.source}, {categoryHint.confidence})</span>
                  </span>
                  {form.category !== categoryHint.category && (
                    <Button type="button" size="sm" variant="outline" onClick={applySuggestedCategory}>
                      {t("studentForm.applyCategory", { category: categoryHint.category })}
                    </Button>
                  )}
                  <span className="text-xs text-amber-600">{t("studentForm.verifyCaste")}</span>
                </div>
              )}
              <BilingualNameField
                label={t("fields.aadhaarName")}
                required
                enValue={form.aadhaarName || ""}
                guValue={form.aadhaarNameGu || ""}
                onEnChange={(v) => update("aadhaarName", v)}
                onGuChange={(v) => update("aadhaarNameGu", v)}
                guTouched={!!guTouched.aadhaarNameGu}
                onGuTouched={() => markGuTouched("aadhaarNameGu")}
              />
              <Input label={t("fields.dateOfBirth")} required placeholder="01/01/2005" value={form.dateOfBirth || ""} onChange={(e) => update("dateOfBirth", e.target.value)} />
              <Select label={t("fields.gender")} required options={genderOptions} value={form.gender || ""} onChange={(e) => update("gender", e.target.value)} />
              <Input label={t("fields.aadhaarNumber")} required placeholder="123456789012" maxLength={12} value={form.aadhaarNumber || ""} onChange={(e) => update("aadhaarNumber", e.target.value)} />
              <SsgujaratFetch
                aadhaarNumber={form.aadhaarNumber || ""}
                childUid={form.childUid || ""}
                onApply={applySsgujaratData}
              />
              <Input label={t("fields.rationCardNumber")} value={form.rationCardNumber || ""} onChange={(e) => update("rationCardNumber", e.target.value)} />
              <Input label={t("fields.mobileNumber")} required placeholder="9876543210" maxLength={10} value={form.mobileNumber || ""} onChange={(e) => update("mobileNumber", e.target.value)} />
              <Input label={t("fields.email")} type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
              <Select label={t("fields.category")} required options={CATEGORIES} value={form.category || ""} onChange={(e) => update("category", e.target.value)} />
              <Input label={t("fields.caste")} value={form.caste || ""} onChange={(e) => update("caste", e.target.value)} />
              <Select label={t("fields.religion")} required options={RELIGIONS} value={form.religion || ""} onChange={(e) => update("religion", e.target.value)} />
              <Select label={t("fields.maritalStatus")} options={maritalOptions} value={form.maritalStatus || "Unmarried"} onChange={(e) => update("maritalStatus", e.target.value)} />

              <div className="md:col-span-2 mt-2 pt-4 border-t border-slate-200">
                <h4 className="font-medium text-slate-900 mb-3">{t("studentForm.schoolEnrollment")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input label={t("fields.standard")} value={form.standard || ""} disabled />
                  <Input label={t("fields.section")} value={form.section || ""} disabled />
                  <Input label={t("fields.rollNumber")} value={form.rollNumber || ""} onChange={(e) => update("rollNumber", e.target.value)} />
                  <Input
                    label={t("fields.grNumber")}
                    value={form.grNumber || ""}
                    disabled={grLocked}
                    onChange={(e) => update("grNumber", e.target.value)}
                  />
                  <Input label={t("fields.childUid")} maxLength={18} placeholder="242610044011910032" value={form.childUid || ""} onChange={(e) => update("childUid", e.target.value.replace(/\s/g, ""))} />
                  <Select label={t("fields.bloodGroup")} options={["", ...BLOOD_GROUPS]} value={form.bloodGroup || ""} onChange={(e) => update("bloodGroup", e.target.value || null)} />
                </div>
                {grLocked && (
                  <p className="mt-2 text-xs text-slate-500">{t("studentForm.grClassLockedHint")}</p>
                )}
                {classes.length === 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    No classes configured. Admin must create classes/divisions first in Classes module.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">{t("studentForm.familyDetails")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <BilingualNameField
                    label={t("fields.motherName")}
                    required
                    enValue={form.motherName || ""}
                    guValue={form.motherNameGu || ""}
                    onEnChange={(v) => update("motherName", v)}
                    onGuChange={(v) => update("motherNameGu", v)}
                    guTouched={!!guTouched.motherNameGu}
                    onGuTouched={() => markGuTouched("motherNameGu")}
                  />
                  <BilingualNameField
                    label={t("fields.fatherName")}
                    required
                    enValue={form.fatherName || ""}
                    guValue={form.fatherNameGu || ""}
                    onEnChange={(v) => update("fatherName", v)}
                    onGuChange={(v) => update("fatherNameGu", v)}
                    guTouched={!!guTouched.fatherNameGu}
                    onGuTouched={() => markGuTouched("fatherNameGu")}
                  />
                  <BilingualNameField
                    label={t("fields.guardianName")}
                    enValue={form.guardianName || ""}
                    guValue={form.guardianNameGu || ""}
                    onEnChange={(v) => update("guardianName", v)}
                    onGuChange={(v) => update("guardianNameGu", v)}
                    guTouched={!!guTouched.guardianNameGu}
                    onGuTouched={() => markGuTouched("guardianNameGu")}
                  />
                  <Input label={t("fields.parentOccupation")} required value={form.parentOccupation || ""} onChange={(e) => update("parentOccupation", e.target.value)} />
                  <Input label={t("fields.annualFamilyIncome")} required type="number" value={form.annualFamilyIncome || ""} onChange={(e) => update("annualFamilyIncome", parseFloat(e.target.value))} />
                  <Input label={t("fields.familySize")} type="number" value={form.familySize || 4} onChange={(e) => update("familySize", parseInt(e.target.value))} />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={form.isOrphan || false} onChange={(e) => update("isOrphan", e.target.checked)} className="rounded" />
                      {t("fields.isOrphan")}
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">{t("studentForm.currentAddress")}</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Textarea label={t("fields.currentAddress")} required value={form.currentAddress || ""} onChange={(e) => update("currentAddress", e.target.value)} />
                  </div>
                  <Select label={t("fields.currentDistrict")} required options={GUJARAT_DISTRICTS} value={form.currentDistrict || ""} onChange={(e) => update("currentDistrict", e.target.value)} />
                  <Input label={t("fields.currentCity")} required value={form.currentCity || ""} onChange={(e) => update("currentCity", e.target.value)} />
                  <Input label={t("fields.currentPincode")} required maxLength={6} value={form.currentPincode || ""} onChange={(e) => update("currentPincode", e.target.value)} />
                  <Select label={t("fields.residentType")} options={residentOptions} value={form.residentType || "Rural"} onChange={(e) => update("residentType", e.target.value)} />
                  <Select label={t("fields.habitationType")} options={habitationOptions} value={form.habitationType || "Own"} onChange={(e) => update("habitationType", e.target.value)} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-slate-900">{t("studentForm.permanentAddress")}</h4>
                  <Button type="button" variant="outline" size="sm" onClick={copyCurrentToPermanent}>
                    {t("studentForm.sameAsCurrent")}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <Textarea label={t("fields.permanentAddress")} required value={form.permanentAddress || ""} onChange={(e) => update("permanentAddress", e.target.value)} />
                  </div>
                  <Select label={t("fields.permanentDistrict")} required options={GUJARAT_DISTRICTS} value={form.permanentDistrict || ""} onChange={(e) => update("permanentDistrict", e.target.value)} />
                  <Input label={t("fields.permanentCity")} required value={form.permanentCity || ""} onChange={(e) => update("permanentCity", e.target.value)} />
                  <Input label={t("fields.permanentPincode")} required maxLength={6} value={form.permanentPincode || ""} onChange={(e) => update("permanentPincode", e.target.value)} />
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-3">{t("studentForm.hostelDetails")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={form.isHosteler || false} onChange={(e) => update("isHosteler", e.target.checked)} className="rounded" />
                    {t("fields.isHosteler")}
                  </label>
                  {form.isHosteler && (
                    <>
                      <Input label={t("fields.hostelType")} value={form.hostelType || ""} onChange={(e) => update("hostelType", e.target.value)} />
                      <Input label={t("fields.hostelName")} required value={form.hostelName || ""} onChange={(e) => update("hostelName", e.target.value)} />
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h4 className="font-medium text-slate-900 mb-3">{t("studentForm.scholarshipCourse")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select label={t("fields.scholarshipScheme")} required options={SCHOLARSHIP_SCHEME_OPTIONS} value={form.scholarshipScheme || ""} onChange={(e) => update("scholarshipScheme", e.target.value)} />
                  {form.scholarshipScheme && (
                    <div className="md:col-span-2 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-600">
                      {t("studentForm.loginPortal")} <strong>{getDgPortalConfig(form.scholarshipScheme).labelHi}</strong>
                      {" — "}
                      <span className="font-mono text-slate-500">
                        {getDgPortalConfig(form.scholarshipScheme).loginUrl.split("/").pop()}
                      </span>
                    </div>
                  )}
                  <Select label={t("fields.financialYear")} required options={FINANCIAL_YEARS} value={form.financialYear || "2025-26"} onChange={(e) => update("financialYear", e.target.value)} />
                  <Select label={t("fields.courseType")} required options={COURSE_TYPES} value={form.courseType || ""} onChange={(e) => update("courseType", e.target.value)} />
                  <Input label={t("fields.courseName")} required placeholder="B.Tech Computer Engineering" value={form.courseName || ""} onChange={(e) => update("courseName", e.target.value)} />
                  <Select label={t("fields.institutionDistrict")} required options={GUJARAT_DISTRICTS} value={form.institutionDistrict || ""} onChange={(e) => update("institutionDistrict", e.target.value)} />
                  <Input label={t("fields.institutionName")} required value={form.institutionName || ""} onChange={(e) => update("institutionName", e.target.value)} />
                  <Select label={t("fields.currentYear")} required options={CURRENT_YEARS} value={form.currentYear || ""} onChange={(e) => update("currentYear", e.target.value)} />
                  <Select label={t("fields.admissionType")} options={admissionOptions} value={form.admissionType || "Regular"} onChange={(e) => update("admissionType", e.target.value)} />
                  <Input label={t("fields.startDate")} placeholder="01/07/2024" value={form.startDate || ""} onChange={(e) => update("startDate", e.target.value)} />
                  <Input label={t("fields.completionDate")} placeholder="30/06/2028" value={form.completionDate || ""} onChange={(e) => update("completionDate", e.target.value)} />
                </div>
              </div>

              <div>
                <h4 className="font-medium text-slate-900 mb-3">{t("studentForm.previousEducation")}</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Select label={t("fields.board10th")} required options={BOARDS} value={form.board10th || ""} onChange={(e) => update("board10th", e.target.value)} />
                  <Input label={t("fields.percentage10th")} required type="number" step="0.01" value={form.percentage10th || ""} onChange={(e) => update("percentage10th", parseFloat(e.target.value))} />
                  <Input label={t("fields.year10th")} required placeholder="2025" value={form.year10th || ""} onChange={(e) => update("year10th", e.target.value)} />
                  <Select label="GSEB Seat Prefix" options={["A", "B", "C", "S", "P"]} value={form.sscSeatPrefix || "A"} onChange={(e) => update("sscSeatPrefix", e.target.value)} />
                  <Input label="GSEB Seat No (7 digit)" placeholder="1234567" maxLength={7} value={form.sscSeatNumber || ""} onChange={(e) => update("sscSeatNumber", e.target.value.replace(/\D/g, "").slice(0, 7))} />
                  <p className="md:col-span-3 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    GSEB result check mate: Seat = Prefix (A/B/C/S/P) + 7 digit number. Example: A1234567. Board Records page par thi fetch thai shake.
                  </p>
                  <Select label={t("fields.board12th")} options={BOARDS} value={form.board12th || ""} onChange={(e) => update("board12th", e.target.value)} />
                  <Input label={t("fields.percentage12th")} type="number" step="0.01" value={form.percentage12th || ""} onChange={(e) => update("percentage12th", parseFloat(e.target.value))} />
                  <Input label={t("fields.year12th")} placeholder="2024" value={form.year12th || ""} onChange={(e) => update("year12th", e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label={t("fields.bankName")} required placeholder="State Bank of India" value={form.bankName || ""} onChange={(e) => update("bankName", e.target.value)} />
              <Input label={t("fields.branchName")} required value={form.branchName || ""} onChange={(e) => update("branchName", e.target.value)} />
              <Input label={t("fields.accountNumber")} required value={form.accountNumber || ""} onChange={(e) => update("accountNumber", e.target.value)} />
              <Input label={t("fields.ifscCode")} required placeholder="SBIN0001234" value={form.ifscCode || ""} onChange={(e) => update("ifscCode", e.target.value.toUpperCase())} />
              <div className="md:col-span-2">
                <Input label={t("fields.accountHolderName")} required value={form.accountHolderName || ""} onChange={(e) => update("accountHolderName", e.target.value)} />
              </div>
              <div className="md:col-span-2 bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <strong>{t("common.note")}:</strong> {t("studentForm.bankNote")}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <h4 className="font-medium text-emerald-800 mb-2">{t("studentForm.reviewTitle")}</h4>
                <p className="text-sm text-emerald-700">{t("studentForm.reviewDesc")}</p>
              </div>

              {[
                { title: t("studentForm.personal"), fields: [
                  [t("common.name"), studentFullNameGu(form as Parameters<typeof studentFullNameGu>[0])],
                  [t("fields.aadhaar"), form.aadhaarNumber],
                  [t("fields.aadhaarName"), studentDisplayAadhaarName(form as Parameters<typeof studentDisplayAadhaarName>[0])],
                  [t("fields.motherName"), studentDisplayMotherName(form as Parameters<typeof studentDisplayMotherName>[0])],
                  [t("fields.fatherName"), studentDisplayFatherName(form as Parameters<typeof studentDisplayFatherName>[0])],
                  [t("fields.mobile"), form.mobileNumber],
                  [t("fields.category"), form.category],
                  [t("fields.dob"), form.dateOfBirth],
                  [t("fields.class"), form.standard ? `Class ${form.standard}-${form.section || ""}` : "—"],
                  [t("fields.roll"), form.rollNumber],
                  [t("fields.childUid"), form.childUid],
                ]},
                { title: t("studentForm.academic"), fields: [
                  [t("fields.scheme"), form.scholarshipScheme],
                  [t("fields.course"), form.courseName],
                  [t("fields.institution"), form.institutionName],
                  [t("fields.year"), form.currentYear],
                  ["10th %", form.percentage10th],
                ]},
                { title: t("studentForm.bankSection"), fields: [
                  [t("fields.bank"), form.bankName],
                  [t("fields.account"), form.accountNumber],
                  [t("fields.ifscCode"), form.ifscCode],
                  [t("fields.holder"), form.accountHolderName],
                ]},
              ].map((section) => (
                <div key={section.title} className="border border-slate-200 rounded-lg p-4">
                  <h5 className="font-medium text-slate-900 mb-2">{section.title}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                    {section.fields.map(([label, value]) => (
                      <div key={label}>
                        <span className="text-slate-500">{label}:</span>{" "}
                        <span className="font-medium">{value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Textarea label={t("fields.notes")} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
            </div>
          )}

          {step === 6 && savedStudentId && (
            <div className="space-y-4">
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <p className="font-semibold">{t("studentForm.documentsTitle")}</p>
                <p className="mt-1 text-blue-700">{t("studentForm.documentsDesc")}</p>
              </div>
              <StudentDocumentsSection studentId={savedStudentId} />
            </div>
          )}

          {step === 6 && !savedStudentId && (
            <p className="text-sm text-amber-700">{t("studentForm.documentsSaveFirst")}</p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-200">
            <Button
              variant="outline"
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
            >
              <ChevronLeft className="h-4 w-4" /> {t("common.previous")}
            </Button>

            {step < 5 ? (
              <Button type="button" onClick={() => setStep((s) => Math.min(6, s + 1))}>
                {t("common.next")} <ChevronRight className="h-4 w-4" />
              </Button>
            ) : step === 5 ? (
              <Button type="button" variant="success" onClick={handleSaveAndContinue} disabled={loading}>
                <Save className="h-4 w-4" />
                {loading ? t("common.saving") : t("studentForm.saveAndDocuments")}
              </Button>
            ) : (
              <Button type="button" variant="success" onClick={() => onFinish?.()} disabled={loading}>
                <CheckCircle className="h-4 w-4" />
                {t("studentForm.finish")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
