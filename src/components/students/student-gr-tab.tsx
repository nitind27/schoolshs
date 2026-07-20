"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  Edit,
  ExternalLink,
  RefreshCw,
  ZoomIn,
  ZoomOut,
  AlertCircle,
  CheckCircle2,
  Hash,
} from "lucide-react";
import { GeneralRegisterView } from "@/components/certificates/general-register";
import { GrEntryDialog } from "@/components/certificates/gr-entry-dialog";
import { DashboardSection } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import type { GeneralRegisterRow } from "@/lib/certificates/general-register";
import type { Student } from "@/generated/prisma/client";

const GR_ZOOM_MIN = 0.75;
const GR_ZOOM_MAX = 1.35;
const GR_ZOOM_STEP = 0.1;

type GrTabData = {
  row: GeneralRegisterRow;
  schoolName: string;
  academicYear: string;
  classLabel: string;
  classId: string;
  hasSavedEntry: boolean;
  hasGrNumber: boolean;
  source: "saved" | "student_preview";
};

export function StudentGrTab({ studentId, student }: { studentId: string; student: Student }) {
  const t = useT();
  const [data, setData] = useState<GrTabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/students/${studentId}/general-register`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load");
      setData(payload);
    } catch (e) {
      setData(null);
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-8 text-center">
        <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
        <p className="text-sm text-red-700">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={load}>
          <RefreshCw className="h-4 w-4" />
          {t("students.grRefresh")}
        </Button>
      </div>
    );
  }

  if (!data) return null;

  const classGrHref = data.classId
    ? `/certificates/general-register?classId=${data.classId}&academicYear=${encodeURIComponent(data.academicYear)}`
    : "/certificates/general-register";

  return (
    <div className="space-y-4">
      <DashboardSection
        icon={<BookOpen className="h-5 w-5" />}
        title={t("certificates.generalRegisterTitle")}
        description={t("students.grTabDesc")}
        iconClassName="bg-indigo-600 shadow-indigo-600/20"
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={load}>
              <RefreshCw className="h-4 w-4" />
              {t("students.grRefresh")}
            </Button>
            {data.classId && (
              <Link href={classGrHref}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="h-4 w-4" />
                  {t("students.openClassGr")}
                </Button>
              </Link>
            )}
            <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!data.hasGrNumber}>
              <Edit className="h-4 w-4" />
              {data.hasSavedEntry ? t("certificates.grEditEntry") : t("certificates.grAddEntry")}
            </Button>
          </div>
        }
      >
        {/* Status bar */}
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {data.hasSavedEntry ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {t("students.grSavedEntry")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              <AlertCircle className="h-3.5 w-3.5" />
              {t("students.grPreviewFromStudent")}
            </span>
          )}
          {student.grNumber && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">
              <Hash className="h-3 w-3" />
              GR {student.grNumber}
            </span>
          )}
          {data.academicYear && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
              {data.academicYear}
            </span>
          )}
        </div>

        {!data.hasGrNumber && (
          <div className="mb-4 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-900">{t("students.grNoGrNumber")}</p>
              <Link
                href={`/students/${studentId}/edit`}
                className="mt-1 inline-block text-xs font-semibold text-amber-700 hover:underline"
              >
                {t("students.completeProfile")} →
              </Link>
            </div>
          </div>
        )}

        {/* Zoom toolbar */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2">
          <p className="text-xs text-slate-500">{t("students.grRegisterPreview")}</p>
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1">
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
            <span className="w-12 text-center text-xs font-medium text-slate-600">
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
        </div>

        {/* Official GR register view */}
        <div
          className={cn(
            "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-inner",
            "student-gr-register",
          )}
        >
          <GeneralRegisterView
            rows={[data.row]}
            schoolName={data.schoolName}
            academicYear={data.academicYear}
            classLabel={data.classLabel}
            selectedId={data.row.id || `sel-${data.row.serial}`}
            padEmpty={false}
            zoom={zoom}
          />
        </div>
      </DashboardSection>

      <GrEntryDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={load}
        academicYear={data.academicYear}
        initialRow={data.row}
      />
    </div>
  );
}
