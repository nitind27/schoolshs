"use client";

import { useCallback, useRef, useState } from "react";
import { Download, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";

export type GsebBulkStudent = {
  id: string;
  name: string;
  seatNo?: string | null;
};

type RowStatus = "pending" | "running" | "ok" | "fail" | "skip";

type RowState = GsebBulkStudent & { status: RowStatus; message?: string };

const BATCH_DELAY_MS = 600;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function seatDigitLen(standard: "10" | "12") {
  return standard === "12" ? 6 : 7;
}

export function GsebBulkFetch({
  students,
  standard,
  onComplete,
  compact = false,
}: {
  students: GsebBulkStudent[];
  standard: "10" | "12";
  onComplete?: () => void;
  compact?: boolean;
}) {
  const t = useT();
  const abortRef = useRef(false);
  const [running, setRunning] = useState(false);
  const [rows, setRows] = useState<RowState[]>([]);
  const [open, setOpen] = useState(false);

  const minDigits = seatDigitLen(standard);
  const eligible = students.filter((s) => s.seatNo && s.seatNo.replace(/\D/g, "").length >= minDigits);

  const start = useCallback(async () => {
    if (!eligible.length) {
      alert(t("boardRecords.gsebBulkNoSeats"));
      return;
    }

    abortRef.current = false;
    setOpen(true);
    setRunning(true);

    const initial: RowState[] = eligible.map((s) => ({ ...s, status: "pending" }));
    setRows(initial);

    let done = 0;

    for (let i = 0; i < eligible.length; i++) {
      if (abortRef.current) break;

      const student = eligible[i];
      setRows((prev) =>
        prev.map((r) => (r.id === student.id ? { ...r, status: "running" } : r)),
      );

      try {
        const res = await fetch("/api/board-records/fetch-gseb", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentId: student.id, standard }),
        });
        const data = await res.json();

        if (res.ok && data.result?.percentage != null) {
          const pct = data.result.percentage;
          setRows((prev) =>
            prev.map((r) =>
              r.id === student.id ? { ...r, status: "ok", message: `${pct}%` } : r,
            ),
          );
        } else {
          setRows((prev) =>
            prev.map((r) =>
              r.id === student.id
                ? { ...r, status: "fail", message: data.error || "No result / invalid seat" }
                : r,
            ),
          );
        }
      } catch {
        setRows((prev) =>
          prev.map((r) =>
            r.id === student.id ? { ...r, status: "fail", message: "Network error" } : r,
          ),
        );
      }

      done++;
      if (i < eligible.length - 1 && !abortRef.current) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    setRunning(false);
    onComplete?.();
  }, [eligible, onComplete, standard, t]);

  const stop = () => {
    abortRef.current = true;
    setRunning(false);
  };

  const finished = rows.filter((r) => r.status === "ok" || r.status === "fail").length;
  const progress = eligible.length ? Math.round((finished / eligible.length) * 100) : 0;
  const okCount = rows.filter((r) => r.status === "ok").length;
  const failCount = rows.filter((r) => r.status === "fail").length;

  return (
    <div className={compact ? "" : "rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm"}>
      {!compact && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between mb-3">
          <div>
            <p className="text-sm font-bold text-slate-900">{t("boardRecords.gsebBulkTitle")}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {standard === "12" ? t("boardRecords.gsebBulkDescHsc") : t("boardRecords.gsebBulkDesc")}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          disabled={running || eligible.length === 0}
          onClick={() => void start()}
          className="gap-1.5 bg-violet-600 hover:bg-violet-700"
        >
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {running
            ? t("boardRecords.gsebBulkRunning", { done: finished, total: eligible.length })
            : t("boardRecords.gsebBulkBtn", { count: eligible.length })}
        </Button>
        {running && (
          <Button type="button" variant="outline" size="sm" onClick={stop}>
            {t("common.cancel")}
          </Button>
        )}
        {!running && students.length > eligible.length && (
          <span className="text-xs text-amber-700">
            {t("boardRecords.gsebBulkMissingSeats", { count: students.length - eligible.length })}
          </span>
        )}
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div
              className="h-full bg-violet-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-600">
            {t("boardRecords.gsebBulkProgress", {
              done: finished,
              total: eligible.length,
              ok: okCount,
              fail: failCount,
            })}
          </p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white text-xs divide-y divide-slate-100">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 px-3 py-2">
                {r.status === "running" && <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-600 shrink-0" />}
                {r.status === "ok" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
                {r.status === "fail" && <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                {r.status === "pending" && <AlertCircle className="h-3.5 w-3.5 text-slate-300 shrink-0" />}
                <span className="flex-1 truncate font-medium text-slate-800">{r.name}</span>
                <span className="font-mono text-slate-500 shrink-0">{r.seatNo}</span>
                {r.message && (
                  <span className={`shrink-0 font-semibold ${r.status === "ok" ? "text-emerald-700" : "text-red-600"}`}>
                    {r.message}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function studentsToGsebBulk(
  list: { id: string; firstName: string; surname: string; boardSeatNo?: string }[],
): GsebBulkStudent[] {
  return list.map((s) => ({
    id: s.id,
    name: `${s.firstName} ${s.surname}`.trim(),
    seatNo: s.boardSeatNo || null,
  }));
}

export function ResultListGsebFetch({
  classId,
  standard,
  eligibleCount,
  onComplete,
}: {
  classId: string;
  standard: "10" | "12";
  eligibleCount: number;
  onComplete: (payload: {
    rows: import("@/lib/board-records/result-list-data").BoardResultListRow[];
    summary: { ok: number; fail: number; eligible: number };
  }) => void;
}) {
  const t = useT();
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<{ ok: number; fail: number; eligible: number } | null>(null);

  const fetchAll = async () => {
    if (!classId || eligibleCount === 0) {
      alert(t("boardRecords.gsebBulkNoSeats"));
      return;
    }
    setRunning(true);
    setSummary(null);
    try {
      const res = await fetch("/api/board-records/result-list/fetch-gseb", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fetch failed");
      setSummary({ ok: data.summary.ok, fail: data.summary.fail, eligible: data.summary.eligible });
      onComplete({ rows: data.rows, summary: data.summary });
    } catch (e) {
      alert(e instanceof Error ? e.message : "GSEB fetch failed");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/60 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-sm font-bold text-slate-900">{t("boardRecords.resultListFetchGseb")}</p>
        <p className="text-xs text-slate-600 mt-0.5">
          {standard === "12" ? t("boardRecords.gsebBulkDescHsc") : t("boardRecords.gsebBulkDesc")}
        </p>
        {summary && (
          <p className="text-xs text-emerald-700 font-semibold mt-1">
            {t("boardRecords.resultListFetchGsebDone", {
              ok: summary.ok,
              fail: summary.fail,
              total: summary.eligible,
            })}
          </p>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        disabled={running || eligibleCount === 0}
        onClick={() => void fetchAll()}
        className="gap-1.5 bg-violet-600 hover:bg-violet-700 shrink-0"
      >
        {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        {running
          ? t("boardRecords.gsebBulkRunning", { done: "…", total: eligibleCount })
          : t("boardRecords.gsebBulkBtn", { count: eligibleCount })}
      </Button>
    </div>
  );
}
