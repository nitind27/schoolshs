"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GUJARAT_DISTRICTS, SCHOOL_STANDARDS, FINANCIAL_YEARS, CLASS_STREAMS } from "@/lib/constants";
import { Save } from "lucide-react";
import type { SchoolClass, Staff } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

type ClassFormData = Partial<SchoolClass>;

interface ClassFormProps {
  initialData?: ClassFormData;
  onSubmit: (data: ClassFormData) => Promise<void>;
  submitLabel?: string;
}

export function ClassForm({ initialData = {}, onSubmit, submitLabel }: ClassFormProps) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [existingClasses, setExistingClasses] = useState<SchoolClass[]>([]);
  const [stream, setStream] = useState("");
  const [form, setForm] = useState<ClassFormData>({
    academicYear: "2025-26",
    section: "A",
    ...initialData,
  });

  const resolvedSubmitLabel = submitLabel ?? t("classes.saveClass");

  useEffect(() => {
    fetch("/api/staff?active=true")
      .then((r) => r.json())
      .then((d) => setStaff(d.staff || []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (form.academicYear) params.set("academicYear", String(form.academicYear));
    fetch(`/api/classes?${params}`)
      .then((r) => r.json())
      .then((d) => setExistingClasses(d.classes || []))
      .catch(() => setExistingClasses([]));
  }, [form.academicYear]);

  useEffect(() => {
    if (!form.standard || !form.section || initialData?.name) return;
    const streamPart = ["11", "12"].includes(form.standard) && stream ? ` ${stream}` : "";
    setForm((prev) => ({
      ...prev,
      name: `Class ${form.standard}${streamPart}-${form.section}`,
    }));
  }, [form.standard, form.section, stream, initialData?.name]);

  const update = (field: string, value: unknown) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  const teacherOptions = [
    { value: "", label: t("classes.noClassTeacher") },
    ...staff
      .filter((s) => s.designation === "Teacher" || s.designation === "Head Teacher" || s.designation === "Principal")
      .map((s) => ({
        value: s.id,
        label: `${s.firstName} ${s.lastName} (${s.designation})`,
      })),
  ];

  const sectionOptions = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const classAlreadyExists = existingClasses.some(
    (c) =>
      c.standard === String(form.standard || "").trim() &&
      c.section === String(form.section || "").trim().toUpperCase() &&
      c.id !== initialData.id
  );

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("classes.classSetup")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t("classes.standard")} required options={SCHOOL_STANDARDS} value={form.standard || ""} onChange={(e) => update("standard", e.target.value)} />
          <Select label={t("classes.section")} required options={sectionOptions} value={form.section || "A"} onChange={(e) => update("section", e.target.value)} />
          {["11", "12"].includes(String(form.standard || "")) && (
            <Select
              label="Stream"
              emptyLabel="General"
              options={CLASS_STREAMS}
              value={stream}
              onChange={(e) => setStream(e.target.value)}
            />
          )}
          <Select label={t("classes.academicYear")} required options={FINANCIAL_YEARS} value={form.academicYear || "2025-26"} onChange={(e) => update("academicYear", e.target.value)} />
          <Input label={t("classes.className")} required value={form.name || ""} onChange={(e) => update("name", e.target.value)} />
          {classAlreadyExists && (
            <div className="md:col-span-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              Class {form.standard}-{form.section} already exists for {form.academicYear}. Please choose another section.
            </div>
          )}
          <Input label={t("classes.institutionName")} value={form.institutionName || ""} onChange={(e) => update("institutionName", e.target.value)} />
          <Select label={t("common.district")} options={GUJARAT_DISTRICTS} value={form.institutionDistrict || ""} onChange={(e) => update("institutionDistrict", e.target.value)} />
          <div className="md:col-span-2">
            <Select
              label={t("classes.classTeacher")}
              options={teacherOptions}
              value={form.classTeacherId || ""}
              onChange={(e) => update("classTeacherId", e.target.value || null)}
            />
          </div>
          <div className="md:col-span-2 flex justify-end pt-4">
            <Button type="submit" variant="success" disabled={loading || classAlreadyExists}>
              <Save className="h-4 w-4" />
              {loading ? t("common.saving") : resolvedSubmitLabel}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
