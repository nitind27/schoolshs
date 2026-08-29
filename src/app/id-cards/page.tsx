"use client";

import { PageLoader, Spinner } from "@/components/ui/loader";
import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import { IdCardShareLinkManager } from "@/components/id-cards/id-card-share-link-manager";
import "@/components/id-cards/id-card-print.css";
import { FINANCIAL_YEARS } from "@/lib/constants";
import { ID_CARD_BRAND } from "@/lib/id-card-brand";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { useT } from "@/i18n/locale-provider";
import { useSchoolFeatures } from "@/components/school/use-school-features";
import { ChevronDown, CreditCard, Printer, Search, Settings, Sparkles, X } from "lucide-react";
import type { Student, SchoolSettings, SchoolClass } from "@/generated/prisma/client";

type StudentWithClass = Student & {
  schoolClass?: Pick<SchoolClass, "id" | "name" | "standard" | "section" | "academicYear"> | null;
};

type SettingsPayload = SchoolSettings & {
  schoolWebsite?: string | null;
  schoolProfilePhone?: string | null;
};

const ID_CARDS_PAGE_SIZE = 6;

function studentSearchText(s: StudentWithClass) {
  return [
    s.firstName,
    s.surname,
    s.fatherName,
    s.grNumber,
    s.rollNumber != null ? String(s.rollNumber) : "",
    s.mobile,
    s.aadhaarNumber,
    s.uid,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function studentMatchesSearch(s: StudentWithClass, query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = studentSearchText(s);
  return q.split(/\s+/).every((part) => haystack.includes(part));
}

function uploadUrl(path?: string | null) {
  if (!path) return undefined;
  return `/api/uploads/${path.replace(/^uploads\//, "")}`;
}

function IdCardsContent() {
  const t = useT();
  const { letterhead } = useSchoolFeatures();
  const searchParams = useSearchParams();
  const initialClassId = searchParams.get("classId") || "";
  const initialStudentId = searchParams.get("studentId") || "";
  const initialIds = searchParams.get("ids") || "";
  const singleStudentMode = Boolean(initialStudentId || initialIds);

  const [classes, setClasses] = useState<SchoolClass[]>([]);
  const [students, setStudents] = useState<StudentWithClass[]>([]);
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "signature" | null>(null);
  const [classId, setClassId] = useState(initialClassId);
  const [academicYear, setAcademicYear] = useState("2025-26");
  const [visibleCount, setVisibleCount] = useState(ID_CARDS_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState<Partial<SettingsPayload>>({});
  const [logoPreview, setLogoPreview] = useState<string | undefined>(SCHOOL_LOGO_URL);
  const [signaturePreview, setSignaturePreview] = useState<string | undefined>();
  const diseCode = (letterhead?.udiseCode || letterhead?.code || "").trim();

  const applySettings = useCallback((s: SettingsPayload) => {
    setSettings(s);
    setSettingsForm({
      ...s,
      idCardWebsite: s.idCardWebsite || s.schoolWebsite || "",
      schoolPhone: s.schoolPhone || s.schoolProfilePhone || "",
    });
    setLogoPreview(uploadUrl(s.logoPath) || SCHOOL_LOGO_URL);
    setSignaturePreview(uploadUrl(s.signaturePath));
  }, []);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((d) => setClasses(d.classes || []));
    fetch("/api/school/settings")
      .then((r) => r.json())
      .then((s) => {
        if (s?.schoolId || s?.schoolName) applySettings(s);
      });
  }, [applySettings]);

  useEffect(() => {
    setVisibleCount(ID_CARDS_PAGE_SIZE);
  }, [classId, academicYear, search]);

  const fetchCards = useCallback(async () => {
    if (!singleStudentMode && !classId) {
      setStudents([]);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ academicYear });
      if (initialStudentId) {
        params.set("studentId", initialStudentId);
      } else if (initialIds) {
        params.set("ids", initialIds);
      } else {
        params.set("classId", classId);
      }
      const res = await fetch(`/api/id-cards?${params}`);
      const data = await res.json();
      setStudents(data.students || []);
      if (data.settings) {
        setSettings((prev) => ({ ...(prev || {}), ...data.settings } as SettingsPayload));
        setSettingsForm((prev) => ({ ...prev, ...data.settings }));
        if (data.settings.logoPath) {
          setLogoPreview(uploadUrl(data.settings.logoPath) || SCHOOL_LOGO_URL);
        }
        if (data.settings.signaturePath) {
          setSignaturePreview(uploadUrl(data.settings.signaturePath));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [classId, academicYear, initialStudentId, initialIds, singleStudentMode]);

  useEffect(() => {
    // Load / refresh ID cards when class or year filters change
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async fetch updates card list state
    void fetchCards();
  }, [fetchCards]);

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

  const uploadAsset = async (kind: "logo" | "signature", file: File) => {
    setUploading(kind);
    try {
      const fd = new FormData();
      fd.append("kind", kind);
      fd.append("file", file);
      const res = await fetch("/api/school/settings/asset", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Upload failed");
        return;
      }
      const url = data.url as string;
      if (kind === "logo") {
        setLogoPreview(url);
        setSettingsForm((f) => ({ ...f, logoPath: data.path }));
        setSettings((s) => (s ? { ...s, logoPath: data.path } : s));
      } else {
        setSignaturePreview(url);
        setSettingsForm((f) => ({ ...f, signaturePath: data.path }));
        setSettings((s) => (s ? { ...s, signaturePath: data.path } : s));
      }
    } finally {
      setUploading(null);
    }
  };

  const saveSettings = async () => {
    const res = await fetch("/api/school/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settingsForm),
    });
    const s = await res.json();
    if (res.ok) {
      applySettings(s);
      setShowSettings(false);
    } else {
      alert(s.error || "Failed to save settings");
    }
  };

  const selectedClass = classes.find((c) => c.id === classId);
  const cardWebsite =
    settingsForm.idCardWebsite ||
    settings?.idCardWebsite ||
    settings?.schoolWebsite ||
    "";

  const classOptions = [
    { value: "", label: t("idCards.selectClass") },
    ...classes.map((c) => ({ value: c.id, label: c.name })),
  ];

  const filteredStudents = useMemo(() => {
    if (!search.trim()) return students;
    return students.filter((s) => studentMatchesSearch(s, search));
  }, [students, search]);

  const visibleStudents = filteredStudents.slice(0, visibleCount);
  const hasMoreStudents = visibleCount < filteredStudents.length;
  const remainingStudents = filteredStudents.length - visibleCount;
  const canLoadCards = singleStudentMode || Boolean(classId);
  const hasSearch = search.trim().length > 0;

  return (
    <div className="space-y-6" data-ft-anchor="main">
      <div className="id-cards-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
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
          <Button
            variant="outline"
            onClick={processAllPhotos}
            disabled={processing || !canLoadCards || students.length === 0}
          >
            {processing ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
            {t("idCards.processPhotos")}
          </Button>
          <Button
            onClick={() => window.print()}
            disabled={!canLoadCards || students.length === 0}
          >
            <Printer className="h-4 w-4" />
            {singleStudentMode ? t("idCards.printCard") : t("idCards.printAll")}
          </Button>
        </div>
      </div>

      {singleStudentMode && (
        <Card className="border-pink-200 bg-pink-50/70 print:hidden">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold text-pink-900">{t("idCards.singleStudentTitle")}</p>
              <p className="text-sm text-pink-800/80">
                {students[0]
                  ? t("idCards.singleStudentDesc", {
                      name: `${students[0].firstName} ${students[0].surname}`.trim(),
                    })
                  : t("idCards.singleStudentLoading")}
              </p>
            </div>
            <a href="/id-cards" className="text-sm font-medium text-pink-800 underline underline-offset-2">
              {t("idCards.viewAllCards")}
            </a>
          </CardContent>
        </Card>
      )}

      {showSettings && settings && (
        <Card className="print:hidden">
          <CardHeader>
            <CardTitle>{t("idCards.settingsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label={t("idCards.schoolName")}
              value={settingsForm.schoolName || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, schoolName: e.target.value })}
            />
            <Input
              label={t("idCards.tagline")}
              value={settingsForm.tagline || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, tagline: e.target.value })}
            />
            <Input
              label={t("common.address")}
              value={settingsForm.schoolAddress || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, schoolAddress: e.target.value })}
            />
            <Input
              label={t("common.phone")}
              value={settingsForm.schoolPhone || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, schoolPhone: e.target.value })}
              placeholder="02626-220444"
            />
            <Input
              label="Website (footer + QR base URL)"
              value={settingsForm.idCardWebsite || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, idCardWebsite: e.target.value })}
              placeholder="https://www.savjanhighschool.org"
            />
            <p className="md:col-span-2 -mt-2 text-xs text-slate-500">
              QR scan opens <code className="rounded bg-slate-100 px-1">your-website/m/id/&lt;studentId&gt;</code> — no login.
              Domain must point to this portal (or proxy that path).
            </p>            <Input
              label={t("idCards.year")}
              value={settingsForm.academicYear || ""}
              onChange={(e) => setSettingsForm({ ...settingsForm, academicYear: e.target.value })}
            />
            <Input
              label={t("idCards.primaryColor")}
              type="color"
              value={settingsForm.idCardPrimaryColor || ID_CARD_BRAND.primary}
              onChange={(e) => setSettingsForm({ ...settingsForm, idCardPrimaryColor: e.target.value })}
            />
            <Input
              label={t("idCards.accentColor")}
              type="color"
              value={settingsForm.idCardAccentColor || ID_CARD_BRAND.accent}
              onChange={(e) => setSettingsForm({ ...settingsForm, idCardAccentColor: e.target.value })}
            />

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">School Logo</label>
              <div className="flex items-center gap-3">
                {(logoPreview || SCHOOL_LOGO_URL) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={logoPreview || SCHOOL_LOGO_URL}
                    alt="logo"
                    className="w-14 h-14 rounded-full object-cover border-2 border-slate-200"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  disabled={uploading === "logo"}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAsset("logo", f);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {uploading === "logo" ? "Uploading…" : "Saved to school settings automatically"}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">Principal Signature</label>
              <div className="flex items-center gap-3">
                {signaturePreview && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={signaturePreview}
                    alt="signature"
                    className="h-10 object-contain border border-slate-200 rounded px-2 bg-white"
                  />
                )}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading === "signature"}
                  className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadAsset("signature", f);
                    e.target.value = "";
                  }}
                />
              </div>
              <p className="text-xs text-slate-400">
                {uploading === "signature"
                  ? "Uploading…"
                  : "PNG with transparent background recommended — saved automatically"}
              </p>
            </div>

            <div className="md:col-span-2 flex justify-end">
              <Button onClick={saveSettings}>{t("idCards.saveSettings")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!singleStudentMode && (
        <Card className="id-cards-filters print:hidden">
          <CardContent className="p-4 flex flex-wrap items-end gap-3">
            <Select
              label={t("fields.class")}
              options={classOptions}
              value={classId}
              onChange={(e) => {
                setClassId(e.target.value);
                setSearch("");
              }}
              className="w-56"
            />
            <Select
              label={t("idCards.year")}
              options={FINANCIAL_YEARS}
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-32"
            />
            <div className="min-w-[220px] flex-1">
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                {t("common.search")}
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  disabled={!classId}
                  placeholder={t("idCards.searchPlaceholder")}
                  className="h-10 w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                />
                {hasSearch && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    aria-label={t("common.clear")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!singleStudentMode && classId && (
        <IdCardShareLinkManager
          classId={classId}
          standard={selectedClass?.standard || ""}
          section={selectedClass?.section || ""}
          academicYear={academicYear}
          classes={classes}
        />
      )}
      {!canLoadCards ? (
        <Card className="print:hidden">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-pink-50">
              <CreditCard className="h-8 w-8 text-pink-500/70" />
            </div>
            <p className="text-lg font-semibold text-slate-800">{t("idCards.selectClassTitle")}</p>
            <p className="mt-2 text-sm text-slate-500">{t("idCards.selectClassHint")}</p>
          </CardContent>
        </Card>
      ) : loading ? (
        <PageLoader />
      ) : students.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-500 print:hidden">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>{t("idCards.noStudentsHint")}</p>
          </CardContent>
        </Card>
      ) : filteredStudents.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center print:hidden">
            <Search className="mx-auto mb-3 h-12 w-12 text-slate-300" />
            <p className="font-medium text-slate-700">{t("idCards.noSearchResults")}</p>
            <p className="mt-2 text-sm text-slate-500">
              {t("idCards.noSearchResultsHint", { query: search.trim() })}
            </p>
            <Button variant="outline" className="mt-4" onClick={() => setSearch("")}>
              {t("common.clear")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="id-cards-preview-note flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-slate-700">
                {selectedClass?.name || t("idCards.singleStudentTitle")}
              </p>
              <p className="text-sm text-slate-600">
                {hasSearch
                  ? t("idCards.showingSearchCount", {
                      shown: visibleStudents.length,
                      total: filteredStudents.length,
                      query: search.trim(),
                    })
                  : t("idCards.showingCount", {
                      shown: visibleStudents.length,
                      total: filteredStudents.length,
                    })}
              </p>
            </div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {t("idCards.sizeHint")}
            </p>
          </div>

          <div className="id-cards-preview-grid print:hidden">
            {settings &&
              visibleStudents.map((s, index) => {
                const studentName = [s.firstName, s.surname].filter(Boolean).join(" ").trim();
                return (
                  <div key={s.id} className="id-cards-stage">
                    <div className="id-cards-stage-inner">
                      <div className="id-card-preview-scale">
                        <StudentIdCard
                          student={s}
                          settings={settings}
                          photoUrl={photoUrl(s)}
                          logoUrl={logoPreview || SCHOOL_LOGO_URL}
                          signatureUrl={signaturePreview}
                          website={cardWebsite}
                          diseCode={diseCode}
                          academicYear={academicYear}
                        />
                      </div>
                    </div>
                    <p className="id-cards-stage-label">{t("idCards.frontOnly")}</p>
                    <p className="id-cards-stage-name" title={studentName}>
                      {studentName || s.grNumber || `#${index + 1}`}
                    </p>
                  </div>
                );
              })}
          </div>

          {hasMoreStudents && (
            <div className="flex flex-col items-center gap-2 print:hidden">
              <Button
                variant="outline"
                size="lg"
                className="min-w-[220px] border-pink-200 bg-white text-pink-800 hover:bg-pink-50"
                onClick={() =>
                  setVisibleCount((n) => Math.min(n + ID_CARDS_PAGE_SIZE, filteredStudents.length))
                }
              >
                <ChevronDown className="h-4 w-4" />
                {t("idCards.seeMore", {
                  count: Math.min(ID_CARDS_PAGE_SIZE, remainingStudents),
                })}
              </Button>
              <p className="text-xs text-slate-500">
                {t("idCards.remainingCount", { count: remainingStudents })}
              </p>
            </div>
          )}

          <div className="hidden print:block id-card-print-bundle">
            {settings &&
              filteredStudents.map((s, index) => (
                <div key={`print-${s.id}`} className="id-card-print-sheet">
                  <div className="id-card-print-inner">
                    <StudentIdCard
                      student={s}
                      settings={settings}
                      photoUrl={photoUrl(s)}
                      logoUrl={logoPreview || SCHOOL_LOGO_URL}
                      signatureUrl={signaturePreview}
                      website={cardWebsite}
                      diseCode={diseCode}
                      academicYear={academicYear}
                      className="id-card-print-size"
                    />
                    <p className="id-card-print-label print:hidden text-xs text-slate-400 mt-2 text-center">
                      {index + 1} / {filteredStudents.length}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function IdCardsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <IdCardsContent />
    </Suspense>
  );
}
