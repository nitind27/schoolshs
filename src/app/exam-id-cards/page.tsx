"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { PageLoader, Spinner } from "@/components/ui/loader";
import {
  ExamStaffIdCard,
  type ExamStaffCardMeta,
  type ExamStaffCardPerson,
  type ExamStaffCardSchool,
} from "@/components/id-cards/exam-staff-id-card";
import "@/components/id-cards/exam-id-card-print.css";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import { useT } from "@/i18n/locale-provider";
import {
  BadgeCheck,
  CreditCard,
  Printer,
  Search,
  Users,
} from "lucide-react";

type SettingsLite = {
  schoolName?: string | null;
  schoolAddress?: string | null;
  schoolPhone?: string | null;
  tagline?: string | null;
  academicYear?: string | null;
  logoPath?: string | null;
};

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export default function ExamIdCardsPage() {
  const t = useT();
  const [staff, setStaff] = useState<ExamStaffCardPerson[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<SettingsLite | null>(null);
  const [school, setSchool] = useState<ExamStaffCardSchool>(null);
  const [designations, setDesignations] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [designation, setDesignation] = useState("");
  const [department, setDepartment] = useState("");
  const [q, setQ] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const qRef = useRef(q);
  qRef.current = q;

  const [meta, setMeta] = useState<ExamStaffCardMeta>({
    examTitle: "Annual Examination",
    examSession: "All Classes",
    academicYear: "2025-26",
    roleLabel: "EXAMINER / INVIGILATOR",
    validFrom: "",
    validTo: "",
  });
  const [cardsPerPage, setCardsPerPage] = useState<2 | 4 | 6 | 8>(6);
  const [showCutLines, setShowCutLines] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const p = new URLSearchParams();
      if (designation) p.set("designation", designation);
      if (department) p.set("department", department);
      const search = qRef.current.trim();
      if (search) p.set("q", search);
      if (!activeOnly) p.set("active", "0");
      const res = await fetch(`/api/exam-id-cards?${p}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setStaff(data.staff || []);
      setSettings(data.settings || null);
      setSchool(data.school || null);
      setDesignations(data.filters?.designations || []);
      setDepartments(data.filters?.departments || []);
      setSelected(new Set((data.staff || []).map((s: ExamStaffCardPerson) => s.id)));
      if (data.settings?.academicYear) {
        setMeta((m) => ({
          ...m,
          academicYear: data.settings.academicYear || m.academicYear,
        }));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setStaff([]);
    } finally {
      setLoading(false);
    }
  }, [designation, department, activeOnly]);

  useEffect(() => {
    void load();
  }, [load]);

  const logoUrl = settings?.logoPath
    ? `/api/uploads/${settings.logoPath}`
    : SCHOOL_LOGO_URL;

  const selectedStaff = useMemo(
    () => staff.filter((s) => selected.has(s.id)),
    [staff, selected],
  );

  const printPages = useMemo(
    () => chunk(selectedStaff, cardsPerPage),
    [selectedStaff, cardsPerPage],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(staff.map((s) => s.id)));
  const clearAll = () => setSelected(new Set());

  const photoUrl = (s: ExamStaffCardPerson) =>
    s.photoPath ? `/api/uploads/${s.photoPath}` : undefined;

  return (
    <PageShell
      title={t("examIdCards.title")}
      subtitle={t("examIdCards.subtitle")}
      icon={<BadgeCheck className="h-6 w-6" />}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("examIdCards.title") },
      ]}
      actions={
        <div className="exam-id-toolbar flex flex-wrap gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            onClick={selectAll}
            disabled={!staff.length}
          >
            {t("examIdCards.selectAll")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAll}
            disabled={!selected.size}
          >
            {t("examIdCards.clear")}
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => window.print()}
            disabled={!selectedStaff.length}
          >
            <Printer className="h-4 w-4" />
            {t("examIdCards.printSelected", { count: String(selectedStaff.length) })}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="exam-id-filters print:hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CreditCard className="h-4 w-4 text-amber-700" />
            {t("examIdCards.examDetails")}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input
              label={t("examIdCards.examTitle")}
              value={meta.examTitle}
              onChange={(e) => setMeta({ ...meta, examTitle: e.target.value })}
              placeholder="Annual / Mid-Term Examination"
            />
            <Input
              label={t("examIdCards.examSession")}
              value={meta.examSession || ""}
              onChange={(e) => setMeta({ ...meta, examSession: e.target.value })}
              placeholder="All Classes / Std 9-10"
            />
            <Input
              label={t("examIdCards.roleLabel")}
              value={meta.roleLabel || ""}
              onChange={(e) => setMeta({ ...meta, roleLabel: e.target.value })}
            />
            <Input
              label={t("examIdCards.academicYear")}
              value={meta.academicYear || ""}
              onChange={(e) =>
                setMeta({ ...meta, academicYear: e.target.value })
              }
            />
            <Input
              label={t("examIdCards.validFrom")}
              type="date"
              value={meta.validFrom || ""}
              onChange={(e) => setMeta({ ...meta, validFrom: e.target.value })}
            />
            <Input
              label={t("examIdCards.validTo")}
              type="date"
              value={meta.validTo || ""}
              onChange={(e) => setMeta({ ...meta, validTo: e.target.value })}
            />
          </div>

          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select
              label={t("examIdCards.filterDesignation")}
              value={designation}
              emptyLabel={t("common.all")}
              onChange={(e) => setDesignation(e.target.value)}
              options={designations.map((d) => ({ value: d, label: d }))}
            />
            <Select
              label={t("examIdCards.filterDepartment")}
              value={department}
              emptyLabel={t("common.all")}
              onChange={(e) => setDepartment(e.target.value)}
              options={departments.map((d) => ({ value: d, label: d }))}
            />
            <Input
              label={t("examIdCards.search")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void load();
              }}
              placeholder={t("examIdCards.searchPlaceholder")}
            />
            <div className="flex items-end gap-2">
              <label className="flex h-10 flex-1 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={activeOnly}
                  onChange={(e) => setActiveOnly(e.target.checked)}
                />
                {t("examIdCards.activeOnly")}
              </label>
              <Button
                variant="outline"
                className="h-10 gap-1"
                onClick={() => void load()}
              >
                <Search className="h-4 w-4" />
                {t("common.refresh")}
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 border-t border-dashed border-amber-200/80 pt-4 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              label={t("examIdCards.printLayout")}
              value={String(cardsPerPage)}
              hideEmptyOption
              onChange={(e) => {
                const v = Number(e.target.value);
                setCardsPerPage(
                  v === 2 || v === 4 || v === 6 || v === 8 ? v : 6,
                );
              }}
              options={[
                { value: "6", label: t("examIdCards.layout6") },
                { value: "8", label: t("examIdCards.layout8") },
                { value: "4", label: t("examIdCards.layout4") },
                { value: "2", label: t("examIdCards.layout2") },
              ]}
            />
            <label className="flex h-10 items-center gap-2 self-end rounded-xl border border-slate-200 bg-amber-50/60 px-3 text-sm font-medium text-slate-800">
              <input
                type="checkbox"
                checked={showCutLines}
                onChange={(e) => setShowCutLines(e.target.checked)}
              />
              {t("examIdCards.showCutLines")}
            </label>
            <p className="self-end text-xs leading-snug text-slate-500 sm:col-span-2 lg:col-span-1">
              {t("examIdCards.cutHint")}
            </p>
          </div>
        </div>

        {error && (
          <div className="print:hidden rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="exam-id-preview-note print:hidden text-xs text-slate-500">
          {t("examIdCards.previewHint")}
        </p>

        {loading ? (
          <PageLoader />
        ) : staff.length === 0 ? (
          <div className="print:hidden flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-slate-500">
            <Users className="mb-2 h-10 w-10 opacity-40" />
            <p className="font-medium">{t("examIdCards.empty")}</p>
            <p className="mt-1 text-sm">{t("examIdCards.emptyHint")}</p>
          </div>
        ) : (
          <>
            {/* Screen selection + preview */}
            <div className="print:hidden space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                {staff.map((s) => {
                  const checked = selected.has(s.id);
                  return (
                    <div
                      key={s.id}
                      className={`rounded-2xl border bg-white p-3 shadow-sm transition ${
                        checked
                          ? "border-amber-300 ring-2 ring-amber-100"
                          : "border-slate-200"
                      }`}
                    >
                      <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-800">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(s.id)}
                        />
                        {[s.firstName, s.lastName].filter(Boolean).join(" ")}
                        <span className="font-normal text-slate-500">
                          · {s.designation}
                        </span>
                      </label>
                      <div className="exam-id-preview-wrap overflow-x-auto pb-1">
                        <div
                          className="exam-id-preview-scale"
                          style={{
                            transform: "scale(0.92)",
                            marginBottom: "-4mm",
                          }}
                        >
                          <ExamStaffIdCard
                            staff={s}
                            school={school}
                            settings={settings}
                            meta={meta}
                            photoUrl={photoUrl(s)}
                            logoUrl={logoUrl}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Print bundle — flex A4 sheets with cut guides */}
            <div
              id="exam-id-print-root"
              className="exam-id-print-bundle"
              data-cut-lines={showCutLines ? "1" : "0"}
              aria-hidden
            >
              {printPages.map((page, pi) => (
                <div
                  key={pi}
                  className="exam-id-print-page"
                  data-layout={String(cardsPerPage)}
                >
                  {showCutLines ? (
                    <p className="exam-id-cut-hint">{t("examIdCards.cutHint")}</p>
                  ) : null}
                  <div className="exam-id-print-grid">
                    {page.map((s) => (
                      <div key={s.id} className="exam-id-cut-slot">
                        <div className="exam-id-cut-marks" aria-hidden>
                          <span className="tl" />
                          <span className="tr" />
                          <span className="bl" />
                          <span className="br" />
                        </div>
                        <div className="exam-id-cut-slot__card">
                          <ExamStaffIdCard
                            staff={s}
                            school={school}
                            settings={settings}
                            meta={meta}
                            photoUrl={photoUrl(s)}
                            logoUrl={logoUrl}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {!loading && staff.length > 0 && (
          <div className="print:hidden flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span>
              {t("examIdCards.summary", {
                total: String(staff.length),
                selected: String(selectedStaff.length),
              })}
            </span>
            <Button
              onClick={() => window.print()}
              disabled={!selectedStaff.length}
              className="gap-1.5"
            >
              {loading ? <Spinner size="sm" /> : <Printer className="h-4 w-4" />}
              {t("examIdCards.printSelected", {
                count: String(selectedStaff.length),
              })}
            </Button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
