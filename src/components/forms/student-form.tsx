"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  GUJARAT_DISTRICTS,
  CATEGORIES,
  GENDERS,
  RELIGIONS,
  PARENT_OCCUPATIONS,
  FINANCIAL_YEARS,
  CURRENT_YEARS,
  BOARDS,
  BLOOD_GROUPS,
  standardToCourseName,
  standardToCurrentYear,
} from "@/lib/constants";
import { PRE_MATRIC_SCHEMES, POST_MATRIC_SCHEMES } from "@/lib/dg-portal";
import { ChevronLeft, ChevronRight, Save, CheckCircle, Sparkles, Cloud, CloudOff, Search } from "lucide-react";
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
import { hasDraftContent, isDraftDobPlaceholder, stripDraftPlaceholdersForForm } from "@/lib/student-draft";
import { getCompletionPercentage } from "@/lib/validation";
import { DateField } from "@/components/ui/date-field";
import {
  calcAgeYears,
  formatDobDisplay,
  todayDobDisplay,
} from "@/lib/student-age";
import {
  ACCOUNT_NUMBER_MAX,
  ACCOUNT_NUMBER_MIN,
  RATION_CARD_MAX,
  courseTypesForStandard,
  defaultCourseTypeForStandard,
  isScholarshipRequired,
  isValidRationCard,
  previousEducationMode,
  scholarshipSchemesForCategory,
} from "@/lib/student-academic-rules";
import {
  studentFormPreviewRows,
  studentRecordToFormData,
  type StudentFormFields,
} from "@/lib/student-form-map";
import "./student-form.css";

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
  const isEditMode = Boolean(studentIdProp || initialData.id);
  /** New student: class is assigned only at the final review step. Edit: class at GR panel. */
  const deferClassAssignment = !isEditMode;
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
    residentType: "Rural",
    isHosteler: false,
    isOrphan: false,
    admissionType: "Regular",
    financialYear: "2025-26",
    classId: isEditMode
      ? initialData.classId || initialClassId || undefined
      : undefined,
    ...initialData,
    // New student: never start with a class (assign on final step)
    ...(isEditMode ? {} : { classId: undefined }),
    familySize:
      initialData.familySize !== undefined && initialData.familySize !== null
        ? Number(initialData.familySize)
        : 0,
    dateOfBirth: (() => {
      const raw = initialData.dateOfBirth?.trim() || "";
      if (raw && !isDraftDobPlaceholder(raw)) return formatDobDisplay(raw);
      return todayDobDisplay();
    })(),
    parentOccupation: (() => {
      const occ = String(initialData.parentOccupation || "").trim();
      if (!occ || occ === "—" || occ === "-") return "";
      return occ;
    })(),
  });
  const [guTouched, setGuTouched] = useState<Partial<Record<GuTouchKey, boolean>>>(() =>
    guTouchedFromData({ ...initialData }),
  );
  const [autoSaveStatus, setAutoSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipAutoSave = useRef(true);
  const [grReady, setGrReady] = useState(isEditMode && Boolean(initialData.grNumber || studentIdProp));
  const [grLocked, setGrLocked] = useState(isEditMode && Boolean(initialData.grNumber));
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [permPincodeStatus, setPermPincodeStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [ifscStatus, setIfscStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apaarFetchStatus, setApaarFetchStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [apaarFetchMsg, setApaarFetchMsg] = useState("");
  const [apaarPreview, setApaarPreview] = useState<StudentFormFields | null>(null);
  const pincodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const permPincodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ifscTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPincode = useRef("");
  const lastPermPincode = useRef("");
  const lastIfsc = useRef("");

  const markGuTouched = (key: GuTouchKey) => {
    setGuTouched((prev) => ({ ...prev, [key]: true }));
  };

  useEffect(() => {
    if (studentIdProp) setSavedStudentId(studentIdProp);
    else if (initialData.id) setSavedStudentId(initialData.id);
  }, [studentIdProp, initialData.id]);

  // Prefill class from URL only on final assign step (new student)
  useEffect(() => {
    if (!deferClassAssignment || step !== 5) return;
    if (form.classId || !initialClassId) return;
    const exists = classes.some((c) => c.id === initialClassId);
    if (exists) update("classId", initialClassId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, deferClassAssignment, initialClassId, classes, form.classId]);

  useEffect(() => {
    const year = form.financialYear || "2025-26";
    fetch(`/api/classes?academicYear=${encodeURIComponent(year)}`)
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []))
      .catch(() => setClasses([]));
  }, [form.financialYear]);

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
      courseType: defaultCourseTypeForStandard(cls.standard) || prev.courseType,
      institutionName: cls.institutionName || prev.institutionName,
      institutionDistrict: cls.institutionDistrict || prev.institutionDistrict,
      financialYear: cls.academicYear || prev.financialYear,
    }));
  }, [form.classId, classes]);

  const currentAge = calcAgeYears(form.dateOfBirth);
  const scholarshipRequired = isScholarshipRequired(form.category);
  const categorySchemes = scholarshipSchemesForCategory(form.category);
  const scholarshipOptions =
    categorySchemes.length > 0
      ? categorySchemes.map((s) => {
          const pre = (PRE_MATRIC_SCHEMES as readonly string[]).includes(s);
          return {
            value: s,
            label: `${pre ? t("studentForm.preMatric") : t("studentForm.postMatric")} ${s}`,
          };
        })
      : SCHOLARSHIP_SCHEME_OPTIONS;
  const courseTypeOptions = courseTypesForStandard(form.standard);
  const prevEduMode = previousEducationMode(form.standard);

  const OCCUPATION_OTHER = "Other";
  const isBlankOccupation = (raw: string | null | undefined) => {
    const v = String(raw || "").trim();
    return !v || v === "—" || v === "-" || v === "Other";
  };
  const [occupationOtherMode, setOccupationOtherMode] = useState(() => {
    const v = String(initialData.parentOccupation || "").trim();
    if (isBlankOccupation(v)) return false;
    return !(PARENT_OCCUPATIONS as readonly string[]).includes(v);
  });
  const occupationSelectValue = (() => {
    const v = String(form.parentOccupation || "").trim();
    if (isBlankOccupation(v)) return occupationOtherMode ? OCCUPATION_OTHER : "";
    if ((PARENT_OCCUPATIONS as readonly string[]).includes(v)) return v;
    return OCCUPATION_OTHER;
  })();
  const isOccupationOther = occupationSelectValue === OCCUPATION_OTHER;

  useEffect(() => {
    const v = String(form.parentOccupation || "").trim();
    if (isBlankOccupation(v)) return;
    if (!(PARENT_OCCUPATIONS as readonly string[]).includes(v)) {
      setOccupationOtherMode(true);
    }
  }, [form.parentOccupation]);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    if (!scholarshipRequired) return;
    if (!form.scholarshipScheme || categorySchemes.length === 0) return;
    if (!categorySchemes.includes(form.scholarshipScheme)) {
      setForm((prev) => ({ ...prev, scholarshipScheme: "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.category]);

  const lookupPincode = async (
    pin: string,
    which: "current" | "permanent",
  ) => {
    if (which === "current") {
      if (pin === lastPincode.current) return;
      lastPincode.current = pin;
      setPincodeStatus("loading");
    } else {
      if (pin === lastPermPincode.current) return;
      lastPermPincode.current = pin;
      setPermPincodeStatus("loading");
    }
    try {
      const res = await fetch(`/api/pincode/${pin}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fail");
      if (which === "current") {
        setForm((prev) => ({
          ...prev,
          currentPincode: pin,
          currentDistrict: data.district || prev.currentDistrict,
          currentCity: data.city || data.taluka || prev.currentCity,
        }));
        setPincodeStatus("ok");
      } else {
        setForm((prev) => ({
          ...prev,
          permanentPincode: pin,
          permanentDistrict: data.district || prev.permanentDistrict,
          permanentCity: data.city || data.taluka || prev.permanentCity,
        }));
        setPermPincodeStatus("ok");
      }
    } catch {
      if (which === "current") setPincodeStatus("error");
      else setPermPincodeStatus("error");
    }
  };

  const lookupIfsc = async (code: string) => {
    if (code === lastIfsc.current) return;
    lastIfsc.current = code;
    setIfscStatus("loading");
    try {
      const res = await fetch(`/api/ifsc/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fail");
      setForm((prev) => ({
        ...prev,
        ifscCode: code,
        bankName: data.bankName || prev.bankName,
        branchName: data.branchName || prev.branchName,
      }));
      setIfscStatus("ok");
    } catch {
      setIfscStatus("error");
    }
  };

  useEffect(() => {
    const pin = String(form.currentPincode || "").replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setPincodeStatus("idle");
      return;
    }
    if (pincodeTimer.current) clearTimeout(pincodeTimer.current);
    pincodeTimer.current = setTimeout(() => lookupPincode(pin, "current"), 400);
    return () => {
      if (pincodeTimer.current) clearTimeout(pincodeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.currentPincode]);

  useEffect(() => {
    const pin = String(form.permanentPincode || "").replace(/\D/g, "").slice(0, 6);
    if (pin.length !== 6) {
      setPermPincodeStatus("idle");
      return;
    }
    if (permPincodeTimer.current) clearTimeout(permPincodeTimer.current);
    permPincodeTimer.current = setTimeout(() => lookupPincode(pin, "permanent"), 400);
    return () => {
      if (permPincodeTimer.current) clearTimeout(permPincodeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.permanentPincode]);

  useEffect(() => {
    const code = String(form.ifscCode || "")
      .trim()
      .toUpperCase()
      .replace(/\s/g, "");
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(code)) {
      setIfscStatus("idle");
      return;
    }
    if (ifscTimer.current) clearTimeout(ifscTimer.current);
    ifscTimer.current = setTimeout(() => lookupIfsc(code), 400);
    return () => {
      if (ifscTimer.current) clearTimeout(ifscTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.ifscCode]);

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
    setForm((prev) => {
      let next = { ...prev, ...suggested } as FormData;

      // New draft from DB has "—" / fake defaults — strip so UI + progress stay honest
      if (isNew) {
        next = stripDraftPlaceholdersForForm(next as Record<string, unknown>, "all") as FormData;
        next.aadhaarNumber = "";
        next.mobileNumber = "";
        if (deferClassAssignment) {
          next.classId = null;
        }
        setOccupationOtherMode(false);
      } else {
        // Existing student: only clear em-dash leftovers
        next = stripDraftPlaceholdersForForm(next as Record<string, unknown>, "placeholders") as FormData;
        const occ = String(next.parentOccupation || "").trim();
        if (!occ) setOccupationOtherMode(false);
        else if (!(PARENT_OCCUPATIONS as readonly string[]).includes(occ)) setOccupationOtherMode(true);
        else setOccupationOtherMode(false);
      }

      // Draft / empty DOB must not keep the old 01/01/2000 placeholder
      if (isDraftDobPlaceholder(String(next.dateOfBirth || ""))) {
        next.dateOfBirth = todayDobDisplay();
      } else if (next.dateOfBirth) {
        next.dateOfBirth = formatDobDisplay(String(next.dateOfBirth));
      }
      return next;
    });
    if (studentId) {
      setSavedStudentId(studentId);
    }
    setGrReady(true);
    setGrLocked(true);
  };

  useEffect(() => {
    if (!grReady) return;
    if (!form.grNumber?.trim()) return;
    // New flow allows draft without class; edit still prefers class when present
    if (!deferClassAssignment && !form.classId) return;
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
      // Fill missing Gujarati only — never overwrite DB / pasted Gu names
      return ensureGuNameFields(merged);
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

  /** Full replace from school DB student (APAAR / UPPAR lookup). */
  const applyLoadedStudentRecord = (raw: Record<string, unknown> & { id?: string }) => {
    const mapped = studentRecordToFormData(raw);
    const apaar = String(mapped.apaarId || form.apaarId || "")
      .replace(/\s/g, "")
      .trim()
      .toUpperCase();
    mapped.apaarId = apaar;

    const occ = String(mapped.parentOccupation || "").trim();
    if (!occ || occ === "—" || occ === "-") {
      mapped.parentOccupation = "";
      setOccupationOtherMode(false);
    } else if (!(PARENT_OCCUPATIONS as readonly string[]).includes(occ)) {
      setOccupationOtherMode(true);
    } else {
      setOccupationOtherMode(false);
    }

    skipAutoSave.current = true;
    setForm((prev) => {
      const { className: _className, ...formFields } = mapped;
      void _className;
      const next: FormData = {
        maritalStatus: "Unmarried",
        habitationType: "Own",
        residentType: "Rural",
        isHosteler: false,
        isOrphan: false,
        admissionType: "Regular",
        financialYear: prev.financialYear || mapped.financialYear || "2025-26",
        familySize: 0,
        ...formFields,
        apaarId: apaar,
      };

      if (deferClassAssignment && !mapped.classId) {
        next.classId = undefined;
      }

      return next;
    });

    setGuTouched({
      firstNameGu: true,
      middleNameGu: true,
      surnameGu: true,
      aadhaarNameGu: true,
      motherNameGu: true,
      fatherNameGu: true,
      guardianNameGu: true,
    });

    if (raw.id) setSavedStudentId(String(raw.id));
    setGrReady(true);
    setGrLocked(Boolean(mapped.grNumber));
    setApaarPreview(mapped);
    setStep(1);
  };

  const fetchByApaarId = async () => {
    const apaar = String(form.apaarId || "").replace(/\s/g, "").trim().toUpperCase();
    if (!apaar || apaar.length < 8) {
      setApaarFetchStatus("error");
      setApaarFetchMsg(t("studentForm.apaarPlaceholder"));
      setApaarPreview(null);
      return;
    }
    setApaarFetchStatus("loading");
    setApaarFetchMsg("");
    setApaarPreview(null);
    try {
      const res = await fetch(`/api/students/lookup-apaar?apaarId=${encodeURIComponent(apaar)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fail");
      if (!data.found || !data.student) {
        setApaarFetchStatus("error");
        setApaarFetchMsg(t("studentForm.apaarNotFound"));
        return;
      }
      applyLoadedStudentRecord(data.student as Record<string, unknown> & { id?: string });
      setApaarFetchStatus("ok");
      setApaarFetchMsg(t("studentForm.apaarFound"));
    } catch (e) {
      setApaarFetchStatus("error");
      setApaarFetchMsg(e instanceof Error ? e.message : t("studentForm.apaarNotFound"));
      setApaarPreview(null);
    }
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
      alert(t("studentForm.assignClassRequired"));
      setStep(deferClassAssignment ? 5 : 1);
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
    <div className="sf-wrap">
      <GrSetupPanel
        classes={classes}
        academicYear={form.financialYear || "2025-26"}
        classId={form.classId || ""}
        grNumber={form.grNumber || ""}
        locked={grLocked}
        studentId={savedStudentId}
        deferClassAssignment={deferClassAssignment}
        onAcademicYearChange={(year) => {
          setForm((prev) => ({
            ...prev,
            financialYear: year,
            ...(deferClassAssignment ? {} : { classId: null }),
            grNumber: "",
          }));
        }}
        onClassChange={(id) => update("classId", id || null)}
        onGrNumberChange={(v) => update("grNumber", v)}
        onUnlockEdit={() => setGrLocked(false)}
        onClearSelection={() => {
          skipAutoSave.current = true;
          setGrLocked(false);
          setGrReady(false);
          setStep(1);
          // Dedicated edit page keeps the student id; /students/new resets pick
          if (isEditMode && studentIdProp) {
            setForm((prev) => ({ ...prev, grNumber: prev.grNumber || "" }));
            return;
          }
          setSavedStudentId(undefined);
          setForm((prev) => ({
            maritalStatus: "Unmarried",
            habitationType: "Own",
            residentType: "Rural",
            isHosteler: false,
            isOrphan: false,
            admissionType: "Regular",
            financialYear: prev.financialYear || "2025-26",
            classId: undefined,
            grNumber: "",
            familySize: 0,
            dateOfBirth: todayDobDisplay(),
          }));
          setGuTouched({});
          setAutoSaveStatus("idle");
        }}
        onReady={handleGrReady}
      />

      {!grReady && (
        <div className="sf-alert">{t("studentForm.grSetupRequired")}</div>
      )}

      {grReady && (
        <>
      <div className="sf-hero">
        <div className="sf-hero__glow sf-hero__glow--a" />
        <div className="sf-hero__glow sf-hero__glow--b" />
        <div className="sf-hero__row">
          <div>
            <p className="sf-hero__kicker">{t("studentForm.portalBadge")}</p>
            <h2 className="sf-hero__title">{t("studentForm.portalTitle")}</h2>
            <p className="sf-hero__sub">{t("studentForm.portalSubtitle")}</p>
          </div>
          <div className="sf-hero__meta">
            <div className="sf-hero__pct">
              <p className="sf-hero__pct-num">{completionPct}%</p>
              <p className="sf-hero__pct-label">{t("studentForm.complete")}</p>
            </div>
            <div className="sf-hero__save" data-state={autoSaveStatus}>
              {autoSaveStatus === "saving" && <Spinner size="sm" />}
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
        <div className="sf-hero__bar">
          <div className="sf-hero__bar-fill" style={{ width: `${completionPct}%` }} />
        </div>
      </div>

      <div className="sf-steps">
        <div className="sf-steps__track">
          {STEPS.map((s, i) => (
            <div key={s.id} className="sf-steps__item">
              <button
                type="button"
                onClick={() => {
                  if (s.id === 6 && !savedStudentId) return;
                  setStep(s.id);
                }}
                disabled={s.id === 6 && !savedStudentId}
                className="sf-steps__btn"
                data-active={step === s.id ? "true" : "false"}
                data-done={step > s.id ? "true" : "false"}
              >
                <div className="sf-steps__num">
                  {step > s.id ? <CheckCircle className="h-4 w-4" /> : s.id}
                </div>
                <div className="sf-steps__text">
                  <p className="sf-steps__title">{s.title}</p>
                  <p className="sf-steps__desc">{s.desc}</p>
                </div>
              </button>
              {i < STEPS.length - 1 && (
                <div className="sf-steps__line" data-done={step > s.id ? "true" : "false"} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="sf-card">
        <div className="sf-card__head">
          <div className="sf-card__head-row">
            <h3 className="sf-card__title">{STEPS[step - 1].title}</h3>
            <span className="sf-card__badge">
              {t("studentForm.stepOf", { current: step, total: STEPS.length })}
            </span>
          </div>
          <p className="sf-card__desc">{STEPS[step - 1].desc}</p>
        </div>
        <div className="sf-card__body">
          {step === 1 && (
            <div className="sf-stack">
              {/* ── Top: only online fetch sources ── */}
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {t("studentForm.importFetchTitle")}
                  </h4>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {t("studentForm.importFetchDesc")}
                  </p>
                </div>

                <SsgujaratFetch
                  aadhaarNumber={form.aadhaarNumber || ""}
                  childUid={form.childUid || ""}
                  onApply={applySsgujaratData}
                />

                <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 sm:p-4">
                  <p className="text-sm font-semibold text-violet-900">
                    {t("fields.apaarId")}
                  </p>
                  <p className="mt-0.5 text-xs text-violet-700">
                    {t("studentForm.apaarFetchHint")}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
                    <div className="min-w-0 w-full flex-1">
                      <Input
                        label={t("fields.apaarId")}
                        maxLength={16}
                        placeholder={t("studentForm.apaarPlaceholder")}
                        value={form.apaarId || ""}
                        onChange={(e) => {
                          setApaarFetchStatus("idle");
                          setApaarFetchMsg("");
                          setApaarPreview(null);
                          update(
                            "apaarId",
                            e.target.value
                              .replace(/[^a-zA-Z0-9]/g, "")
                              .toUpperCase()
                              .slice(0, 16),
                          );
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void fetchByApaarId();
                          }
                        }}
                      />
                    </div>
                    <Button
                      type="button"
                      className="h-10 w-full cursor-pointer gap-1.5 bg-violet-700 hover:bg-violet-800 sm:w-auto"
                      onClick={() => void fetchByApaarId()}
                      disabled={
                        apaarFetchStatus === "loading" ||
                        !String(form.apaarId || "").trim()
                      }
                    >
                      {apaarFetchStatus === "loading" ? (
                        <Spinner size="sm" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      {t("studentForm.apaarFetchBtn")}
                    </Button>
                  </div>
                  {apaarFetchMsg && (
                    <p
                      className={`mt-2 text-xs font-medium ${
                        apaarFetchStatus === "ok" ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {apaarFetchMsg}
                    </p>
                  )}
                  {apaarPreview && apaarFetchStatus === "ok" && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold text-violet-900">
                        {t("studentForm.apaarLoadedPreview")}
                      </p>
                      <div className="grid max-h-80 grid-cols-1 gap-x-4 gap-y-1 overflow-y-auto rounded-lg border border-violet-200 bg-white p-3 text-xs sm:grid-cols-2">
                        {studentFormPreviewRows(apaarPreview, {
                          name: t("common.name"),
                          aadhaarName: t("fields.aadhaarName"),
                          aadhaar: t("fields.aadhaar"),
                          dob: t("fields.dob"),
                          gender: t("fields.gender"),
                          mobile: t("fields.mobile"),
                          fatherMother: t("ssg.fatherMother"),
                          category: t("fields.category"),
                          caste: t("fields.caste"),
                          religion: t("fields.religion"),
                          address: t("common.address"),
                          district: t("common.district"),
                          pincode: t("fields.currentPincode"),
                          gr: t("fields.grNumber"),
                          classLabel: t("fields.class"),
                          apaar: t("fields.apaarId"),
                          bank: t("fields.bank"),
                          account: t("fields.account"),
                          ifsc: t("fields.ifscCode"),
                          scholarship: t("common.scholarship"),
                          childUid: t("fields.childUid"),
                        }).map(([label, value]) => (
                          <div
                            key={label}
                            className="grid min-w-0 grid-cols-1 gap-0.5 py-1 min-[400px]:grid-cols-[6rem_minmax(0,1fr)]"
                          >
                            <span className="text-slate-500">{label}:</span>
                            <span className="min-w-0 break-words font-medium text-slate-800 [overflow-wrap:anywhere]">
                              {value}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-violet-700">{t("studentForm.apaarLoadedHint")}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="sf-block sf-block--plain">
                <div className="sf-grid">
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
                <div className="sf-suggest sf-span-full">
                  <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    {t("studentForm.categorySuggest")} <CategoryBadge category={categoryHint.category} />
                    <span className="text-xs ml-1">({categoryHint.source}, {categoryHint.confidence})</span>
                  </span>
                  {form.category !== categoryHint.category && (
                    <Button
                      type="button"
                      variant="outline"
                      className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
                      onClick={applySuggestedCategory}
                    >
                      {t("studentForm.applyCategory", { category: categoryHint.category })}
                    </Button>
                  )}
                  <span className="text-xs opacity-80">{t("studentForm.verifyCaste")}</span>
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
              <div>
                <DateField
                  label={t("fields.dateOfBirth")}
                  required
                  value={form.dateOfBirth || ""}
                  onChange={(v) => update("dateOfBirth", v)}
                  outputFormat="dmy-slash"
                />
              </div>
              <div>
                <Input
                  label={t("studentForm.ageLabel")}
                  value={currentAge != null ? t("studentForm.ageYears", { age: currentAge }) : ""}
                  disabled
                  placeholder="—"
                />
                <p className="sf-hint">{t("studentForm.ageHint")}</p>
              </div>
              <Select label={t("fields.gender")} required options={genderOptions} value={form.gender || ""} onChange={(e) => update("gender", e.target.value)} />
              <Input
                label={t("fields.aadhaarNumber")}
                required
                placeholder="123456789012"
                maxLength={12}
                value={form.aadhaarNumber || ""}
                onChange={(e) =>
                  update("aadhaarNumber", e.target.value.replace(/\D/g, "").slice(0, 12))
                }
              />
              <Input
                label={t("fields.childUid")}
                maxLength={18}
                placeholder="242610044011910032"
                value={form.childUid || ""}
                onChange={(e) =>
                  update("childUid", e.target.value.replace(/\s/g, "").replace(/\D/g, "").slice(0, 18))
                }
              />
              <div>
                <Input
                  label={t("fields.panNumber")}
                  maxLength={10}
                  placeholder={t("studentForm.panPlaceholder")}
                  value={form.panNumber || ""}
                  onChange={(e) =>
                    update(
                      "panNumber",
                      e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10),
                    )
                  }
                />
                <p className="sf-hint">{t("studentForm.panHint")}</p>
              </div>
              <div>
                <Input
                  label={t("fields.rationCardNumber")}
                  maxLength={RATION_CARD_MAX}
                  value={form.rationCardNumber || ""}
                  onChange={(e) =>
                    update(
                      "rationCardNumber",
                      e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, RATION_CARD_MAX),
                    )
                  }
                />
                <p className="sf-hint">{t("studentForm.rationCardHint")}</p>
                {form.rationCardNumber && !isValidRationCard(form.rationCardNumber) && (
                  <p className="sf-hint sf-hint--error">{t("studentForm.rationCardHint")}</p>
                )}
              </div>
              <Input label={t("fields.mobileNumber")} required placeholder="9876543210" maxLength={10} value={form.mobileNumber || ""} onChange={(e) => update("mobileNumber", e.target.value)} />
              <Input label={t("fields.email")} type="email" value={form.email || ""} onChange={(e) => update("email", e.target.value)} />
              <Select label={t("fields.category")} required options={CATEGORIES} value={form.category || ""} onChange={(e) => update("category", e.target.value)} />
              <Input label={t("fields.caste")} value={form.caste || ""} onChange={(e) => update("caste", e.target.value)} />
              <Select label={t("fields.religion")} required options={RELIGIONS} value={form.religion || ""} onChange={(e) => update("religion", e.target.value)} />
              <Select label={t("fields.maritalStatus")} options={maritalOptions} value={form.maritalStatus || "Unmarried"} onChange={(e) => update("maritalStatus", e.target.value)} />
                </div>
              </div>

              <div className="sf-block sf-block--school">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.schoolEnrollment")}</h4>
                </div>
                <div className="sf-grid">
                  <Input label={t("fields.standard")} value={form.standard || ""} disabled />
                  <Input label={t("fields.section")} value={form.section || ""} disabled />
                  <Input label={t("fields.rollNumber")} value={form.rollNumber || ""} onChange={(e) => update("rollNumber", e.target.value)} />
                  <Input
                    label={t("fields.grNumber")}
                    value={form.grNumber || ""}
                    disabled={grLocked}
                    onChange={(e) => update("grNumber", e.target.value)}
                  />
                  <Select label={t("fields.bloodGroup")} options={[...BLOOD_GROUPS]} emptyLabel={t("common.select")} value={form.bloodGroup || ""} onChange={(e) => update("bloodGroup", e.target.value || null)} />
                </div>
                {grLocked && (
                  <p className="sf-hint">{t("studentForm.grClassLockedHint")}</p>
                )}
                {classes.length === 0 && (
                  <div className="sf-note sf-note--warn" style={{ marginTop: "0.75rem" }}>
                    No classes configured. Admin must create classes/divisions first in Classes module.
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="sf-stack">
              <div className="sf-block sf-block--family">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.familyDetails")}</h4>
                </div>
                <div className="sf-grid">
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
                  <div>
                    <Select
                      label={t("fields.parentOccupation")}
                      required
                      emptyLabel={t("common.select")}
                      options={(PARENT_OCCUPATIONS as readonly string[]).map((o) => ({
                        value: o,
                        label: o === "Other" ? t("common.other") : o,
                      }))}
                      value={occupationSelectValue}
                      onChange={(e) => {
                        const next = e.target.value;
                        if (next === OCCUPATION_OTHER) {
                          setOccupationOtherMode(true);
                          const cur = String(form.parentOccupation || "").trim();
                          const listed =
                            (PARENT_OCCUPATIONS as readonly string[]).includes(cur) &&
                            cur !== OCCUPATION_OTHER;
                          if (listed || !cur) update("parentOccupation", "");
                        } else {
                          setOccupationOtherMode(false);
                          update("parentOccupation", next || null);
                        }
                      }}
                    />
                    {isOccupationOther && (
                      <div className="mt-2">
                        <Input
                          label={t("fields.parentOccupationOther")}
                          required
                          placeholder={t("fields.parentOccupationOtherPlaceholder")}
                          value={
                            isBlankOccupation(form.parentOccupation)
                              ? ""
                              : form.parentOccupation || ""
                          }
                          onChange={(e) => update("parentOccupation", e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                  <Input label={t("fields.annualFamilyIncome")} required type="number" value={form.annualFamilyIncome || ""} onChange={(e) => update("annualFamilyIncome", parseFloat(e.target.value))} />
                  <Input
                    label={t("fields.familySize")}
                    type="number"
                    min={0}
                    max={30}
                    value={form.familySize ?? 0}
                    onChange={(e) => {
                      const raw = e.target.value;
                      if (raw === "") {
                        update("familySize", 0);
                        return;
                      }
                      const n = parseInt(raw, 10);
                      update("familySize", Number.isFinite(n) ? Math.max(0, n) : 0);
                    }}
                  />
                  <label className="sf-check">
                    <input type="checkbox" checked={form.isOrphan || false} onChange={(e) => update("isOrphan", e.target.checked)} />
                    {t("fields.isOrphan")}
                  </label>
                </div>
              </div>

              <div className="sf-block sf-block--address">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.currentAddress")}</h4>
                </div>
                <div className="sf-grid">
                  <div className="sf-span-full">
                    <Textarea label={t("fields.currentAddress")} required value={form.currentAddress || ""} onChange={(e) => update("currentAddress", e.target.value)} />
                  </div>
                  <div>
                    <Input
                      label={t("fields.currentPincode")}
                      required
                      maxLength={6}
                      value={form.currentPincode || ""}
                      onChange={(e) => update("currentPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <p className="sf-hint">
                      {pincodeStatus === "loading"
                        ? t("studentForm.pincodeLookup")
                        : pincodeStatus === "ok"
                          ? t("studentForm.pincodeFilled")
                          : pincodeStatus === "error"
                            ? t("studentForm.pincodeFailed")
                            : "Enter 6-digit pincode"}
                    </p>
                  </div>
                  <Select label={t("fields.currentDistrict")} required options={GUJARAT_DISTRICTS} value={form.currentDistrict || ""} onChange={(e) => update("currentDistrict", e.target.value)} />
                  <Input label={t("fields.currentCity")} required value={form.currentCity || ""} onChange={(e) => update("currentCity", e.target.value)} />
                  <Select label={t("fields.residentType")} options={residentOptions} value={form.residentType || "Rural"} onChange={(e) => update("residentType", e.target.value)} />
                  <Select label={t("fields.habitationType")} options={habitationOptions} value={form.habitationType || "Own"} onChange={(e) => update("habitationType", e.target.value)} />
                </div>
              </div>

              <div className="sf-block sf-block--address">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.permanentAddress")}</h4>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto min-h-11 w-full whitespace-normal sm:w-auto"
                    onClick={copyCurrentToPermanent}
                  >
                    {t("studentForm.sameAsCurrent")}
                  </Button>
                </div>
                <div className="sf-grid">
                  <div className="sf-span-full">
                    <Textarea label={t("fields.permanentAddress")} required value={form.permanentAddress || ""} onChange={(e) => update("permanentAddress", e.target.value)} />
                  </div>
                  <div>
                    <Input
                      label={t("fields.permanentPincode")}
                      required
                      maxLength={6}
                      value={form.permanentPincode || ""}
                      onChange={(e) => update("permanentPincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    />
                    <p className="sf-hint">
                      {permPincodeStatus === "loading"
                        ? t("studentForm.pincodeLookup")
                        : permPincodeStatus === "ok"
                          ? t("studentForm.pincodeFilled")
                          : permPincodeStatus === "error"
                            ? t("studentForm.pincodeFailed")
                            : "Enter 6-digit pincode"}
                    </p>
                  </div>
                  <Select label={t("fields.permanentDistrict")} required options={GUJARAT_DISTRICTS} value={form.permanentDistrict || ""} onChange={(e) => update("permanentDistrict", e.target.value)} />
                  <Input label={t("fields.permanentCity")} required value={form.permanentCity || ""} onChange={(e) => update("permanentCity", e.target.value)} />
                </div>
              </div>

              <div className="sf-block sf-block--hostel">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.hostelDetails")}</h4>
                </div>
                <div className="sf-grid">
                  <label className="sf-check">
                    <input type="checkbox" checked={form.isHosteler || false} onChange={(e) => update("isHosteler", e.target.checked)} />
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
            <div className="sf-stack">
              <div className="sf-block sf-block--scholarship">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.scholarshipCourse")}</h4>
                </div>
                <div className="sf-grid">
                  {!scholarshipRequired ? (
                    <div className="sf-note sf-span-full">{t("studentForm.scholarshipOptionalOpen")}</div>
                  ) : (
                    <p className="sf-hint sf-span-full">{t("studentForm.scholarshipByCategory")}</p>
                  )}
                  <Select
                    label={t("fields.scholarshipScheme")}
                    required={scholarshipRequired}
                    options={scholarshipOptions}
                    value={form.scholarshipScheme || ""}
                    onChange={(e) => update("scholarshipScheme", e.target.value || null)}
                  />
                  {form.scholarshipScheme && (
                    <div className="sf-note sf-note--info sf-span-full">
                      {t("studentForm.loginPortal")} <strong>{getDgPortalConfig(form.scholarshipScheme).labelHi}</strong>
                      {" — "}
                      <span className="font-mono">
                        {getDgPortalConfig(form.scholarshipScheme).loginUrl.split("/").pop()}
                      </span>
                    </div>
                  )}
                  <Select label={t("fields.financialYear")} required options={FINANCIAL_YEARS} value={form.financialYear || "2025-26"} onChange={(e) => update("financialYear", e.target.value)} />
                  <Select
                    label={t("fields.courseType")}
                    required
                    options={courseTypeOptions}
                    value={form.courseType || ""}
                    onChange={(e) => update("courseType", e.target.value)}
                  />
                  <div>
                    <Input
                      label={t("fields.courseName")}
                      required
                      value={form.courseName || ""}
                      onChange={(e) => update("courseName", e.target.value)}
                    />
                    <p className="sf-hint">{t("studentForm.courseAutoFromClass")}</p>
                  </div>
                  <Select label={t("fields.institutionDistrict")} required options={GUJARAT_DISTRICTS} value={form.institutionDistrict || ""} onChange={(e) => update("institutionDistrict", e.target.value)} />
                  <Input label={t("fields.institutionName")} required value={form.institutionName || ""} onChange={(e) => update("institutionName", e.target.value)} />
                  <div>
                    <Select
                      label={t("fields.currentYear")}
                      options={CURRENT_YEARS}
                      value={form.currentYear || ""}
                      onChange={(e) => update("currentYear", e.target.value)}
                    />
                    <p className="sf-hint">{t("studentForm.currentYearAuto")}</p>
                  </div>
                  <Select label={t("fields.admissionType")} options={admissionOptions} value={form.admissionType || "Regular"} onChange={(e) => update("admissionType", e.target.value)} />
                </div>
              </div>

              <div className="sf-block sf-block--edu">
                <div className="sf-block__head">
                  <h4 className="sf-block__title">{t("studentForm.previousEducation")}</h4>
                </div>
                {prevEduMode === "none" && (
                  <p className="sf-note">{t("studentForm.prevEduNotNeeded", { standard: form.standard || "—" })}</p>
                )}
                {prevEduMode === "class10_current" && (
                  <p className="sf-note sf-note--info">{t("studentForm.prevEduClass10Hint")}</p>
                )}
                {(prevEduMode === "need10" || prevEduMode === "need10_opt12" || prevEduMode === "need10_12") && (
                  <div className="sf-grid-3">
                    <Select label={t("fields.board10th")} required options={BOARDS} value={form.board10th || ""} onChange={(e) => update("board10th", e.target.value)} />
                    <Input label={t("fields.percentage10th")} required type="number" step="0.01" value={form.percentage10th || ""} onChange={(e) => update("percentage10th", parseFloat(e.target.value))} />
                    <Input label={t("fields.year10th")} required placeholder="2025" value={form.year10th || ""} onChange={(e) => update("year10th", e.target.value)} />
                    <Select label="GSEB Seat Prefix" options={["A", "B", "C", "S", "P"]} value={form.sscSeatPrefix || "A"} onChange={(e) => update("sscSeatPrefix", e.target.value)} />
                    <Input label="GSEB Seat No (7 digit)" placeholder="1234567" maxLength={7} value={form.sscSeatNumber || ""} onChange={(e) => update("sscSeatNumber", e.target.value.replace(/\D/g, "").slice(0, 7))} />
                    <p className="sf-note sf-note--info sf-span-full">
                      GSEB result: Seat = Prefix (A/B/C/S/P) + 7 digit number. Example: A1234567.
                    </p>
                    {(prevEduMode === "need10_opt12" || prevEduMode === "need10_12") && (
                      <>
                        <Select
                          label={t("fields.board12th")}
                          required={prevEduMode === "need10_12"}
                          options={BOARDS}
                          value={form.board12th || ""}
                          onChange={(e) => update("board12th", e.target.value)}
                        />
                        <Input
                          label={t("fields.percentage12th")}
                          type="number"
                          step="0.01"
                          value={form.percentage12th || ""}
                          onChange={(e) => update("percentage12th", parseFloat(e.target.value))}
                        />
                        <Input label={t("fields.year12th")} placeholder="2024" value={form.year12th || ""} onChange={(e) => update("year12th", e.target.value)} />
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="sf-block sf-block--bank">
              <div className="sf-block__head">
                <h4 className="sf-block__title">{t("studentForm.bankSection")}</h4>
              </div>
              <div className="sf-grid">
              <div className="sf-span-full">
                <Input
                  label={t("fields.ifscCode")}
                  required
                  placeholder="SBIN0001234"
                  maxLength={11}
                  value={form.ifscCode || ""}
                  onChange={(e) => update("ifscCode", e.target.value.toUpperCase().replace(/\s/g, "").slice(0, 11))}
                />
                <p className="sf-hint">
                  {ifscStatus === "loading"
                    ? t("studentForm.ifscLookup")
                    : ifscStatus === "ok"
                      ? t("studentForm.ifscFilled")
                      : ifscStatus === "error"
                        ? t("studentForm.ifscFailed")
                        : t("studentForm.ifscHint")}
                </p>
              </div>
              <Input
                label={`${t("fields.bankName")} (${t("studentForm.bankFromIfsc")})`}
                required
                placeholder="State Bank of India"
                value={form.bankName || ""}
                onChange={(e) => update("bankName", e.target.value)}
              />
              <Input
                label={`${t("fields.branchName")} (${t("studentForm.bankFromIfsc")})`}
                required
                value={form.branchName || ""}
                onChange={(e) => update("branchName", e.target.value)}
              />
              <div>
                <Input
                  label={t("fields.accountNumber")}
                  required
                  maxLength={ACCOUNT_NUMBER_MAX}
                  value={form.accountNumber || ""}
                  onChange={(e) =>
                    update("accountNumber", e.target.value.replace(/\D/g, "").slice(0, ACCOUNT_NUMBER_MAX))
                  }
                />
                <p className="sf-hint">
                  {t("studentForm.accountNumberHint")}
                  {form.accountNumber
                    ? ` · ${String(form.accountNumber).length}/${ACCOUNT_NUMBER_MIN}–${ACCOUNT_NUMBER_MAX}`
                    : ""}
                </p>
              </div>
              <div className="sf-span-full">
                <Input label={t("fields.accountHolderName")} required value={form.accountHolderName || ""} onChange={(e) => update("accountHolderName", e.target.value)} />
              </div>
              <div className="sf-note sf-note--info sf-span-full">
                <strong>{t("common.note")}:</strong> {t("studentForm.bankNote")}
              </div>
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="sf-stack">
              {deferClassAssignment && (
                <div className="sf-block sf-block--academic">
                  <div className="sf-block__head">
                    <h4 className="sf-block__title">{t("studentForm.assignClassFinalTitle")}</h4>
                    <p className="sf-hint" style={{ marginTop: "0.25rem" }}>
                      {t("studentForm.assignClassFinalDesc")}
                    </p>
                  </div>
                  <div className="sf-grid">
                    <Select
                      label={t("fields.financialYear")}
                      required
                      options={FINANCIAL_YEARS}
                      value={form.financialYear || "2025-26"}
                      onChange={(e) => {
                        const year = e.target.value;
                        setForm((prev) => ({
                          ...prev,
                          financialYear: year,
                          classId: null,
                        }));
                      }}
                    />
                    <Select
                      label={t("fields.assignClass")}
                      required
                      emptyLabel={t("common.selectClass")}
                      options={classes
                        .filter((c) => c.academicYear === (form.financialYear || "2025-26"))
                        .map((c) => ({ value: c.id, label: c.name }))}
                      value={form.classId || ""}
                      onChange={(e) => update("classId", e.target.value || null)}
                    />
                  </div>
                  {!form.classId && (
                    <p className="sf-note sf-note--warn" style={{ marginTop: "0.75rem" }}>
                      {t("studentForm.assignClassRequired")}
                    </p>
                  )}
                </div>
              )}

              <div className="sf-note sf-note--ok">
                <h4 className="sf-block__title" style={{ color: "#065f46", marginBottom: "0.35rem" }}>{t("studentForm.reviewTitle")}</h4>
                <p style={{ margin: 0 }}>{t("studentForm.reviewDesc")}</p>
              </div>

              {[
                { title: t("studentForm.personal"), tone: "personal", fields: [
                  [t("common.name"), studentFullNameGu(form as Parameters<typeof studentFullNameGu>[0])],
                  [t("fields.aadhaar"), form.aadhaarNumber],
                  [t("fields.aadhaarName"), studentDisplayAadhaarName(form as Parameters<typeof studentDisplayAadhaarName>[0])],
                  [t("fields.motherName"), studentDisplayMotherName(form as Parameters<typeof studentDisplayMotherName>[0])],
                  [t("fields.fatherName"), studentDisplayFatherName(form as Parameters<typeof studentDisplayFatherName>[0])],
                  [t("fields.mobile"), form.mobileNumber],
                  [t("fields.category"), form.category],
                  [t("fields.dob"), form.dateOfBirth],
                  [t("fields.class"), form.classId
                    ? (classes.find((c) => c.id === form.classId)?.name ||
                      (form.standard ? `Class ${form.standard}-${form.section || ""}` : "—"))
                    : "—"],
                  [t("fields.roll"), form.rollNumber],
                  [t("fields.childUid"), form.childUid],
                  [t("fields.apaarId"), form.apaarId],
                  [t("fields.panNumber"), form.panNumber],
                ]},
                { title: t("studentForm.academic"), tone: "academic", fields: [
                  [t("fields.scheme"), form.scholarshipScheme],
                  [t("fields.course"), form.courseName],
                  [t("fields.institution"), form.institutionName],
                  [t("fields.year"), form.currentYear],
                  ["10th %", form.percentage10th],
                ]},
                { title: t("studentForm.bankSection"), tone: "bank", fields: [
                  [t("fields.bank"), form.bankName],
                  [t("fields.account"), form.accountNumber],
                  [t("fields.ifscCode"), form.ifscCode],
                  [t("fields.holder"), form.accountHolderName],
                ]},
              ].map((section) => (
                <div key={section.title} className={`sf-review sf-review--${section.tone}`}>
                  <h5 className="sf-review__title">{section.title}</h5>
                  <div className="sf-review__grid">
                    {section.fields.map(([label, value]) => (
                      <div key={label}>
                        <span className="sf-review__label">{label}: </span>
                        <span className="sf-review__value">{value || "-"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Textarea label={t("fields.notes")} value={form.notes || ""} onChange={(e) => update("notes", e.target.value)} />
            </div>
          )}

          {step === 6 && savedStudentId && (
            <div className="sf-stack">
              <div className="sf-note sf-note--info">
                <p className="sf-block__title" style={{ color: "#0f766e" }}>{t("studentForm.documentsTitle")}</p>
                <p style={{ margin: "0.35rem 0 0" }}>{t("studentForm.documentsDesc")}</p>
              </div>
              <StudentDocumentsSection studentId={savedStudentId} />
            </div>
          )}

          {step === 6 && !savedStudentId && (
            <p className="sf-note sf-note--warn">{t("studentForm.documentsSaveFirst")}</p>
          )}

          <div className="sf-nav">
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
        </div>
      </div>
        </>
      )}
    </div>
  );
}
