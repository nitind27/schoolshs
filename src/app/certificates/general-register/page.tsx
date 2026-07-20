"use client";

import { useState, useCallback, useEffect, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { CertificatePrintShell } from "@/components/certificates/certificate-print-shell";
import { CertificateFilters } from "@/components/certificates/certificate-filters";
import { GeneralRegisterView, GeneralRegisterPrintBundle } from "@/components/certificates/general-register";
import { GrToolbar, type GrSearchFilters } from "@/components/certificates/gr-toolbar";
import { GrEntryDialog } from "@/components/certificates/gr-entry-dialog";
import { Button } from "@/components/ui/button";
import type { GeneralRegisterRow } from "@/lib/certificates/general-register";
import {
  filterGrRows,
  dedupeGrRows,
  sliceGrPage,
  grPageCount,
  GR_STUDENTS_PER_PAGE,
} from "@/lib/certificates/general-register";
import { useT } from "@/i18n/locale-provider";

const GR_ZOOM_MIN = 0.85;
const GR_ZOOM_MAX = 1.35;
const GR_ZOOM_STEP = 0.1;

function filtersFromParams(searchParams: URLSearchParams) {
  return {
    classId: searchParams.get("classId") || "",
    standard: searchParams.get("standard") || "",
    section: searchParams.get("section") || "",
    academicYear: searchParams.get("academicYear") || "2025-26",
    studentId: "",
    month: "",
    year: "",
  };
}

function GeneralRegisterContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const [filters, setFilters] = useState(() => filtersFromParams(searchParams));
  const [search, setSearch] = useState<GrSearchFilters>({ query: "", dob: "" });
  const [rows, setRows] = useState<GeneralRegisterRow[]>([]);
  const [displayRows, setDisplayRows] = useState<GeneralRegisterRow[]>([]);
  const [meta, setMeta] = useState({
    schoolName: "",
    academicYear: "",
    classLabel: "",
    studentCount: 0,
  });
  const [loaded, setLoaded] = useState(false);
  const [importing, setImporting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editRow, setEditRow] = useState<GeneralRegisterRow | null>(null);
  const [selectedRow, setSelectedRow] = useState<GeneralRegisterRow | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1.1);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set("academicYear", filters.academicYear);
    if (filters.classId) params.set("classId", filters.classId);
    if (filters.standard) params.set("standard", filters.standard);
    if (filters.section) params.set("section", filters.section);
    return params;
  }, [filters]);

  const applySearch = useCallback((source: GeneralRegisterRow[], active: GrSearchFilters) => {
    const hasFilter = Boolean(active.query.trim() || active.dob.trim());
    if (!hasFilter) return dedupeGrRows(source);
    return filterGrRows(source, active);
  }, []);

  const load = useCallback(async () => {
    if (!filters.classId) {
      setLoaded(true);
      setRows([]);
      setDisplayRows([]);
      return;
    }
    const res = await fetch(`/api/general-register?${buildParams()}`);
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || "Failed to load");
      return;
    }
    const filled = dedupeGrRows((data.rows || []).filter((r: GeneralRegisterRow) => !r.isEmpty));
    setRows(filled);
    setDisplayRows(applySearch(filled, search));
    setMeta({
      schoolName: data.schoolName || "",
      academicYear: data.academicYear || filters.academicYear,
      classLabel: data.class?.label || data.class?.name || "",
      studentCount: data.studentCount ?? filled.length,
    });
    setLoaded(true);
    setSelectedRow(null);
    setPage(1);
  }, [applySearch, buildParams, filters.academicYear, filters.classId, search]);

  const handleSearch = useCallback(
    (override?: GrSearchFilters) => {
      const active = override ?? search;
      if (!rows.length) return;
      setDisplayRows(applySearch(rows, active));
      setPage(1);
      setSelectedRow(null);
    },
    [applySearch, rows, search],
  );

  useEffect(() => {
    const fromUrl = filtersFromParams(searchParams);
    if (fromUrl.classId) {
      setFilters((prev) => ({ ...prev, ...fromUrl }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (filters.classId) {
      setSearch({ query: "", dob: "" });
      load();
    }
  }, [filters.classId, filters.academicYear]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = grPageCount(displayRows);
  const safePage = Math.min(page, totalPages);

  const viewRows = useMemo(
    () => sliceGrPage(displayRows, safePage),
    [displayRows, safePage],
  );

  const showingFrom = displayRows.length ? (safePage - 1) * GR_STUDENTS_PER_PAGE + 1 : 0;
  const showingTo = Math.min(safePage * GR_STUDENTS_PER_PAGE, displayRows.length);

  const hasActiveSearch = Boolean(search.query.trim() || search.dob.trim());

  const handleImportClass = async () => {
    if (!filters.classId) {
      alert(t("certificates.grLoadHint"));
      return;
    }
    setImporting(true);
    try {
      const res = await fetch("/api/general-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import-class",
          academicYear: filters.academicYear,
          classId: filters.classId,
          standard: filters.standard,
          section: filters.section,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <CertificatePrintShell
      landscape
      title={t("certificates.generalRegisterTitle")}
      canPrint={displayRows.length > 0}
    >
      <CertificateFilters value={filters} onChange={setFilters} onLoad={load} />

      {loaded && filters.classId && meta.studentCount > 0 && (
        <p className="no-print text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 mb-3">
          {t("certificates.grClassLoaded", {
            class: meta.classLabel,
            count: meta.studentCount,
          })}
        </p>
      )}

      {loaded && (
        <>
          <GrToolbar
            search={search}
            onSearchChange={setSearch}
            onSearch={handleSearch}
            onAdd={() => {
              setEditRow(null);
              setDialogOpen(true);
            }}
            onImportClass={handleImportClass}
            onEdit={() => {
              if (selectedRow) {
                setEditRow(selectedRow);
                setDialogOpen(true);
              }
            }}
            selectedRow={selectedRow}
            importing={importing}
          />

          {hasActiveSearch && displayRows.length > 0 && (
            <p className="no-print text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 mb-2">
              {t("certificates.grSearchResults", { count: displayRows.length })}
            </p>
          )}

          {displayRows.length > 0 && (
            <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-3 px-1">
              <p className="text-xs text-slate-500">{t("certificates.grClickToEdit")}</p>
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={zoom <= GR_ZOOM_MIN}
                    onClick={() => setZoom((z) => Math.max(GR_ZOOM_MIN, +(z - GR_ZOOM_STEP).toFixed(2)))}
                    aria-label="Zoom out"
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>
                  <span className="text-xs font-medium text-slate-600 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    disabled={zoom >= GR_ZOOM_MAX}
                    onClick={() => setZoom((z) => Math.min(GR_ZOOM_MAX, +(z + GR_ZOOM_STEP).toFixed(2)))}
                    aria-label="Zoom in"
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>
                {totalPages > 1 && (
                  <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={safePage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium text-slate-700 px-2">
                      {t("certificates.grPageOf", { page: safePage, total: totalPages })}
                      {displayRows.length > GR_STUDENTS_PER_PAGE && (
                        <span className="text-slate-500 ml-1">
                          ({showingFrom}–{showingTo} / {displayRows.length})
                        </span>
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={safePage >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {loaded && displayRows.length > 0 ? (
        <>
          <div className="gr-screen-view print:hidden">
            <GeneralRegisterView
              rows={viewRows}
              schoolName={meta.schoolName}
              academicYear={meta.academicYear}
              classLabel={meta.classLabel}
              selectedId={selectedRow ? selectedRow.id || `sel-${selectedRow.serial}` : undefined}
              onRowSelect={(row) => setSelectedRow(row)}
              padEmpty
              padTo={GR_STUDENTS_PER_PAGE}
              zoom={zoom}
              pageFooter={
                totalPages > 1
                  ? `પાનું ${safePage} / ${totalPages}`
                  : undefined
              }
            />
          </div>
          <GeneralRegisterPrintBundle
            rows={displayRows}
            schoolName={meta.schoolName}
            academicYear={meta.academicYear}
            classLabel={meta.classLabel}
          />
        </>
      ) : loaded && filters.classId ? (
        <p className="no-print text-center py-12 text-slate-500">
          {hasActiveSearch ? t("certificates.grNoSearchResults") : t("certificates.grNoStudentsInClass")}
        </p>
      ) : loaded ? (
        <p className="no-print text-center py-12 text-slate-500">{t("certificates.grLoadHint")}</p>
      ) : (
        <p className="no-print text-center py-12 text-slate-500">{t("certificates.grLoadHint")}</p>
      )}

      <GrEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        academicYear={filters.academicYear}
        initialRow={editRow}
      />
    </CertificatePrintShell>
  );
}

export default function GeneralRegisterPage() {
  return (
    <Suspense>
      <GeneralRegisterContent />
    </Suspense>
  );
}
