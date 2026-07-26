"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Spinner } from "@/components/ui/loader";
import { TablePagination } from "@/components/ui/table-pagination";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import { studentShortNameGu } from "@/lib/student-names";

export type QuickListKind = "admission" | "staff";

type AdmissionRow = {
  id: string;
  firstName?: string | null;
  surname?: string | null;
  firstNameGu?: string | null;
  surnameGu?: string | null;
  standard?: string | null;
  section?: string | null;
  className?: string | null;
  category?: string | null;
  admissionStatus?: string | null;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  createdAt?: string | null;
};

type StaffRow = {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  firstNameGu?: string | null;
  lastNameGu?: string | null;
  designation?: string | null;
  department?: string | null;
  mobileNumber?: string | null;
  employeeId?: string | null;
  isActive?: boolean;
};

interface Props {
  open: boolean;
  onClose: () => void;
  kind: QuickListKind;
  /** admissionStatus or staff designation */
  value: string;
  label: string;
}

export function DashboardQuickListModal({ open, onClose, kind, value, label }: Props) {
  const t = useT();
  const seq = useRef(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admissionRows, setAdmissionRows] = useState<AdmissionRow[]>([]);
  const [staffRows, setStaffRows] = useState<StaffRow[]>([]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPage(1);
    setTotal(0);
    setAdmissionRows([]);
    setStaffRows([]);
    setError(null);
  }, [open, kind, value]);

  useEffect(() => {
    if (!open) return;
    const id = ++seq.current;
    const controller = new AbortController();
    const delay = search.trim() ? 280 : 0;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        if (kind === "admission") {
          const params = new URLSearchParams({
            status: value || "pending",
            page: String(page),
            limit: String(PAGE_SIZE),
          });
          if (search.trim()) params.set("search", search.trim());
          const res = await fetch(`/api/admissions?${params}`, { signal: controller.signal });
          const data = await res.json();
          if (id !== seq.current) return;
          if (!res.ok) throw new Error(data?.error || "Failed");
          setAdmissionRows(data.students ?? []);
          setTotal(Number(data.total) || 0);
        } else {
          const params = new URLSearchParams({
            page: String(page),
            limit: String(PAGE_SIZE),
            active: "true",
          });
          if (value) params.set("designation", value);
          if (search.trim()) params.set("search", search.trim());
          const res = await fetch(`/api/staff?${params}`, { signal: controller.signal });
          const data = await res.json();
          if (id !== seq.current) return;
          if (!res.ok) throw new Error(data?.error || "Failed");
          setStaffRows(data.staff ?? []);
          setTotal(Number(data.total) || 0);
        }
      } catch (e: unknown) {
        if (controller.signal.aborted || id !== seq.current) return;
        setError(e instanceof Error ? e.message : "Failed");
        setAdmissionRows([]);
        setStaffRows([]);
        setTotal(0);
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, delay);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, kind, value, page, search]);

  const title =
    kind === "admission"
      ? t("dashboard.admissionListTitle", { label })
      : t("dashboard.staffListTitle", { label });

  return (
    <InfoModal isOpen={open} onClose={onClose} title={title} size="xl">
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
              placeholder={
                kind === "admission" ? t("dashboard.drillSearch") : t("dashboard.staffSearch")
              }
            />
            {search ? (
              <button
                type="button"
                className="ops-drill-clear"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
          <Link
            href={kind === "admission" ? `/admissions?status=${encodeURIComponent(value || "pending")}` : "/staff"}
            className="text-xs font-bold text-blue-700 hover:underline"
          >
            {t("dashboard.openFullPage")}
          </Link>
        </div>

        <div className="ops-drill-meta">
          <span>{t("dashboard.drillCount", { count: total })}</span>
          <span className="ops-drill-chip">{label}</span>
        </div>

        <div className="ops-drill-table-wrap">
          {loading ? (
            <div className="ops-drill-loading">
              <Spinner size="sm" />
              <span>{t("dashboard.loading")}</span>
            </div>
          ) : error ? (
            <p className="ops-drill-error">{error}</p>
          ) : kind === "admission" ? (
            admissionRows.length === 0 ? (
              <p className="ops-drill-empty">{t("dashboard.drillEmpty")}</p>
            ) : (
              <table className="ops-drill-table">
                <thead>
                  <tr>
                    <th>{t("dashboard.drillColName")}</th>
                    <th>{t("dashboard.drillColClass")}</th>
                    <th>{t("dashboard.drillColCategory")}</th>
                    <th>{t("dashboard.admissionColStatus")}</th>
                    <th>{t("dashboard.admissionColVerifiedBy")}</th>
                    <th>{t("dashboard.admissionColDate")}</th>
                  </tr>
                </thead>
                <tbody>
                  {admissionRows.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <Link href={`/students/${s.id}`} className="ops-drill-name">
                          {studentShortNameGu(s)}
                        </Link>
                      </td>
                      <td>{s.className || [s.standard, s.section].filter(Boolean).join("-") || "—"}</td>
                      <td>{s.category || "—"}</td>
                      <td>
                        <span className={`ops-pill is-${s.admissionStatus || "pending"}`}>
                          {t(`admissionStatus.${s.admissionStatus || "pending"}`)}
                        </span>
                      </td>
                      <td>{s.verifiedBy || "—"}</td>
                      <td>
                        {s.verifiedAt
                          ? new Date(s.verifiedAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : s.createdAt
                            ? new Date(s.createdAt).toLocaleDateString("en-IN")
                            : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : staffRows.length === 0 ? (
            <p className="ops-drill-empty">{t("dashboard.drillEmpty")}</p>
          ) : (
            <table className="ops-drill-table">
              <thead>
                <tr>
                  <th>{t("dashboard.staffColId")}</th>
                  <th>{t("dashboard.drillColName")}</th>
                  <th>{t("dashboard.staffColDesignation")}</th>
                  <th>{t("dashboard.staffColDept")}</th>
                  <th>{t("dashboard.drillColMobile")}</th>
                  <th>{t("dashboard.drillColStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {staffRows.map((s) => (
                  <tr key={s.id}>
                    <td>{s.employeeId || "—"}</td>
                    <td>
                      <Link href={`/staff/${s.id}/edit`} className="ops-drill-name">
                        {[s.firstNameGu || s.firstName, s.lastNameGu || s.lastName].filter(Boolean).join(" ")}
                      </Link>
                    </td>
                    <td>{s.designation || "—"}</td>
                    <td>{s.department || "—"}</td>
                    <td>{s.mobileNumber || "—"}</td>
                    <td>
                      <span className={`ops-pill ${s.isActive === false ? "is-pending" : "is-verified"}`}>
                        {s.isActive === false ? t("common.inactive") : t("common.active")}
                      </span>
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
