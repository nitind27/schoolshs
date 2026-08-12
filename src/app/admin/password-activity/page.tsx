"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  RefreshCw,
  Search,
  Shield,
  Key,
  X,
} from "lucide-react";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InfoModal } from "@/components/ui/info-modal";
import "@/components/admin/admin-portal.css";

type SchoolRef = { id: string; name: string; code: string } | null;

type AccountRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  currentPassword: string | null;
  passwordChangedAt: string | null;
  lastLoginAt: string | null;
  school: SchoolRef;
  designation: string | null;
  employeeId: string | null;
};

type EventRow = {
  id: string;
  createdAt: string;
  email: string;
  name: string;
  role: string;
  source: string;
  actorName: string | null;
  actorRole: string | null;
  passwordAtChange: string | null;
  school: SchoolRef;
  userId: string;
};

const ROLE_LABEL: Record<string, string> = {
  school_admin: "School Admin",
  teacher: "Teacher",
  clerk: "Clerk",
  ca: "CA",
};

const SOURCE_LABEL: Record<string, string> = {
  self_change: "Self change",
  admin_reset: "Super Admin reset",
  staff_portal: "School Admin / staff portal",
  school_register: "School registration",
  staff_create: "Staff account created",
  other: "Other",
};

function roleBadgeClass(role: string) {
  switch (role) {
    case "school_admin":
      return "bg-sky-100 text-sky-800";
    case "teacher":
      return "bg-teal-100 text-teal-800";
    case "clerk":
      return "bg-cyan-100 text-cyan-900";
    case "ca":
      return "bg-amber-100 text-amber-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function fmtDate(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function AdminPasswordActivityPage() {
  const [accounts, setAccounts] = useState<AccountRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalEvents, setTotalEvents] = useState(0);
  const [changed24h, setChanged24h] = useState(0);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [tab, setTab] = useState<"accounts" | "history">("accounts");
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pwdTarget, setPwdTarget] = useState<AccountRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [sendAfterChange, setSendAfterChange] = useState(true);
  const [pwdSaving, setPwdSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role !== "all") params.set("role", role);
      params.set("limit", "1000");
      const res = await fetch(`/api/admin/password-activity?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Failed to load password activity");
        setAccounts([]);
        setEvents([]);
        return;
      }
      setAccounts(Array.isArray(data.accounts) ? data.accounts : []);
      setEvents(Array.isArray(data.events) ? data.events : []);
      setTotalUsers(Number(data.totalUsers) || 0);
      setTotalEvents(Number(data.totalEvents) || 0);
      setChanged24h(Number(data.changed24h) || 0);
      setByRole(data.byRole || {});
      setRoles(Array.isArray(data.roles) ? data.roles : []);
    } catch {
      setErr("Failed to load password activity");
      setAccounts([]);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const withPassword = useMemo(
    () => accounts.filter((a) => Boolean(a.currentPassword)).length,
    [accounts],
  );

  const toggleReveal = (id: string) => {
    setReveal((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const openChangePassword = (a: AccountRow) => {
    setPwdTarget(a);
    setNewPassword("");
    setSendAfterChange(true);
  };

  const submitChangePassword = async (opts?: { generate?: boolean }) => {
    if (!pwdTarget) return;
    const generate = Boolean(opts?.generate);
    if (!generate && newPassword.trim().length < 8) {
      setErr("Password must be at least 8 characters");
      return;
    }
    setPwdSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/password-activity/${pwdTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: generate ? undefined : newPassword.trim(),
          generate,
          sendEmail: sendAfterChange,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Failed to change password");
        return;
      }
      setPwdTarget(null);
      setNewPassword("");
      setMsg(
        sendAfterChange && data.emailSent
          ? `Password updated for ${pwdTarget.name} and emailed to ${pwdTarget.email}.`
          : sendAfterChange && data.emailError
            ? `Password updated for ${pwdTarget.name}. Email failed: ${data.emailError}`
            : `Password updated for ${pwdTarget.name}.`,
      );
      await load();
    } catch {
      setErr("Failed to change password");
    } finally {
      setPwdSaving(false);
    }
  };

  const sendCredentials = async (a: AccountRow, generateNew = false) => {
    setBusyId(a.id);
    setErr(null);
    try {
      const res = await fetch(`/api/admin/password-activity/${a.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ generateNew }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Failed to send credentials email");
        return;
      }
      setMsg(
        data.regenerated
          ? `New password generated and emailed to ${a.email}.`
          : `Credentials emailed to ${a.email}.`,
      );
      await load();
    } catch {
      setErr("Failed to send credentials email");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="ad-portal space-y-5">
      <header className="ad-hero">
        <div className="ad-hero-inner">
          <div className="ad-hero-brand">
            <div className="ad-hero-mark">
              <KeyRound className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <div className="ad-eyebrow">Security</div>
              <h1>Password Activity</h1>
              <p>
                All school admins, teachers, clerks and CAs — view password, change it, or email
                credentials anytime.
              </p>
            </div>
          </div>
          <div className="ad-hero-actions">
            <Button
              type="button"
              variant="outline"
              className="ad-btn is-ghost border-white/20 bg-white/10 text-white hover:bg-white/20"
              onClick={() => void load()}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <div className="ad-stat-grid">
        <div className="ad-stat">
          <div className="ad-stat-label">Total members</div>
          <div className="ad-stat-value">{totalUsers.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">
            Admin {byRole.school_admin || 0} · Teacher {byRole.teacher || 0} · Clerk{" "}
            {byRole.clerk || 0} · CA {byRole.ca || 0}
          </div>
        </div>
        <div className="ad-stat is-ok">
          <div className="ad-stat-label">Passwords on file</div>
          <div className="ad-stat-value">{withPassword.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">In current list</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Change events</div>
          <div className="ad-stat-value">{totalEvents.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">All-time history</div>
        </div>
        <div className="ad-stat is-slate">
          <div className="ad-stat-label">Changed (24h)</div>
          <div className="ad-stat-value">{changed24h.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">Recent updates</div>
        </div>
      </div>

      <div className="ad-filter-bar">
        <label className="ad-filter-label" htmlFor="pwd-q">
          <Search className="h-4 w-4" />
          Search
        </label>
        <input
          id="pwd-q"
          className="ad-filter-select"
          placeholder="Name, email, school, designation…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select
          className="ad-filter-select"
          style={{ maxWidth: 180 }}
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r] || r}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <button
            type="button"
            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
              tab === "accounts"
                ? "bg-sky-700 text-white border-sky-700"
                : "bg-white text-slate-600 border-slate-200"
            }`}
            onClick={() => setTab("accounts")}
          >
            All members
          </button>
          <button
            type="button"
            className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
              tab === "history"
                ? "bg-sky-700 text-white border-sky-700"
                : "bg-white text-slate-600 border-slate-200"
            }`}
            onClick={() => setTab("history")}
          >
            Change history
          </button>
        </div>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <Shield className="h-5 w-5 text-sky-700" />
              {tab === "accounts" ? "All portal members" : "Password change history"}
            </h2>
            <p>
              {tab === "accounts"
                ? `${accounts.length} shown — change password or email credentials per member`
                : "Every set or change — self, school admin, or Super Admin"}
            </p>
          </div>
        </div>
        <div className="ad-panel-body is-flush">
          {err ? (
            <div className="ad-empty">
              <p className="font-semibold text-red-700">{err}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                Retry
              </Button>
            </div>
          ) : loading && accounts.length === 0 && events.length === 0 ? (
            <PageLoader />
          ) : tab === "accounts" ? (
            accounts.length === 0 ? (
              <div className="ad-empty">
                <KeyRound className="h-9 w-9 opacity-40" />
                <p>No matching admin / staff accounts.</p>
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                    <Spinner size="sm" />
                  </div>
                )}
                <table className="w-full min-w-[1100px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Member</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">School</th>
                      <th className="px-3 py-3">Current password</th>
                      <th className="px-3 py-3">Last changed</th>
                      <th className="px-3 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accounts.map((a) => {
                      const shown = reveal[a.id];
                      const busy = busyId === a.id;
                      return (
                        <tr key={a.id} className="border-t border-slate-100 hover:bg-sky-50/40">
                          <td className="px-3 py-3">
                            <p className="font-semibold text-slate-900">{a.name}</p>
                            <p className="font-mono text-[11px] text-slate-500">{a.email}</p>
                            {(a.designation || a.employeeId) && (
                              <p className="mt-0.5 text-[11px] text-slate-500">
                                {[a.designation, a.employeeId ? `ID ${a.employeeId}` : null]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            )}
                            {!a.isActive && (
                              <span className="mt-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${roleBadgeClass(a.role)}`}
                            >
                              {ROLE_LABEL[a.role] || a.role}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {a.school ? (
                              <div>
                                <p className="font-medium text-slate-800">{a.school.name}</p>
                                <p className="font-mono text-[11px] text-slate-500">{a.school.code}</p>
                                <Link
                                  href={`/admin/schools/${a.school.id}`}
                                  className="text-[11px] font-medium text-sky-700 hover:underline"
                                >
                                  Open school
                                </Link>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            {a.currentPassword ? (
                              <div className="flex items-center gap-2">
                                <code className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs text-slate-800">
                                  {shown ? a.currentPassword : "••••••••••••"}
                                </code>
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                  onClick={() => toggleReveal(a.id)}
                                  title={shown ? "Hide" : "Show"}
                                >
                                  {shown ? (
                                    <EyeOff className="h-3.5 w-3.5" />
                                  ) : (
                                    <Eye className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-amber-700">
                                Not stored — change or email to create
                              </span>
                            )}
                            <p className="mt-1 text-[10px] text-slate-400">{fmtDate(a.passwordChangedAt)}</p>
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                            <div>Changed: {fmtDate(a.passwordChangedAt)}</div>
                            <div className="mt-0.5">Login: {fmtDate(a.lastLoginAt)}</div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8"
                                disabled={busy || pwdSaving}
                                onClick={() => openChangePassword(a)}
                              >
                                <Key className="h-3.5 w-3.5" />
                                Change
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="h-8 bg-sky-700 hover:bg-sky-800"
                                disabled={busy || pwdSaving}
                                onClick={() => void sendCredentials(a, false)}
                                title="Email current password (or generate if missing)"
                              >
                                {busy ? <Spinner size="sm" /> : <Mail className="h-3.5 w-3.5" />}
                                Email
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          ) : events.length === 0 ? (
            <div className="ad-empty">
              <KeyRound className="h-9 w-9 opacity-40" />
              <p>No password changes logged yet.</p>
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              {loading && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                  <Spinner size="sm" />
                </div>
              )}
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-3 py-3">When</th>
                    <th className="px-3 py-3">User</th>
                    <th className="px-3 py-3">Role</th>
                    <th className="px-3 py-3">School</th>
                    <th className="px-3 py-3">Password set</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Changed by</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => {
                    const shown = reveal[`ev-${e.id}`];
                    return (
                      <tr key={e.id} className="border-t border-slate-100 hover:bg-sky-50/40">
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                          {fmtDate(e.createdAt)}
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-semibold text-slate-900">{e.name}</p>
                          <p className="font-mono text-[11px] text-slate-500">{e.email}</p>
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${roleBadgeClass(e.role)}`}
                          >
                            {ROLE_LABEL[e.role] || e.role}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          {e.school ? (
                            <div>
                              <p className="font-medium text-slate-800">{e.school.name}</p>
                              <p className="font-mono text-[11px] text-slate-500">{e.school.code}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          {e.passwordAtChange ? (
                            <div className="flex items-center gap-2">
                              <code className="rounded-lg bg-amber-50 px-2 py-1 font-mono text-xs text-amber-950">
                                {shown ? e.passwordAtChange : "••••••••••••"}
                              </code>
                              <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                                onClick={() => toggleReveal(`ev-${e.id}`)}
                              >
                                {shown ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-xs font-semibold text-slate-700">
                          {SOURCE_LABEL[e.source] || e.source}
                        </td>
                        <td className="px-3 py-3 text-xs text-slate-600">
                          {e.actorName || e.actorRole || "—"}
                          {e.actorRole ? (
                            <span className="mt-0.5 block text-[10px] text-slate-400">
                              {ROLE_LABEL[e.actorRole] || e.actorRole}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {pwdTarget && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Change password</h3>
                <p className="mt-0.5 text-sm text-slate-500">
                  {pwdTarget.name} · {pwdTarget.email}
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setPwdTarget(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 px-5 py-4">
              <Input
                label="New password"
                type="text"
                autoComplete="off"
                placeholder="Min 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="rounded border-slate-300"
                  checked={sendAfterChange}
                  onChange={(e) => setSendAfterChange(e.target.checked)}
                />
                Also email credentials to member
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  className="bg-sky-700 hover:bg-sky-800"
                  disabled={pwdSaving}
                  onClick={() => void submitChangePassword()}
                >
                  {pwdSaving ? <Spinner size="sm" /> : <Key className="h-4 w-4" />}
                  Save password
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pwdSaving}
                  onClick={() => void submitChangePassword({ generate: true })}
                >
                  Generate &amp; save
                </Button>
                <Button type="button" variant="outline" disabled={pwdSaving} onClick={() => setPwdTarget(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InfoModal isOpen={!!msg} onClose={() => setMsg(null)} title="Done">
        <p className="text-sm text-slate-600">{msg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setMsg(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
