"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { InfoModal } from "@/components/ui/info-modal";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";

export type SchoolStaffModalTarget = {
  id: string;
  name: string;
  code: string;
} | null;

type StaffRow = {
  id: string;
  name: string;
  email: string | null;
  designation: string;
  employeeId: string | null;
  mobileNumber: string | null;
  department: string | null;
  isActive: boolean;
  hasPortalLogin: boolean;
  portalRole: string | null;
  lastLoginAt: string | null;
  userId: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  clerk: "Clerk",
  ca: "CA",
};

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export function SchoolStaffRosterModal({
  school,
  onClose,
}: {
  school: SchoolStaffModalTarget;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [rows, setRows] = useState<StaffRow[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!school) {
      setRows([]);
      setTotal(0);
      setErr(null);
      setQ("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    fetch(`/api/admin/schools/${school.id}/staff`, { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "Failed to load staff");
        if (cancelled) return;
        setRows(Array.isArray(data.staff) ? data.staff : []);
        setTotal(Number(data.total) || 0);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load staff");
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [school]);

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const hay = [r.name, r.email, r.designation, r.employeeId, r.mobileNumber, r.department]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q.trim().toLowerCase());
  });

  return (
    <InfoModal
      isOpen={!!school}
      onClose={onClose}
      title={school ? `Staff — ${school.name}` : "Staff"}
      eyebrow={school ? school.code : undefined}
      size="xl"
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            {loading ? "Loading…" : `${total} staff member${total === 1 ? "" : "s"}`}
            {!loading && q.trim() ? ` · showing ${filtered.length}` : ""}
          </p>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-10 w-full rounded-xl border border-slate-200 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              placeholder="Search name, emp ID, designation…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        {err ? (
          <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        ) : loading ? (
          <PageLoader />
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
            <Users className="h-10 w-10 opacity-40" />
            <p className="text-sm">{rows.length === 0 ? "No staff registered for this school." : "No matching staff."}</p>
          </div>
        ) : (
          <div className="max-h-[min(60vh,520px)] overflow-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2.5">Name</th>
                  <th className="px-3 py-2.5">Designation</th>
                  <th className="px-3 py-2.5">Emp ID</th>
                  <th className="px-3 py-2.5">Contact</th>
                  <th className="px-3 py-2.5">Portal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-t border-slate-100 hover:bg-violet-50/40">
                    <td className="px-3 py-2.5">
                      <p className="font-semibold text-slate-900">{r.name}</p>
                      <p className="text-[11px] text-slate-400">{r.isActive ? "Active" : "Inactive"}</p>
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {r.designation}
                      {r.department ? (
                        <span className="mt-0.5 block text-[11px] text-slate-400">{r.department}</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                      {r.employeeId || "—"}
                    </td>
                    <td className="px-3 py-2.5">
                      <p className="font-mono text-[11px] text-slate-600">{r.email || "No email"}</p>
                      {r.mobileNumber ? (
                        <p className="text-[11px] text-slate-400">{r.mobileNumber}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      {r.hasPortalLogin ? (
                        <div>
                          <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                            {ROLE_LABEL[r.portalRole || ""] || r.portalRole || "Login"}
                          </span>
                          <p className="mt-1 text-[11px] text-slate-400">
                            Last login: {fmtDate(r.lastLoginAt)}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">
                          No portal login
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3">
          {school ? (
            <Link
              href={`/admin/password-activity?schoolId=${encodeURIComponent(school.id)}`}
              className="text-sm font-medium text-violet-700 hover:underline"
              onClick={onClose}
            >
              Open in Password Activity →
            </Link>
          ) : (
            <span />
          )}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </InfoModal>
  );
}
