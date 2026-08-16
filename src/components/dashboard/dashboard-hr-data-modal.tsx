"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Spinner } from "@/components/ui/loader";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import { cachedGetJson, peekCachedJson } from "@/lib/client-fetch-cache";

export type HrModalKind =
  | "attendance"
  | "attendanceUnmarked"
  | "payroll"
  | "payrollPaid"
  | "payrollPending";

type AttnRow = {
  staffId: string;
  employeeId: string;
  name: string;
  designation: string;
  presentDays: number;
  absentDays: number;
  leaveDays: number;
  halfDays: number;
  monthlySalary: number | null;
  marked?: boolean;
};

type PayRow = {
  staffId: string;
  employeeId: string;
  name: string;
  designation: string;
  presentDays: number;
  absentDays: number;
  grossSalary: number;
  netSalary: number;
  paymentStatus: string;
  paidAt: string | null;
};

interface Props {
  open: boolean;
  onClose: () => void;
  kind: HrModalKind;
  month: number;
  year: number;
}

export function DashboardHrDataModal({ open, onClose, kind, month, year }: Props) {
  const t = useT();
  const seq = useRef(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attnRows, setAttnRows] = useState<AttnRow[]>([]);
  const [payRows, setPayRows] = useState<PayRow[]>([]);
  const [attnFilter, setAttnFilter] = useState<"all" | "marked" | "unmarked">("all");

  const isAttendance = kind === "attendance" || kind === "attendanceUnmarked";

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPage(1);
    setError(null);
    setAttnFilter(kind === "attendanceUnmarked" ? "unmarked" : "all");
  }, [open, kind, month, year]);

  useEffect(() => {
    if (!open) return;
    const id = ++seq.current;
    const controller = new AbortController();

    (async () => {
      setError(null);
      try {
        if (isAttendance) {
          const url = `/api/staff-hr/attendance?month=${month}&year=${year}&lite=1`;
          const cached = peekCachedJson<{ rows?: AttnRow[]; error?: string }>(url);
          if (!cached) setLoading(true);
          else {
            setAttnRows(cached.rows ?? []);
            setPayRows([]);
          }
          const { ok, json: data } = await cachedGetJson<{ rows?: AttnRow[]; error?: string }>(
            url,
            controller.signal,
          );
          if (id !== seq.current) return;
          if (!ok) throw new Error(data?.error || "Failed");
          setAttnRows(data.rows ?? []);
          setPayRows([]);
        } else {
          const url = `/api/staff-hr/payroll?month=${month}&year=${year}&lite=1`;
          const cached = peekCachedJson<{ rows?: PayRow[]; error?: string }>(url);
          if (!cached) setLoading(true);
          else {
            let rows: PayRow[] = cached.rows ?? [];
            if (kind === "payrollPaid") rows = rows.filter((r) => r.paymentStatus === "paid");
            if (kind === "payrollPending") rows = rows.filter((r) => r.paymentStatus === "pending");
            setPayRows(rows);
            setAttnRows([]);
          }
          const { ok, json: data } = await cachedGetJson<{ rows?: PayRow[]; error?: string }>(
            url,
            controller.signal,
          );
          if (id !== seq.current) return;
          if (!ok) throw new Error(data?.error || "Failed");
          let rows: PayRow[] = data.rows ?? [];
          if (kind === "payrollPaid") rows = rows.filter((r) => r.paymentStatus === "paid");
          if (kind === "payrollPending") rows = rows.filter((r) => r.paymentStatus === "pending");
          setPayRows(rows);
          setAttnRows([]);
        }
      } catch (e: unknown) {
        if (controller.signal.aborted || id !== seq.current) return;
        setError(e instanceof Error ? e.message : "Failed");
        setAttnRows([]);
        setPayRows([]);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [open, kind, month, year, isAttendance]);

  const filteredAttn = useMemo(() => {
    let list = attnRows;
    if (attnFilter === "marked") list = list.filter((r) => r.marked);
    if (attnFilter === "unmarked") list = list.filter((r) => !r.marked);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q),
    );
  }, [attnRows, search, attnFilter]);

  const filteredPay = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return payRows;
    return payRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.designation.toLowerCase().includes(q) ||
        r.employeeId.toLowerCase().includes(q),
    );
  }, [payRows, search]);

  const rows = isAttendance ? filteredAttn : filteredPay;
  const total = rows.length;
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const titleMap: Record<HrModalKind, string> = {
    attendance: t("dashboard.hrModalAttendance"),
    attendanceUnmarked: t("dashboard.hrAttendanceUnmarked"),
    payroll: t("dashboard.hrModalPayroll"),
    payrollPaid: t("dashboard.hrModalPaid"),
    payrollPending: t("dashboard.hrModalPending"),
  };

  const inr = (n: number) =>
    n.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

  const markedCount = attnRows.filter((r) => r.marked).length;
  const unmarkedCount = attnRows.length - markedCount;
  const payTotalNet = payRows.reduce((s, r) => s + (r.netSalary || 0), 0);

  return (
    <InfoModal isOpen={open} onClose={onClose} title={`${titleMap[kind]} · ${month}/${year}`} size="xl" eyebrow={t("dashboard.hrEyebrow")}>
      <div className="ops-drill">
        <div className="ops-drill-toolbar">
          <div className="ops-drill-search">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("dashboard.staffSearch")}
            />
            {search ? (
              <button type="button" className="ops-drill-clear" onClick={() => { setSearch(""); setPage(1); }}>
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Link
            href={isAttendance ? "/staff/attendance" : "/staff/payroll"}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            {t("dashboard.openFullPage")}
          </Link>
        </div>

        {isAttendance ? (
          <div className="ops-hr-filters">
            {(
              [
                ["all", t("dashboard.hrFilterAll"), attnRows.length],
                ["marked", t("dashboard.hrMarked"), markedCount],
                ["unmarked", t("dashboard.hrUnmarked"), unmarkedCount],
              ] as const
            ).map(([id, label, count]) => (
              <button
                key={id}
                type="button"
                className={attnFilter === id ? "is-active" : undefined}
                onClick={() => {
                  setAttnFilter(id);
                  setPage(1);
                }}
              >
                {label}
                <em>{count}</em>
              </button>
            ))}
          </div>
        ) : null}

        <div className="ops-drill-meta">
          <span>{t("dashboard.drillCount", { count: total })}</span>
          {!isAttendance && payRows.length > 0 ? (
            <span className="ops-drill-meta-sum">{inr(payTotalNet)}</span>
          ) : null}
        </div>

        <div className="ops-drill-table-wrap">
          {loading ? (
            <div className="ops-drill-loading">
              <Spinner size="sm" />
              <span>{t("dashboard.loading")}</span>
            </div>
          ) : error ? (
            <p className="ops-drill-error">{error}</p>
          ) : total === 0 ? (
            <p className="ops-drill-empty">{t("dashboard.drillEmpty")}</p>
          ) : isAttendance ? (
            <table className="ops-drill-table">
              <thead>
                <tr>
                  <th className="ops-drill-sr">{t("common.srNo")}</th>
                  <th>{t("dashboard.staffColId")}</th>
                  <th>{t("dashboard.drillColName")}</th>
                  <th>{t("dashboard.staffColDesignation")}</th>
                  <th>{t("dashboard.hrSalary")}</th>
                  <th>{t("dashboard.hrPresent")}</th>
                  <th>{t("dashboard.hrAbsent")}</th>
                  <th>{t("dashboard.hrLeave")}</th>
                  <th>{t("dashboard.hrHalf")}</th>
                  <th>{t("dashboard.drillColStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {(paged as AttnRow[]).map((r, i) => (
                  <tr key={r.staffId}>
                    <td className="ops-drill-sr">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{r.employeeId || "—"}</td>
                    <td>
                      <Link href={`/staff/${r.staffId}/edit`} className="ops-drill-name">{r.name}</Link>
                    </td>
                    <td>{r.designation}</td>
                    <td>{r.monthlySalary ? inr(r.monthlySalary) : "—"}</td>
                    <td>{r.presentDays}</td>
                    <td>{r.absentDays}</td>
                    <td>{r.leaveDays}</td>
                    <td>{r.halfDays}</td>
                    <td>
                      <span className={`ops-pill ${r.marked ? "is-verified" : "is-pending"}`}>
                        {r.marked ? t("dashboard.hrMarked") : t("dashboard.hrUnmarked")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="ops-drill-table">
              <thead>
                <tr>
                  <th className="ops-drill-sr">{t("common.srNo")}</th>
                  <th>{t("dashboard.staffColId")}</th>
                  <th>{t("dashboard.drillColName")}</th>
                  <th>{t("dashboard.staffColDesignation")}</th>
                  <th>{t("dashboard.hrPresent")}</th>
                  <th>{t("dashboard.hrGross")}</th>
                  <th>{t("dashboard.hrNet")}</th>
                  <th>{t("dashboard.drillColStatus")}</th>
                  <th>{t("dashboard.hrPaidAt")}</th>
                </tr>
              </thead>
              <tbody>
                {(paged as PayRow[]).map((r, i) => (
                  <tr key={r.staffId}>
                    <td className="ops-drill-sr">{(page - 1) * PAGE_SIZE + i + 1}</td>
                    <td>{r.employeeId || "—"}</td>
                    <td>
                      <Link href={`/staff/${r.staffId}/edit`} className="ops-drill-name">{r.name}</Link>
                    </td>
                    <td>{r.designation}</td>
                    <td>{r.presentDays}</td>
                    <td>{inr(r.grossSalary)}</td>
                    <td>{inr(r.netSalary)}</td>
                    <td>
                      <span className={`ops-pill ${r.paymentStatus === "paid" ? "is-verified" : "is-pending"}`}>
                        {r.paymentStatus === "paid" ? t("dashboard.hrPaid") : t("dashboard.hrPayPending")}
                      </span>
                    </td>
                    <td>
                      {r.paidAt
                        ? new Date(r.paidAt).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <TablePagination page={page} total={total} onPageChange={setPage} />
      </div>
    </InfoModal>
  );
}
