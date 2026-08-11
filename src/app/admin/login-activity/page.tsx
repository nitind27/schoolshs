"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  ExternalLink,
  MapPin,
  MonitorSmartphone,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { Button } from "@/components/ui/button";
import "@/components/admin/admin-portal.css";

type LoginEventRow = {
  id: string;
  createdAt: string;
  email: string;
  role: string;
  ip: string;
  latitude: number | null;
  longitude: number | null;
  accuracyM: number | null;
  userAgent: string | null;
  source: string;
  geoSource: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    school: { id: string; name: string; code: string } | null;
  } | null;
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "Super Admin",
  school_admin: "School Admin",
  teacher: "Teacher",
  clerk: "Clerk",
  ca: "CA",
  student: "Student",
};

function mapsUrl(lat: number, lon: number) {
  return `https://www.google.com/maps?q=${lat},${lon}`;
}

function placeLabel(e: LoginEventRow) {
  const parts = [e.city, e.region, e.country].filter(Boolean);
  if (parts.length) return parts.join(", ");
  if (e.latitude != null && e.longitude != null) {
    return `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`;
  }
  return "Location unavailable";
}

function roleBadgeClass(role: string) {
  switch (role) {
    case "super_admin":
      return "bg-slate-900 text-white";
    case "school_admin":
      return "bg-sky-100 text-sky-800";
    case "teacher":
      return "bg-teal-100 text-teal-800";
    case "clerk":
      return "bg-cyan-100 text-cyan-900";
    case "ca":
      return "bg-amber-100 text-amber-900";
    case "student":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

export default function AdminLoginActivityPage() {
  const [events, setEvents] = useState<LoginEventRow[]>([]);
  const [total, setTotal] = useState(0);
  const [last24h, setLast24h] = useState(0);
  const [byRole, setByRole] = useState<Record<string, number>>({});
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const [source, setSource] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (role !== "all") params.set("role", role);
      if (source !== "all") params.set("source", source);
      params.set("limit", "200");
      const res = await fetch(`/api/admin/login-events?${params.toString()}`, { cache: "no-store" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Failed to load login activity");
        setEvents([]);
        return;
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
      setTotal(Number(data.total) || 0);
      setLast24h(Number(data.last24h) || 0);
      setByRole(data.byRole || {});
      setRoles(Array.isArray(data.roles) ? data.roles : []);
      setPage(0);
    } catch {
      setErr("Failed to load login activity");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [q, role, source]);

  useEffect(() => {
    const t = setTimeout(() => {
      void load();
    }, 250);
    return () => clearTimeout(t);
  }, [load]);

  const uniqueUsers = useMemo(() => new Set(events.map((e) => e.user?.id || e.email)).size, [events]);
  const pageCount = Math.max(1, Math.ceil(events.length / pageSize));
  const paged = useMemo(
    () => events.slice(page * pageSize, page * pageSize + pageSize),
    [events, page, pageSize],
  );

  return (
    <div className="ad-portal space-y-5">
      <header className="ad-hero">
        <div className="ad-hero-inner">
          <div className="ad-hero-brand">
            <div className="ad-hero-mark">
              <Activity className="h-7 w-7" strokeWidth={1.75} />
            </div>
            <div>
              <div className="ad-eyebrow">Security</div>
              <h1>Login Activity</h1>
              <p>See who signed in, when, from which IP and location — all roles.</p>
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
          <div className="ad-stat-label">Shown logins</div>
          <div className="ad-stat-value">{events.length.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">{total.toLocaleString("en-IN")} total matching</div>
        </div>
        <div className="ad-stat is-ok">
          <div className="ad-stat-label">Last 24 hours</div>
          <div className="ad-stat-value">{last24h.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">Across all roles</div>
        </div>
        <div className="ad-stat">
          <div className="ad-stat-label">Unique users (page)</div>
          <div className="ad-stat-value">{uniqueUsers.toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">In current result set</div>
        </div>
        <div className="ad-stat is-slate">
          <div className="ad-stat-label">Teachers logged</div>
          <div className="ad-stat-value">{(byRole.teacher || 0).toLocaleString("en-IN")}</div>
          <div className="ad-stat-sub">All-time events</div>
        </div>
      </div>

      <div className="ad-filter-bar">
        <label className="ad-filter-label" htmlFor="login-q">
          <Search className="h-4 w-4" />
          Search
        </label>
        <input
          id="login-q"
          className="ad-filter-select"
          placeholder="Name, email, IP, city…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="ad-filter-select" style={{ maxWidth: 180 }} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option>
          {roles.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r] || r}
            </option>
          ))}
        </select>
        <select
          className="ad-filter-select"
          style={{ maxWidth: 140 }}
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="all">All sources</option>
          <option value="web">Web</option>
          <option value="mobile">Mobile</option>
        </select>
      </div>

      <section className="ad-panel">
        <div className="ad-panel-head">
          <div>
            <h2>
              <Shield className="h-5 w-5 text-sky-700" />
              Recent sign-ins
            </h2>
            <p>IP address, approximate or GPS location, and device</p>
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
          ) : loading && events.length === 0 ? (
            <PageLoader />
          ) : events.length === 0 ? (
            <div className="ad-empty">
              <MonitorSmartphone className="h-9 w-9 opacity-40" />
              <p>No login events yet. Ask users to sign in once.</p>
            </div>
          ) : (
            <>
              <div className="relative overflow-x-auto">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/60">
                    <Spinner size="sm" />
                  </div>
                )}
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-3">#</th>
                      <th className="px-3 py-3">When</th>
                      <th className="px-3 py-3">User</th>
                      <th className="px-3 py-3">Role</th>
                      <th className="px-3 py-3">School</th>
                      <th className="px-3 py-3">IP</th>
                      <th className="px-3 py-3">Location</th>
                      <th className="px-3 py-3">Source</th>
                      <th className="px-3 py-3 text-right"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((e, idx) => {
                      const name = e.user?.name || e.email;
                      const school = e.user?.school;
                      const hasCoords = e.latitude != null && e.longitude != null;
                      return (
                        <tr key={e.id} className="border-t border-slate-100 hover:bg-sky-50/40">
                          <td className="px-3 py-3 text-xs tabular-nums text-slate-400">
                            {page * pageSize + idx + 1}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                            {new Date(e.createdAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                                {name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                                <p className="truncate font-mono text-[11px] text-slate-500">{e.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${roleBadgeClass(e.role)}`}
                            >
                              {ROLE_LABEL[e.role] || e.role}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            {school ? (
                              <div>
                                <p className="text-sm font-medium text-slate-800">{school.name}</p>
                                <p className="font-mono text-[11px] text-slate-500">{school.code}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-3 font-mono text-xs text-slate-600">{e.ip || "—"}</td>
                          <td className="px-3 py-3">
                            <div className="flex max-w-[14rem] items-start gap-1.5">
                              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium leading-snug text-slate-800">{placeLabel(e)}</p>
                                <p className="mt-0.5 text-[10px] text-slate-400">
                                  via {e.geoSource || "unknown"}
                                  {e.accuracyM != null ? ` · ±${e.accuracyM}m` : ""}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-xs font-semibold capitalize text-slate-600">
                            {e.source}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1.5">
                              {hasCoords && (
                                <a
                                  href={mapsUrl(e.latitude!, e.longitude!)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Map
                                </a>
                              )}
                              {school && (
                                <Link
                                  href={`/admin/schools/${school.id}`}
                                  className="inline-flex items-center rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                                >
                                  School
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-3 py-2 text-xs text-slate-500">
                <span>
                  Showing {page * pageSize + 1}–{Math.min(events.length, page * pageSize + pageSize)} of{" "}
                  {events.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                  >
                    Prev
                  </Button>
                  <span className="min-w-[4.5rem] text-center font-medium text-slate-600">
                    {page + 1} / {pageCount}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2"
                    disabled={page + 1 >= pageCount}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
