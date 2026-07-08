"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import { SCHOOL_STANDARDS, CLASS_SECTIONS, FINANCIAL_YEARS } from "@/lib/constants";
import { useT } from "@/i18n/locale-provider";
import { CreditCard, Printer, Settings, Loader2, Sparkles } from "lucide-react";
import type { Student, SchoolSettings, SchoolClass } from "@/generated/prisma/client";

type StudentWithClass = Student & {
  schoolClass?: Pick<SchoolClass, "id" | "name" | "standard" | "section" | "academicYear"> | null;
};

function IdCardsContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || "";

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [settings, setSettings] = useState<SchoolSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [classId, setClassId] = useState(initialClassId);
  const [standard, setStandard] = useState("");
  const [section, setSection] = useState("");
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<SchoolSettings>>({});
  const [logoPreview, setLogoPreview] = useState<string | undefined>();
  const [signaturePreview, setSignaturePreview] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/classes?academicYear=2025-26")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
    fetch("/api/school/settings")
      .then((r) => r.json())
      .then((s) => { setSettings(s); setSettingsForm(s); });
  }, []);

  const fetchCards = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ academicYear });
    if (classId) params.set("classId", classId);
    else {
      if (standard) params.set("standard", standard);
      if (section) params.set("section", section);
    }
    const res = await fetch(`/api/id-cards?${params}`);
    const data = await res.json();
    setStudents(data.students || []);
    if (data.settings) {
      setSettings(data.settings);
      setSettingsForm(data.settings);
    }
    setLoading(false);
  }, [classId, standard, section, academicYear]);

  useEffect(() => { fetchCards(); }, [fetchCards]);

  const photoUrl = (s: StudentWithClass) => {
    const path = s.idPhotoProcessedPath || s.photoPath;
    if (!path) return undefined;
    return `/api/uploads/${path}`;
  };

  const processAllPhotos = async () => {
    const withPhoto = students.filter((s) => s.photoPath && !s.idPhotoProcessedPath);
    if (withPhoto.length === 0) {
      alert(t("idCards.photosAlreadyProcessed"));
      return;
    }
    setProcessing(true);
    for (const s of withPhoto) {
      await fetch(`/api/students/${s.id}/id-photo`, { method: "POST" });
    }
    await fetchCards();
    setProcessing(false);
  };

  const saveSettings = async () => {
    const res = await fetch("/api/school/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsForm),
    });
    const s = await res.json();
    if (res.ok) {
      setSettings(s);
      setShowSettings(false);
    }
  };

  const classOptions = [
    { value: "", label: t("idCards.allClassesOption") },
    ...classes.map((c) => ({ value: c.id, label: `${c.name} (${c.academicYear})` })),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <CreditCard className="h-7 w-7 text-pink-600" />
            {t("idCards.pageTitle")}
          </h1>
          <p className="text-slate-500 mt-1">{t("idCards.pageSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowSettings(!showSettings)}>
            <Settings className="h-4 w-4" /> {t("idCards.schoolSettings")}
          </Button>
          <Button variant="outline" onClick={processAllPhotos} disabled={processing}>
            {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {t("idCards.processPhotos")}
          </Button>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> {t("idCards.printAll")}
          </Button>
        </div>
      </div>

      {showSettings && settings && (
        <Card className="print:hidden">
          <CardHeader><CardTitle>{t("idCards.settingsTitle")}</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label={t("idCards.schoolName")} value={settingsForm.schoolName || ""} onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })} />
            <Input label={t("idCards.tagline")} value={settingsForm.tagline || ""} onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })} />
            <Input label={t("common.address")} value={settingsForm.schoolAddress || ""} onChange={(e) => setSettingsForm({ ...settingsForm, schoolAddress: e.target.value })} />
            <Input label={t("common.phone")} value={settingsForm.schoolPhone || ""} onChange={(e) => setSettingsForm({ ...settingsForm, schoolPhone: e.target.value })} />
            <Input label={t("idCards.primaryColor")} type="color" value={settingsForm.idCardPrimaryColor || "#e91e8c"} onChange={(e) => setSettingsForm({ ...settingsForm, idCardPrimaryColor: e.target.value })} />
            <Input label={t("idCards.accentColor")} type="color" value={settingsForm.idCardAccentColor || "#1e3a8a"} onChange={(e) => setSettingsForm({ ...settingsForm, idCardAccentColor: e.target.value })} />

            {/* Logo upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">School Logo</label>
              <div className="flex items-center gap-3">
                {logoPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="logo" className="w-14 h-14 rounded-full object-cover border-2 border-slate-200" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setLogoPreview(URL.createObjectURL(f));
                  }}
                />
              </div>
              <p className="text-xs text-slate-400">PNG/JPG — shows as circle in header</p>
            </div>

            {/* Signature upload */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Principal Signature</label>
              <div className="flex items-center gap-3">
                {signaturePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={signaturePreview} alt="signature" className="h-10 object-contain border border-slate-200 rounded px-2 bg-white" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSignaturePreview(URL.createObjectURL(f));
                  }}
                />
              </div>
              <p className="text-xs text-slate-400">PNG with transparent background recommended</p>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button onClick={saveSettings}>{t("idCards.saveSettings")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="print:hidden">
        <CardContent className="p-4 flex flex-wrap gap-3">
          <Select label={t("fields.class")} options={classOptions} value={classId} onChange={(e) => { setClassId(e.target.value); setStandard(""); setSection(""); }} className="w-48" />
          <Select label={t("classes.standard")} options={["", ...SCHOOL_STANDARDS]} value={standard} onChange={(e) => { setStandard(e.target.value); setClassId(""); }} className="w-36" disabled={!!classId} />
          <Select label={t("classes.section")} options={["", ...CLASS_SECTIONS]} value={section} onChange={(e) => setSection(e.target.value)} className="w-28" disabled={!!classId} />
          <Select label={t("idCards.year")} options={FINANCIAL_YEARS} value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className="w-32" />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center h-48 items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
        </div>
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 print:hidden">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("idCards.noStudentsHint")}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500 print:hidden">{t("idCards.cardsReady", { count: students.length })}</p>
          <div className="id-cards-grid flex flex-wrap gap-8 justify-center print:gap-4 print:justify-start">
            {settings && students.map((s) => (
              <StudentIdCard
                key={s.id}
                student={s}
                settings={settings}
                photoUrl={photoUrl(s)}
                logoUrl={logoPreview}
                signatureUrl={signaturePreview}
              />
            ))}
          </div>
        </>
      )}

      <style jsx global>{`
        @media print {
          body { background: white !important; }
          aside, nav, .print\\:hidden { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-64 { padding-left: 0 !important; }
          .id-cards-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12mm !important;
            padding: 10mm !important;
          }
          .id-card {
            page-break-inside: avoid;
            break-inside: avoid;
            box-shadow: none !important;
            border: 1px solid #ddd;
          }
        }
      `}</style>
    </div>
  );
}

export default function IdCardsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" /></div>}>
      <IdCardsContent />
    </Suspense>
  );
}
