"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { PageShell } from "@/components/layout/page-shell";
import { useT } from "@/i18n/locale-provider";
import {
  Play, RefreshCw, Zap, CheckCircle, XCircle, Clock, Loader2,
  Square, CheckSquare, Bot, LogIn, Shield, Save, ExternalLink,
  Users, BookOpen, Filter, ChevronDown, ChevronRight,
} from "lucide-react";
import type { Student } from "@/generated/prisma/client";

interface StudentProgressItem {
  studentId: string;
  name: string;
  aadhaarNumber: string;
  status: string;
  dgAction: string;
  dgPortalStatus?: string;
  step: string;
  percent: number;
  message?: string;
}

interface SessionStatus {
  sjed: { configured: boolean; username: string | null; sessionSaved: boolean; lastLoginAt: string | null; profileReady: boolean };
  citizen: { configured: boolean; loginId: string | null; sessionSaved: boolean; lastLoginAt: string | null; profileReady: boolean };
}

interface JobData {
  id: string;
  status: string;
  mode: string;
  actionMode: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  currentStep?: string;
  overallPercent: number;
  logs?: string;
  studentProgress: StudentProgressItem[];
  startedAt?: string;
  finishedAt?: string;
}

interface RemoteBrowserConfig {
  enabled: boolean;
  url: string | null;
  label: string;
}

const PORTAL_OPTIONS = [
  { value: "sjed",    label: "SJED Login (School Portal)" },
  { value: "citizen", label: "Citizen Login (Student Portal)" },
];

const ACTION_OPTIONS = [
  { value: "auto",      label: "Auto Detect" },
  { value: "new_apply", label: "New Application" },
  { value: "edit",      label: "Edit / Update" },
];

function statusColor(status: string) {
  switch (status) {
    case "submitted": case "filled":  return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "running":                   return "bg-blue-50 text-blue-700 border border-blue-200";
    case "failed":                    return "bg-red-50 text-red-700 border border-red-200";
    case "pending":                   return "bg-slate-100 text-slate-600 border border-slate-200";
    default:                          return "bg-amber-50 text-amber-700 border border-amber-200";
  }
}

function statusDot(status: string) {
  switch (status) {
    case "submitted": case "filled": case "completed": return "bg-emerald-500";
    case "running":   return "bg-blue-500 animate-pulse";
    case "failed":    return "bg-red-500";
    default:          return "bg-slate-400";
  }
}

function actionLabel(action: string) {
  if (action === "new_apply")    return "New Apply";
  if (action === "edit")         return "Edit";
  if (action === "auto_detected") return "Auto";
  return action;
}

/* ── Group students by class (standard + section) ── */
function groupByClass(students: Student[]): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  for (const s of students) {
    const key = s.standard && s.section ? `${s.standard}-${s.section}` : s.standard ? `Std ${s.standard}` : "Unknown";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  // Sort: Balvatika first, then numerically, then unknown
  return new Map([...map.entries()].sort(([a], [b]) => {
    if (a === "Unknown") return 1;
    if (b === "Unknown") return -1;
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  }));
}

function AutoApplyContent() {
  const t = useT();
  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [actionMode, setActionMode] = useState("auto");
  const [portalType, setPortalType] = useState<"sjed" | "citizen">("sjed");
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [activeJob, setActiveJob] = useState<JobData | null>(null);
  const [recentJobs, setRecentJobs] = useState<{ id: string; status: string; totalCount: number; completedCount: number; createdAt: string }[]>([]);
  const [dgForm, setDgForm] = useState({
    dgSjedUsername: "", dgSjedPassword: "",
    dgCitizenLoginId: "", dgCitizenPassword: "", dgCitizenLoginMethod: "mobile",
  });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [remoteBrowser, setRemoteBrowser] = useState<RemoteBrowserConfig | null>(null);

  /* Class expansion */
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const toggleClass = (key: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  /* Filter */
  const [searchTerm, setSearchTerm] = useState("");
  const filteredStudents = students.filter((s) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.surname.toLowerCase().includes(q) ||
      s.aadhaarNumber.includes(q) ||
      s.category.toLowerCase().includes(q)
    );
  });

  const classGroups = groupByClass(filteredStudents);

  const loadSessionStatus = useCallback(() => {
    fetch("/api/automation/session-status")
      .then((r) => r.json())
      .then((d) => { if (d?.sjed && d?.citizen) setSessionStatus(d); })
      .catch(() => setSessionStatus(null));
  }, []);

  const loadDgSettings = useCallback(() => {
    fetch("/api/school/settings")
      .then((r) => r.json())
      .then((d) => {
        setDgForm({
          dgSjedUsername: d.dgSjedUsername || "",
          dgSjedPassword: "",
          dgCitizenLoginId: d.dgCitizenLoginId || "",
          dgCitizenPassword: "",
          dgCitizenLoginMethod: d.dgCitizenLoginMethod || "mobile",
        });
      });
  }, []);

  const loadStudents = useCallback(() => {
    fetch("/api/students?limit=500&status=ready")
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students || []);
        setSelected(new Set((d.students || []).map((s: Student) => s.id)));
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadStudents();
    loadDgSettings();
    loadSessionStatus();
    fetch("/api/automation/jobs")
      .then((r) => r.json())
      .then((d) => setRecentJobs(d.jobs || []));
  }, [loadStudents, loadDgSettings, loadSessionStatus]);

  useEffect(() => {
    fetch("/api/automation/remote-browser")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d?.enabled === "boolean") setRemoteBrowser(d as RemoteBrowserConfig);
      })
      .catch(() => setRemoteBrowser(null));
  }, []);

  useEffect(() => {
    if (!activeJob || ["completed", "failed", "partial"].includes(activeJob.status)) return;
    const interval = setInterval(async () => {
      const res = await fetch(`/api/automation/jobs/${activeJob.id}`);
      if (res.ok) setActiveJob((await res.json()).job);
    }, 2000);
    return () => clearInterval(interval);
  }, [activeJob?.id, activeJob?.status]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleClassSelection = (classStudents: Student[]) => {
    const allSelected = classStudents.every((s) => selected.has(s.id));
    setSelected((prev) => {
      const next = new Set(prev);
      for (const s of classStudents) {
        if (allSelected) next.delete(s.id);
        else next.add(s.id);
      }
      return next;
    });
  };

  const saveDgCredentials = async () => {
    if (portalType === "sjed" && !dgForm.dgSjedUsername.trim()) { alert("SJED username required"); return; }
    if (portalType === "citizen" && !dgForm.dgCitizenLoginId.trim()) { alert("Citizen login ID required"); return; }
    setSavingCreds(true);
    const body = portalType === "sjed"
      ? { dgSjedUsername: dgForm.dgSjedUsername, dgSjedPassword: dgForm.dgSjedPassword }
      : { dgCitizenLoginId: dgForm.dgCitizenLoginId, dgCitizenPassword: dgForm.dgCitizenPassword, dgCitizenLoginMethod: dgForm.dgCitizenLoginMethod };
    const res = await fetch("/api/school/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSavingCreds(false);
    if (res.ok) {
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2000);
      loadSessionStatus();
      loadDgSettings();
    }
  };

  const portalConfigured = portalType === "sjed" ? sessionStatus?.sjed?.configured || dgForm.dgSjedUsername.trim() : sessionStatus?.citizen?.configured || dgForm.dgCitizenLoginId.trim();
  const portalSessionSaved = portalType === "sjed" ? sessionStatus?.sjed?.sessionSaved : sessionStatus?.citizen?.sessionSaved;
  const portalLastLogin = portalType === "sjed" ? sessionStatus?.sjed?.lastLoginAt : sessionStatus?.citizen?.lastLoginAt;

  const startJob = async () => {
    if (!portalConfigured) { alert(portalType === "sjed" ? "Setup SJED login first" : "Setup Citizen login first"); return; }
    if ((portalType === "sjed" && dgForm.dgSjedUsername.trim() && !sessionStatus?.sjed?.configured) || (portalType === "citizen" && dgForm.dgCitizenLoginId.trim() && !sessionStatus?.citizen?.configured)) {
      await saveDgCredentials();
    }
    if (selected.size === 0) { alert("Select at least one student"); return; }
    setStarting(true);
    const res = await fetch("/api/automation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selected), mode: "auto", actionMode, portalType }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) { alert(data.error || "Failed to start automation"); return; }

    if (remoteBrowser?.enabled && remoteBrowser.url) {
      window.open(remoteBrowser.url, "_blank", "noopener,noreferrer");
    } else if (data.portalUrl) {
      const isLocal =
        window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isLocal) {
        window.open(data.portalUrl, "_blank", "noopener,noreferrer");
      }
    }

    const jobRes = await fetch(`/api/automation/jobs/${data.jobId}`);
    const jobData = await jobRes.json();
    setActiveJob(jobData.job);
    loadSessionStatus();
  };

  return (
    <PageShell
      title="Auto Apply Scholarship"
      subtitle="Automate bulk scholarship form filling for Digital Gujarat portal"
      icon={<Bot className="h-6 w-6" />}
      accentColor="border-emerald-500"
      breadcrumbs={[{ label: "Dashboard", href: "/" }, { label: "Auto Apply" }]}
      actions={
        <Button variant="outline" size="sm" onClick={loadStudents}>
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </Button>
      }
    >
      <div className="space-y-6">

        {/* Info banner */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 border border-emerald-200 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <div className="text-sm space-y-1">
              <p className="font-semibold text-slate-900">How It Works</p>
              <p className="text-slate-600">
                1. Select portal type & enter login credentials ·
                2. Choose students class-wise ·
                3. Hit Start — automation will fill & submit forms automatically
              </p>
              <p className="text-xs text-slate-500 mt-2">
                Localhost: Chromium browser khulega · VPS: Remote Browser URL se login karein
              </p>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="h-4 w-4 text-blue-600" />
              <p className="text-xs font-medium text-slate-500">Selected Students</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{selected.size}</p>
            <p className="text-xs text-slate-400 mt-0.5">out of {students.length}</p>
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <LogIn className="h-4 w-4 text-violet-600" />
              <p className="text-xs font-medium text-slate-500">Portal Type</p>
            </div>
            <p className="text-sm font-bold text-slate-900">{portalType === "sjed" ? "SJED Login" : "Citizen Login"}</p>
            {portalSessionSaved && <p className="text-xs text-green-600 mt-0.5 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-green-500" /> Session Active</p>}
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-xs font-medium text-slate-500">Current Job</p>
            </div>
            <p className="text-sm font-bold text-slate-900 capitalize">{activeJob?.status || "Idle"}</p>
            {activeJob && <p className="text-xs text-slate-400 mt-0.5">{activeJob.completedCount}/{activeJob.totalCount} done</p>}
          </div>
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-medium text-slate-500">Classes Found</p>
            </div>
            <p className="text-2xl font-bold text-slate-900">{classGroups.size}</p>
          </div>
        </div>

        {/* Main layout: left config panel + right student selector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* ── LEFT: Config + Controls ────────────────────────── */}
          <div className="lg:col-span-4 space-y-4">

            {/* Portal config */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                    <LogIn className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  Portal Login Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Portal Type"
                  options={PORTAL_OPTIONS}
                  value={portalType}
                  onChange={(e) => setPortalType(e.target.value as "sjed" | "citizen")}
                />

                {/* Session indicator */}
                {portalSessionSaved ? (
                  <div className="flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-xs text-emerald-800">
                    <Shield className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-semibold">Session active</p>
                      {portalLastLogin && <p className="opacity-70">Last: {new Date(portalLastLogin).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}</p>}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <p>No saved session — enter credentials below</p>
                  </div>
                )}

                {/* Credentials form */}
                {portalType === "sjed" ? (
                  <div className="space-y-3">
                    <Input
                      label="SJED Username"
                      value={dgForm.dgSjedUsername}
                      onChange={(e) => setDgForm({ ...dgForm, dgSjedUsername: e.target.value })}
                      placeholder="SJED User ID"
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={dgForm.dgSjedPassword}
                      onChange={(e) => setDgForm({ ...dgForm, dgSjedPassword: e.target.value })}
                      placeholder="Enter DG password"
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Select
                      label="Login Method"
                      options={[{ value: "mobile", label: "Mobile Number" }, { value: "email", label: "Email ID" }]}
                      value={dgForm.dgCitizenLoginMethod}
                      onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginMethod: e.target.value })}
                    />
                    <Input
                      label="Login ID"
                      value={dgForm.dgCitizenLoginId}
                      onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginId: e.target.value })}
                      placeholder="9876543210"
                    />
                    <Input
                      label="Password"
                      type="password"
                      value={dgForm.dgCitizenPassword}
                      onChange={(e) => setDgForm({ ...dgForm, dgCitizenPassword: e.target.value })}
                      placeholder="Enter password"
                    />
                  </div>
                )}

                <p className="text-[11px] text-slate-400">Credentials stored securely — not shared outside this device.</p>

                <Button variant="outline" className="w-full" onClick={saveDgCredentials} disabled={savingCreds}>
                  {savingCreds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {credsSaved ? "✓ Saved!" : "Save Credentials"}
                </Button>
              </CardContent>
            </Card>

            {/* Action settings + Start button */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Bot className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                  Automation Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Action Mode"
                  options={ACTION_OPTIONS}
                  value={actionMode}
                  onChange={(e) => setActionMode(e.target.value)}
                />
                <p className="text-xs text-slate-500 -mt-2">
                  Auto: Detect if new form or edit needed · New: Fresh application · Edit: Update existing
                </p>

                {/* Launch button */}
                <button
                  type="button"
                  onClick={startJob}
                  disabled={starting || selected.size === 0 || activeJob?.status === "running"}
                  className="w-full relative overflow-hidden rounded-xl px-4 py-3.5 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: "linear-gradient(135deg, #059669 0%, #0284c7 100%)" }}
                >
                  <span className="flex items-center justify-center gap-2">
                    {starting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Starting automation…</>
                    ) : activeJob?.status === "running" ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Running ({activeJob.completedCount}/{activeJob.totalCount})</>
                    ) : (
                      <><Play className="h-4 w-4" /> Start Auto Apply · {selected.size} students</>
                    )}
                  </span>
                </button>

                {selected.size === 0 && (
                  <p className="text-xs text-amber-600 text-center">Select at least one student to continue</p>
                )}

                {remoteBrowser?.enabled && remoteBrowser.url && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => window.open(remoteBrowser.url!, "_blank", "noopener,noreferrer")}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {remoteBrowser.label}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Recent jobs */}
            {recentJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="h-3.5 w-3.5 text-slate-600" />
                    Recent Jobs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {recentJobs.slice(0, 5).map((j) => (
                    <button
                      key={j.id}
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/automation/jobs/${j.id}`);
                        const d = await res.json();
                        setActiveJob(d.job);
                      }}
                      className="w-full text-left rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-semibold capitalize inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${statusColor(j.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(j.status)}`} />
                          {j.status}
                        </span>
                        <span className="text-slate-600">{j.completedCount}/{j.totalCount}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">{new Date(j.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── RIGHT: Student Selector + Live Status ─────────── */}
          <div className="lg:col-span-8 space-y-4">

            {/* Live job status */}
            {activeJob && (
              <Card className="border-blue-200 bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${activeJob.status === "running" ? "bg-blue-500" : activeJob.status === "completed" ? "bg-emerald-500" : "bg-red-500"}`}>
                        {activeJob.status === "running" ? <Loader2 className="h-4 w-4 animate-spin text-white" /> : activeJob.status === "completed" ? <CheckCircle className="h-4 w-4 text-white" /> : <XCircle className="h-4 w-4 text-white" />}
                      </div>
                      <div>
                        <CardTitle className="text-sm">Live Automation Status</CardTitle>
                        <p className="text-xs text-slate-500 mt-0.5">{activeJob.currentStep || "Processing students..."}</p>
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${statusColor(activeJob.status)}`}>
                      {activeJob.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Progress bar */}
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex justify-between text-xs text-slate-500 mb-2">
                      <span>Overall Progress</span>
                      <span className="font-semibold text-slate-800">{activeJob.overallPercent}%</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-700" style={{ width: `${activeJob.overallPercent}%` }} />
                    </div>
                    <div className="flex gap-4 mt-2.5 text-xs">
                      <span className="text-emerald-600 font-medium">✓ {activeJob.completedCount} done</span>
                      <span className="text-red-600 font-medium">✗ {activeJob.failedCount} failed</span>
                      <span className="text-slate-500">· {activeJob.totalCount} total</span>
                    </div>
                  </div>

                  {/* Student progress list */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {activeJob.studentProgress?.map((sp) => (
                      <div key={sp.studentId} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-medium text-sm text-slate-800">{sp.name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor(sp.status)}`}>
                            {sp.status}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {sp.dgAction && sp.dgAction !== "unknown" && (
                            <span className="text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-full text-slate-600">{actionLabel(sp.dgAction)}</span>
                          )}
                          {sp.dgPortalStatus && (
                            <span className="text-[10px] bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full text-violet-700">DG: {sp.dgPortalStatus}</span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mb-2">{sp.step}</p>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${sp.percent}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Logs */}
                  {activeJob.logs && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-medium text-slate-600 hover:text-slate-800 flex items-center gap-1.5">
                        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" />
                        View execution logs
                      </summary>
                      <pre className="mt-2 text-[10px] bg-slate-900 text-green-400 p-3 rounded-xl max-h-32 overflow-y-auto whitespace-pre-wrap">
                        {activeJob.logs.split("\n").slice(-30).join("\n")}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Class-wise student selection */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div>
                      <CardTitle className="text-sm">Select Students by Class</CardTitle>
                      <p className="text-xs text-slate-500 mt-0.5">{students.length} ready students · {classGroups.size} classes</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelected(new Set(filteredStudents.map((s) => s.id)))}
                      className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:bg-slate-200 transition-colors"
                    >
                      Deselect All
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="relative mt-3">
                  <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name, Aadhaar or category…"
                    className="w-full h-9 pl-8 pr-3 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all"
                  />
                </div>
              </CardHeader>

              <CardContent className="p-0 pb-2">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    <p className="text-sm text-slate-500">Loading students…</p>
                  </div>
                ) : students.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                    <Users className="h-10 w-10 opacity-40" />
                    <p className="text-sm font-medium">No ready students found</p>
                    <p className="text-xs opacity-60">Mark students as &quot;ready&quot; to appear here</p>
                  </div>
                ) : classGroups.size === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                    <p className="text-sm">No results for &quot;{searchTerm}&quot;</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {[...classGroups.entries()].map(([classKey, classStudents]) => {
                      const allSelected = classStudents.every((s) => selected.has(s.id));
                      const someSelected = classStudents.some((s) => selected.has(s.id));
                      const isOpen = expandedClasses.has(classKey);
                      const selectedCount = classStudents.filter((s) => selected.has(s.id)).length;

                      return (
                        <div key={classKey}>
                          {/* Class header row */}
                          <div
                            className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors"
                          >
                            {/* Checkbox for whole class */}
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); toggleClassSelection(classStudents); }}
                              className="shrink-0"
                            >
                              {allSelected ? (
                                <CheckSquare className="h-4.5 w-4.5 text-emerald-600" />
                              ) : someSelected ? (
                                <div className="h-4 w-4 rounded border-2 border-emerald-500 bg-emerald-100 flex items-center justify-center">
                                  <div className="h-1.5 w-2.5 bg-emerald-500 rounded" />
                                </div>
                              ) : (
                                <Square className="h-4 w-4 text-slate-400" />
                              )}
                            </button>

                            {/* Class label */}
                            <div className="flex-1 flex items-center gap-3" onClick={() => toggleClass(classKey)}>
                              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)" }}>
                                {classKey.split("-")[0]}
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-800">Class {classKey}</p>
                                <p className="text-xs text-slate-500">{classStudents.length} students · {selectedCount} selected</p>
                              </div>
                            </div>

                            {/* Selection progress pill */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="hidden sm:flex items-center gap-1.5">
                                <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(selectedCount / classStudents.length) * 100}%` }} />
                                </div>
                                <span className="text-xs text-slate-500">{selectedCount}/{classStudents.length}</span>
                              </div>
                              <button type="button" onClick={() => toggleClass(classKey)} className="text-slate-400 hover:text-slate-600">
                                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Expanded student list */}
                          {isOpen && (
                            <div className="bg-slate-50/50 border-t border-slate-100">
                              {classStudents.map((s, idx) => {
                                const isSelected = selected.has(s.id);
                                return (
                                  <div
                                    key={s.id}
                                    onClick={() => toggleSelect(s.id)}
                                    className={`flex items-center gap-3 px-5 py-2.5 cursor-pointer transition-colors border-b border-slate-100/80 last:border-b-0 ${isSelected ? "bg-emerald-50/60" : "hover:bg-white"}`}
                                  >
                                    {/* Seq */}
                                    <span className="shrink-0 w-5 text-xs text-slate-400 text-right">{idx + 1}</span>

                                    {/* Checkbox */}
                                    {isSelected ? (
                                      <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                                    ) : (
                                      <Square className="h-4 w-4 text-slate-400 shrink-0" />
                                    )}

                                    {/* Student avatar */}
                                    <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white uppercase" style={{ background: isSelected ? "#059669" : "#94a3b8" }}>
                                      {s.firstName.charAt(0)}
                                    </div>

                                    {/* Student info */}
                                    <div className="flex-1 min-w-0">
                                      <p className={`text-sm font-medium truncate ${isSelected ? "text-slate-900" : "text-slate-700"}`}>
                                        {s.firstName} {s.middleName ? s.middleName + " " : ""}{s.surname}
                                      </p>
                                      <p className="text-xs text-slate-400 truncate">
                                        {s.aadhaarNumber} · {s.scholarshipScheme}
                                      </p>
                                    </div>

                                    {/* Badges */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <CategoryBadge category={s.category} />
                                      <Badge status={s.status} />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </PageShell>
  );
}

export default function AutoApplyPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600" />
        <p className="text-sm text-slate-500">Loading Auto Apply…</p>
      </div>
    }>
      <AutoApplyContent />
    </Suspense>
  );
}
