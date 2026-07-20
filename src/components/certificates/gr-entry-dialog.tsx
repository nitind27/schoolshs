"use client";

import { useEffect, useState } from "react";
import { InfoModal } from "@/components/ui/info-modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { useT } from "@/i18n/locale-provider";
import { recomputeDobPreview, type GeneralRegisterRow } from "@/lib/certificates/general-register";
import { fromDateInputValue, toDateInputValue } from "@/lib/certificates/gujarati-date";
import { GrStudentPickerModal, type GrPickedStudent } from "@/components/certificates/gr-student-picker-modal";
import { CLASS_SECTIONS } from "@/lib/constants";
import { Save, Users } from "lucide-react";

type StudentPick = GrPickedStudent;

type FormState = {
  id?: string;
  studentId?: string;
  grNumber: string;
  surname: string;
  firstName: string;
  fatherName: string;
  motherName: string;
  religionCaste: string;
  birthPlaceText: string;
  dateOfBirth: string;
  dobWordsGu: string;
  childUidDigits: string;
  lastSchool: string;
  udiseDigits: string;
  admissionDate: string;
  feeStatus: string;
  standard: string;
  section: string;
  progress: string;
  conduct: string;
  leavingDate: string;
  leavingStdClass: string;
  lcIssueDate: string;
  remarks: string;
};

const EMPTY: FormState = {
  grNumber: "",
  surname: "",
  firstName: "",
  fatherName: "",
  motherName: "",
  religionCaste: "",
  birthPlaceText: "",
  dateOfBirth: "",
  dobWordsGu: "",
  childUidDigits: "",
  lastSchool: "",
  udiseDigits: "",
  admissionDate: "",
  feeStatus: "ફી ભરીને",
  standard: "",
  section: "",
  progress: "",
  conduct: "સારી",
  leavingDate: "",
  leavingStdClass: "",
  lcIssueDate: "",
  remarks: "",
};

function rowToForm(row?: GeneralRegisterRow | null): FormState {
  if (!row) return { ...EMPTY };
  return {
    id: row.id,
    studentId: row.studentId,
    grNumber: row.grNumber,
    surname: row.surname,
    firstName: row.firstName,
    fatherName: row.fatherName,
    motherName: row.motherName,
    religionCaste: row.religionCaste,
    birthPlaceText: row.birthPlaceLines.join("\n"),
    dateOfBirth: row.dateOfBirth,
    dobWordsGu: row.dobWordsGu,
    childUidDigits: row.childUidDigits,
    lastSchool: row.lastSchool,
    udiseDigits: row.udiseDigits,
    admissionDate: row.admissionDate,
    feeStatus: row.feeStatus || "ફી ભરીને",
    standard: row.standard,
    section: row.section,
    progress: row.progress,
    conduct: row.conduct || "સારી",
    leavingDate: row.leavingDate,
    leavingStdClass: row.leavingStdClass,
    lcIssueDate: row.lcIssueDate,
    remarks: row.remarks,
  };
}

export function GrEntryDialog({
  open,
  onClose,
  onSaved,
  academicYear,
  initialRow,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  academicYear: string;
  initialRow?: GeneralRegisterRow | null;
}) {
  const t = useT();
  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  const [pickedStudent, setPickedStudent] = useState<StudentPick | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadingPrefill, setLoadingPrefill] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(rowToForm(initialRow));
      if (initialRow?.studentId) {
        setPickedStudent({
          id: initialRow.studentId,
          name: [initialRow.firstName, initialRow.surname].filter(Boolean).join(" "),
          grNumber: initialRow.grNumber,
          standard: initialRow.standard,
          section: initialRow.section,
        });
      } else {
        setPickedStudent(null);
      }
    }
  }, [open, initialRow]);

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));

  const handleStudentPick = (student: StudentPick) => {
    setPickedStudent(student);
    loadFromStudent(student.id);
  };

  const clearStudentPick = () => {
    setPickedStudent(null);
    setForm((f) => ({ ...f, studentId: undefined }));
  };

  const dobPreview = form.dateOfBirth
    ? recomputeDobPreview(form.dateOfBirth, form.dobWordsGu)
    : null;

  const loadFromStudent = async (studentId: string) => {
    if (!studentId) return;
    setLoadingPrefill(true);
    try {
      const res = await fetch(
        `/api/general-register?prefillStudentId=${studentId}&academicYear=${encodeURIComponent(academicYear)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      const p = data.prefill;
      setForm({
        ...EMPTY,
        id: form.id,
        studentId: p.studentId,
        grNumber: p.grNumber || "",
        surname: p.surname || "",
        firstName: p.firstName || "",
        fatherName: p.fatherName || "",
        motherName: p.motherName || "",
        religionCaste: p.religionCaste || "",
        birthPlaceText: (p.birthPlaceLines || []).join("\n"),
        dateOfBirth: p.dateOfBirth || "",
        dobWordsGu: p.dobWordsGu || "",
        childUidDigits: p.childUidDigits || "",
        lastSchool: p.lastSchool || "",
        udiseDigits: p.udiseDigits || "",
        admissionDate: p.admissionDate || "",
        feeStatus: p.feeStatus || "ફી ભરીને",
        standard: p.standard || "",
        section: p.section || "",
        progress: p.progress || "",
        conduct: p.conduct || "સારી",
        leavingDate: p.leavingDate || "",
        leavingStdClass: p.leavingStdClass || "",
        lcIssueDate: p.lcIssueDate || "",
        remarks: p.remarks || "",
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to load student");
    } finally {
      setLoadingPrefill(false);
    }
  };

  const handleDobChange = (isoDate: string) => {
    const dob = fromDateInputValue(isoDate);
    const preview = recomputeDobPreview(dob);
    set({
      dateOfBirth: dob,
      dobWordsGu: preview.suggestedWordsGu,
    });
  };

  const handleSave = async () => {
    if (!form.grNumber.trim()) {
      alert(t("certificates.grRegNoRequired"));
      return;
    }
    setSaving(true);
    try {
      const birthPlaceLines = form.birthPlaceText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        ...form,
        birthPlaceLines,
        academicYear,
      };

      const res = await fetch("/api/general-register", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form.id ? { id: form.id, ...payload } : payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      onSaved();
      onClose();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <InfoModal
      isOpen={open}
      onClose={onClose}
      title={form.id ? t("certificates.grEditEntry") : t("certificates.grAddEntry")}
    >
      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
          <label className="block text-sm font-medium text-slate-700">{t("certificates.grPickStudent")}</label>
          {pickedStudent ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <Users className="h-4 w-4 text-blue-600 shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-sm text-slate-900 truncate">{pickedStudent.name}</p>
                  <p className="text-xs text-slate-500">
                    {pickedStudent.grNumber ? `GR ${pickedStudent.grNumber} · ` : ""}
                    Std {pickedStudent.standard || "-"}-{pickedStudent.section || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={loadingPrefill}
                  onClick={() => setPickerOpen(true)}
                >
                  {loadingPrefill ? t("common.loading") : t("certificates.grChangeStudent")}
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearStudentPick}>
                  {t("certificates.grManualEntry")}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" onClick={() => setPickerOpen(true)} className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {t("certificates.grSelectStudentBtn")}
              </Button>
              <span className="text-xs text-slate-500">{t("certificates.grManualEntry")}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Input
            label={t("certificates.grFilterRegNo")}
            value={form.grNumber}
            onChange={(e) => set({ grNumber: e.target.value })}
            required
          />
          <Input label={t("certificates.grSurname")} value={form.surname} onChange={(e) => set({ surname: e.target.value })} />
          <Input label={t("certificates.grFirstName")} value={form.firstName} onChange={(e) => set({ firstName: e.target.value })} />
          <Input label={t("certificates.grFather")} value={form.fatherName} onChange={(e) => set({ fatherName: e.target.value })} />
          <Input label={t("certificates.grMother")} value={form.motherName} onChange={(e) => set({ motherName: e.target.value })} />
          <Input
            label={t("certificates.grReligion")}
            value={form.religionCaste}
            onChange={(e) => set({ religionCaste: e.target.value })}
          />
          <Input label={t("certificates.grStd")} value={form.standard} onChange={(e) => set({ standard: e.target.value })} />
          <Select
            label={t("certificates.section")}
            emptyLabel="—"
            options={CLASS_SECTIONS.map((s) => ({ value: s, label: `Div ${s}` }))}
            value={form.section}
            onChange={(e) => set({ section: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("certificates.grBirthPlace")}</label>
          <textarea
            className="w-full min-h-[72px] rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.birthPlaceText}
            onChange={(e) => set({ birthPlaceText: e.target.value })}
            placeholder={"સોનગઢ\nતા. સોનગઢ\nજિ. તાપી"}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("certificates.grDob")}</label>
            <input
              type="date"
              className="flex h-10 w-full rounded-xl border border-slate-300 px-3 text-sm"
              value={toDateInputValue(form.dateOfBirth)}
              onChange={(e) => handleDobChange(e.target.value)}
            />
            {dobPreview && (
              <div className="mt-2 rounded-lg bg-amber-50 border border-amber-100 p-3 text-sm space-y-1">
                <p>
                  <span className="text-slate-500">{t("certificates.grDobFigures")}: </span>
                  <strong>{dobPreview.dobFigures}</strong>
                  <span className="mx-2 text-slate-300">|</span>
                  <strong className="text-red-800">{dobPreview.dobFiguresGu}</strong>
                </p>
                <p>
                  <span className="text-slate-500">{t("certificates.grDobWords")}: </span>
                  <strong>{dobPreview.dobWordsGu}</strong>
                </p>
              </div>
            )}
          </div>
          <Input
            label={t("certificates.grDobWordsEdit")}
            value={form.dobWordsGu}
            onChange={(e) => set({ dobWordsGu: e.target.value })}
            placeholder={dobPreview?.suggestedWordsGu}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Input
            label={t("certificates.grChildUid")}
            value={form.childUidDigits}
            onChange={(e) => set({ childUidDigits: e.target.value.replace(/\D/g, "").slice(0, 18) })}
          />
          <Input label={t("certificates.grLastSchool")} value={form.lastSchool} onChange={(e) => set({ lastSchool: e.target.value })} />
          <Input
            label={t("certificates.grUdise")}
            value={form.udiseDigits}
            onChange={(e) => set({ udiseDigits: e.target.value.replace(/\D/g, "").slice(0, 11) })}
          />
          <Input
            label={t("certificates.grAdmissionDate")}
            type="date"
            value={toDateInputValue(form.admissionDate)}
            onChange={(e) => set({ admissionDate: fromDateInputValue(e.target.value) })}
          />
          <Select
            label={t("certificates.grFee")}
            options={[
              { value: "ફી ભરીને", label: "ફી ભરીને" },
              { value: "માફી", label: "માફી" },
            ]}
            value={form.feeStatus}
            onChange={(e) => set({ feeStatus: e.target.value })}
          />
          <Input label={t("certificates.grProgress")} value={form.progress} onChange={(e) => set({ progress: e.target.value })} />
          <Input label={t("certificates.grConduct")} value={form.conduct} onChange={(e) => set({ conduct: e.target.value })} />
          <Input
            label={t("certificates.grLeavingDate")}
            type="date"
            value={toDateInputValue(form.leavingDate)}
            onChange={(e) => set({ leavingDate: fromDateInputValue(e.target.value) })}
          />
          <Input
            label={t("certificates.grLeavingStd")}
            value={form.leavingStdClass}
            onChange={(e) => set({ leavingStdClass: e.target.value })}
          />
          <Input
            label={t("certificates.grLcDate")}
            type="date"
            value={toDateInputValue(form.lcIssueDate)}
            onChange={(e) => set({ lcIssueDate: fromDateInputValue(e.target.value) })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">{t("certificates.grRemarks")}</label>
          <textarea
            className="w-full min-h-[60px] rounded-xl border border-slate-300 px-3 py-2 text-sm"
            value={form.remarks}
            onChange={(e) => set({ remarks: e.target.value })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="gap-1.5">
            <Save className="h-3.5 w-3.5" />
            {saving ? t("common.saving") : t("certificates.grSaveEntry")}
          </Button>
        </div>
      </div>

      <GrStudentPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        academicYear={academicYear}
        onSelect={handleStudentPick}
      />
    </InfoModal>
  );
}
