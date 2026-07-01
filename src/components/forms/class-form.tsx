"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GUJARAT_DISTRICTS, SCHOOL_STANDARDS, CLASS_SECTIONS, FINANCIAL_YEARS } from "@/lib/constants";
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
    if (form.standard && form.section && !initialData?.name) {
      setForm((prev) => ({
        ...prev,
        name: `Class ${form.standard}-${form.section}`,
      }));
    }
  }, [form.standard, form.section, initialData?.name]);

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

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t("classes.classSetup")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select label={t("classes.standard")} required options={SCHOOL_STANDARDS} value={form.standard || ""} onChange={(e) => update("standard", e.target.value)} />
          <Select label={t("classes.section")} required options={CLASS_SECTIONS} value={form.section || "A"} onChange={(e) => update("section", e.target.value)} />
          <Select label={t("classes.academicYear")} required options={FINANCIAL_YEARS} value={form.academicYear || "2025-26"} onChange={(e) => update("academicYear", e.target.value)} />
          <Input label={t("classes.className")} required value={form.name || ""} onChange={(e) => update("name", e.target.value)} />
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
