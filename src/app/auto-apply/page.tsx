"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CategoryBadge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";
import {
  Play, RefreshCw, CheckCircle, XCircle, Clock, Loader2,
  Square, CheckSquare, Bot, LogIn, Shield, Save, ExternalLink,
  Users, BookOpen, Search, ChevronDown, Info, X,
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

function statusColor(status: string) {
  switch (status) {
    case "submitted": case "filled":  return "bg-emerald-50 text-emerald-700";
    case "running":                   return "bg-blue-50 text-blue-700";
    case "failed":                    return "bg-red-50 text-red-700";
    case "pending":                   return "bg-slate-100 text-slate-600";
    default:                          return "bg-amber-50 text-amber-700";
  }
}

function groupByClass(students: Student[], unknownLabel: string): Map<string, Student[]> {
  const map = new Map<string, Student[]>();
  for (const s of students) {
    const key = s.standard && s.section ? `${s.standard}-${s.section}` : s.standard ? `Std ${s.standard}` : unknownLabel;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  }
  return new Map([...map.entries()].sort(([a], [b]) => {
    if (a === unknownLabel) return 1;
    if (b === unknownLabel) return -1;
    const numA = parseInt(a), numB = parseInt(b);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    return a.localeCompare(b);
  }));
}

function AutoApplyContent() {
  const t = useT();

  const portalOptions = [
    { value: "sjed", label: t("autoApply.portalOptionSjed") },
    { value: "citizen", label: t("autoApply.portalOptionCitizen") },
  ];
  const actionOptions = [
    { value: "auto", label: t("autoApply.actionAutoDetect") },
    { value: "new_apply", label: t("autoApply.actionNewApplication") },
    { value: "edit", label: t("autoApply.actionEditUpdate") },
  ];
  const loginMethodOptions = [
    { value: "mobile", label: t("autoApply.mobileNumber") },
    { value: "email", label: t("autoApply.emailId") },
  ];

  const actionLabel = (action: string) => {
    if (action === "new_apply") return t("autoApply.actionNewApplyLabel");
    if (action === "edit") return t("autoApply.actionEditLabel");
    if (action === "auto_detected") return t("autoApply.actionAutoLabel");
    return action;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      submitted: t("autoApply.statusSubmitted"),
      filled: t("autoApply.statusFilled"),
      running: t("autoApply.statusRunning"),
      failed: t("autoApply.statusFailed"),
      pending: t("autoApply.statusPending"),
      completed: t("autoApply.statusCompleted"),
      partial: t("autoApply.statusPartial"),
    };
    return map[status] ?? status;
  };

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
  const [activeClassKey, setActiveClassKey] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const allClassGroups = useMemo(
    () => groupByClass(students, t("autoApply.unknownClass")),
    [students, t]
  );

  const classOptions = useMemo(
    () =>
      [...allClassGroups.entries()].map(([key, list]) => ({
        value: key,
        label: `${t("autoApply.classLabel", { name: key })} (${list.length})`,
      })),
    [allClassGroups, t]
  );

  const activeClassStudents = useMemo(() => {
    if (!activeClassKey) return [];
    const base = allClassGroups.get(activeClassKey) || [];
    if (!searchTerm.trim()) return base;
    const q = searchTerm.toLowerCase();
    return base.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.surname.toLowerCase().includes(q) ||
        s.aadhaarNumber.includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [activeClassKey, allClassGroups, searchTerm]);

  const activeClassTotal = activeClassKey ? (allClassGroups.get(activeClassKey)?.length || 0) : 0;

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
    setLoading(true);
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
    if (portalType === "sjed" && !dgForm.dgSjedUsername.trim()) { alert(t("autoApply.sjedUsernameRequired")); return; }
    if (portalType === "citizen" && !dgForm.dgCitizenLoginId.trim()) { alert(t("autoApply.citizenSetupRequired")); return; }
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
  const jobRunning = activeJob?.status === "running";

  const startJob = async () => {
    if (!portalConfigured) { alert(portalType === "sjed" ? t("autoApply.setupSjedFirst") : t("autoApply.setupCitizenFirst")); return; }
    if ((portalType === "sjed" && dgForm.dgSjedUsername.trim() && !sessionStatus?.sjed?.configured) || (portalType === "citizen" && dgForm.dgCitizenLoginId.trim() && !sessionStatus?.citizen?.configured)) {
      await saveDgCredentials();
    }
    if (selected.size === 0) { alert(t("autoApply.selectStudents")); return; }
    setStarting(true);
    const res = await fetch("/api/automation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selected), mode: "auto", actionMode, portalType }),
    });
    const data = await res.json();
    setStarting(false);
    if (!res.ok) { alert(data.error || t("autoApply.automationStartFailed")); return; }

    if (remoteBrowser?.enabled && remoteBrowser.url) {
      window.open(remoteBrowser.url, "_blank", "noopener,noreferrer");
    } else if (data.portalUrl) {
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (!isLocal) window.open(data.portalUrl, "_blank", "noopener,noreferrer");
    }

    const jobRes = await fetch(`/api/automation/jobs/${data.jobId}`);
    const jobData = await jobRes.json();
    setActiveJob(jobData.job);
    setShowJobDetail(true);
    loadSessionStatus();
  };

  const fullClassStudents = activeClassKey ? allClassGroups.get(activeClassKey) || [] : [];
  const activeClassSelected = fullClassStudents.filter((s) => selected.has(s.id)).length;
  const allActiveClassSelected = fullClassStudents.length > 0 && fullClassStudents.every((s) => selected.has(s.id));

  return (
    <div className="flex flex-col h-[calc(100vh-5.5rem)] min-h-[520px] -m-1">
      {/* Compact top bar */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white shadow-lg shadow-emerald-200/40">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-slate-900 truncate">{t("autoApply.pageTitle")}</h1>
            <p className="text-xs text-slate-500 truncate">{t("autoApply.pageSubtitle")}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden sm:flex items-center gap-2">
            <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white px-3 py-2 text-xs shadow-sm">
              <span className="text-slate-500">{t("autoApply.selectedStudents")}</span>
              <span className="ml-1.5 text-lg font-bold text-emerald-700">{selected.size}</span>
            </div>
            <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white px-3 py-2 text-xs shadow-sm">
              <span className="text-slate-500">{t("autoApply.classesFound")}</span>
              <span className="ml-1.5 text-lg font-bold text-violet-700">{allClassGroups.size}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            title={t("autoApply.howItWorksTitle")}
          >
            <Info className="h-4 w-4" />
          </button>
          <Button variant="outline" size="sm" onClick={loadStudents}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t("autoApply.refresh")}</span>
          </Button>
        </div>
      </div>

      {showHelp && (
        <div className="shrink-0 mb-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="flex-1">{t("autoApply.howItWorksSteps")}</p>
          <button type="button" onClick={() => setShowHelp(false)} className="text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Main split — fixed height, internal scroll only */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 pt-3 lg:flex-row lg:gap-4">

        {/* Left controls — sticky, compact */}
        <aside className="lg:w-72 xl:w-80 shrink-0 flex flex-col gap-3 lg:overflow-y-auto lg:max-h-full">
          {/* Quick settings card */}
          <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50 p-4 shadow-md shadow-slate-200/30 space-y-3">
            <Select
              label={t("autoApply.portalTypeLabel")}
              options={portalOptions}
              value={portalType}
              onChange={(e) => setPortalType(e.target.value as "sjed" | "citizen")}
            />
            <Select
              label={t("autoApply.actionModeLabel")}
              options={actionOptions}
              value={actionMode}
              onChange={(e) => setActionMode(e.target.value)}
            />

            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-600">
                {portalSessionSaved ? (
                  <><Shield className="h-3.5 w-3.5 text-emerald-600" /><span className="text-emerald-700 font-medium">{t("autoApply.sessionActiveBadge")}</span></>
                ) : (
                  <><Clock className="h-3.5 w-3.5 text-amber-500" /><span className="text-amber-700">{t("autoApply.noSavedSession")}</span></>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowLoginPanel((v) => !v)}
                className="font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
              >
                <LogIn className="h-3 w-3" />
                {showLoginPanel ? t("common.cancel") : t("autoApply.saveCredentials")}
                <ChevronDown className={`h-3 w-3 transition-transform ${showLoginPanel ? "rotate-180" : ""}`} />
              </button>
            </div>

            {showLoginPanel && (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                {portalType === "sjed" ? (
                  <>
                    <Input label={t("autoApply.sjedUsername")} value={dgForm.dgSjedUsername} onChange={(e) => setDgForm({ ...dgForm, dgSjedUsername: e.target.value })} placeholder={t("autoApply.sjedUserIdPlaceholder")} />
                    <Input label={t("autoApply.passwordLabel")} type="password" value={dgForm.dgSjedPassword} onChange={(e) => setDgForm({ ...dgForm, dgSjedPassword: e.target.value })} placeholder={t("autoApply.enterDgPassword")} />
                  </>
                ) : (
                  <>
                    <Select label={t("autoApply.loginMethod")} options={loginMethodOptions} value={dgForm.dgCitizenLoginMethod} onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginMethod: e.target.value })} />
                    <Input label={t("autoApply.loginId")} value={dgForm.dgCitizenLoginId} onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginId: e.target.value })} placeholder="9876543210" />
                    <Input label={t("autoApply.passwordLabel")} type="password" value={dgForm.dgCitizenPassword} onChange={(e) => setDgForm({ ...dgForm, dgCitizenPassword: e.target.value })} placeholder={t("autoApply.enterPassword")} />
                  </>
                )}
                {portalLastLogin && (
                  <p className="text-[10px] text-slate-400">{t("autoApply.lastLogin", { date: new Date(portalLastLogin).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" }) })}</p>
                )}
                <Button variant="outline" size="sm" className="w-full" onClick={saveDgCredentials} disabled={savingCreds}>
                  {savingCreds ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {credsSaved ? t("autoApply.savedOk") : t("autoApply.saveCredentials")}
                </Button>
              </div>
            )}

            <button
              type="button"
              onClick={startJob}
              disabled={starting || selected.size === 0 || jobRunning}
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-emerald-200/50"
              style={{ background: "linear-gradient(135deg, #059669 0%, #0284c7 100%)" }}
            >
              <span className="flex items-center justify-center gap-2">
                {starting || jobRunning ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />{jobRunning ? t("autoApply.runningJob", { done: activeJob!.completedCount, total: activeJob!.totalCount }) : t("autoApply.startingAutomation")}</>
                ) : (
                  <><Play className="h-4 w-4" />{t("autoApply.startWithCount", { count: selected.size })}</>
                )}
              </span>
            </button>

            {remoteBrowser?.enabled && remoteBrowser.url && (
              <Button variant="outline" size="sm" className="w-full" onClick={() => window.open(remoteBrowser.url!, "_blank", "noopener,noreferrer")}>
                <ExternalLink className="h-3.5 w-3.5" />{remoteBrowser.label}
              </Button>
            )}
          </div>

          {/* Recent jobs — compact list */}
          {recentJobs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <p className="text-xs font-semibold text-slate-600 mb-2 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />{t("autoApply.recentJobs")}
              </p>
              <div className="space-y-1 max-h-28 overflow-y-auto">
                {recentJobs.slice(0, 4).map((j) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/automation/jobs/${j.id}`);
                      const d = await res.json();
                      setActiveJob(d.job);
                      setShowJobDetail(true);
                    }}
                    className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs hover:bg-slate-50"
                  >
                    <span className={`px-1.5 py-0.5 rounded font-medium capitalize ${statusColor(j.status)}`}>{statusLabel(j.status)}</span>
                    <span className="text-slate-500">{j.completedCount}/{j.totalCount}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Right — class dropdown + student list */}
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40">
          {/* Panel header */}
          <div className="shrink-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">{t("autoApply.selectStudentsByClass")}</h2>
                  <p className="text-[11px] text-white/80">{t("autoApply.readyStudentsSummary", { students: students.length, classes: allClassGroups.size })}</p>
                </div>
              </div>
              {activeClassKey && (
                <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs backdrop-blur">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold">{activeClassSelected}/{activeClassTotal}</span>
                  <span className="text-white/70">{t("autoApply.selectedStudents").toLowerCase()}</span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-4 border-violet-100" />
                <Loader2 className="absolute inset-0 m-auto h-12 w-12 animate-spin text-violet-600" />
              </div>
              <p className="text-sm text-slate-500">{t("autoApply.loadingStudents")}</p>
            </div>
          ) : students.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-slate-400">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Users className="h-8 w-8 opacity-40" />
              </div>
              <p className="text-sm font-medium text-slate-600">{t("autoApply.noReadyStudentsFound")}</p>
              <p className="text-xs">{t("autoApply.markReadyHint")}</p>
            </div>
          ) : (
            <>
              {/* Class selector + search */}
              <div className="shrink-0 space-y-3 border-b border-slate-100 bg-gradient-to-b from-violet-50/50 to-white px-4 py-4">
                <Select
                  label={t("autoApply.selectClassLabel")}
                  options={classOptions}
                  value={activeClassKey}
                  onChange={(e) => {
                    setActiveClassKey(e.target.value);
                    setSearchTerm("");
                  }}
                  emptyLabel={t("autoApply.selectClassPlaceholder")}
                  className="h-11 text-base font-medium border-violet-200 focus:border-violet-500 focus:ring-violet-500/20 bg-white shadow-sm"
                />

                {activeClassKey ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="relative min-w-[160px] flex-1">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={t("autoApply.searchStudentsPlaceholder")}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleClassSelection(fullClassStudents)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      {allActiveClassSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {t("autoApply.selectAllInClass")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelected(new Set())}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      {t("autoApply.deselectAll")}
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Student list or empty state */}
              <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/30">
                {!activeClassKey ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-inner">
                      <BookOpen className="h-9 w-9 text-violet-500" />
                    </div>
                    <p className="max-w-xs text-sm font-medium text-slate-600">{t("autoApply.selectClassFirst")}</p>
                    <p className="text-xs text-slate-400">{t("autoApply.selectClassPlaceholder")}</p>
                  </div>
                ) : activeClassStudents.length === 0 ? (
                  <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-8 text-slate-400">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{t("autoApply.noSearchResults", { term: searchTerm })}</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    <p className="px-1 text-xs font-medium text-slate-500">
                      {t("autoApply.studentsInClass", { count: activeClassTotal })}
                      {searchTerm.trim() ? ` · ${activeClassStudents.length} shown` : ""}
                    </p>
                    {activeClassStudents.map((s, idx) => {
                      const isSelected = selected.has(s.id);
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => toggleSelect(s.id)}
                          className={`w-full flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all ${
                            isSelected
                              ? "border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 shadow-sm shadow-emerald-100/50"
                              : "border-slate-200/80 bg-white hover:border-violet-200 hover:shadow-md hover:shadow-violet-100/30"
                          }`}
                        >
                          <span className="w-6 text-center text-xs font-medium text-slate-400 shrink-0">{idx + 1}</span>
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-sm ${isSelected ? "bg-gradient-to-br from-emerald-500 to-teal-600" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>
                            {s.firstName.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {s.firstName} {s.middleName ? s.middleName + " " : ""}{s.surname}
                            </p>
                            <p className="text-xs text-slate-500 truncate mt-0.5">
                              {s.aadhaarNumber} · {s.scholarshipScheme}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1.5">
                            <CategoryBadge category={s.category} />
                            {isSelected ? (
                              <CheckSquare className="h-5 w-5 text-emerald-600" />
                            ) : (
                              <Square className="h-5 w-5 text-slate-300" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Live job — slim bottom bar, expand on click */}
      {activeJob && (
        <div className="shrink-0 mt-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 overflow-hidden shadow-sm">
          <button
            type="button"
            onClick={() => setShowJobDetail((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/40 transition-colors"
          >
            {activeJob.status === "running" ? (
              <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />
            ) : activeJob.status === "completed" ? (
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-sm font-semibold text-slate-800 truncate">{activeJob.currentStep || t("autoApply.processingStudents")}</span>
                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${statusColor(activeJob.status)}`}>{statusLabel(activeJob.status)}</span>
              </div>
              <div className="h-1.5 bg-white/80 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 transition-all duration-500" style={{ width: `${activeJob.overallPercent}%` }} />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                {activeJob.overallPercent}% · ✓ {activeJob.completedCount} · ✗ {activeJob.failedCount} · {activeJob.totalCount} {t("autoApply.total")}
              </p>
            </div>
            <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${showJobDetail ? "rotate-180" : ""}`} />
          </button>

          {showJobDetail && (
            <div className="border-t border-blue-100 bg-white/60 px-4 py-3 max-h-48 overflow-y-auto space-y-2">
              {activeJob.studentProgress?.map((sp) => (
                <div key={sp.studentId} className="flex items-center gap-3 text-xs">
                  <span className="font-medium text-slate-800 min-w-[100px] truncate">{sp.name}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden min-w-[60px]">
                    <div className="h-full bg-blue-500 transition-all" style={{ width: `${sp.percent}%` }} />
                  </div>
                  <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor(sp.status)}`}>{statusLabel(sp.status)}</span>
                  {sp.dgAction && sp.dgAction !== "unknown" && (
                    <span className="hidden md:inline text-[10px] text-slate-500">{actionLabel(sp.dgAction)}</span>
                  )}
                </div>
              ))}
              {activeJob.logs && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-slate-500">{t("autoApply.viewExecutionLogs")}</summary>
                  <pre className="mt-1 text-[10px] bg-slate-900 text-green-400 p-2 rounded-lg max-h-24 overflow-y-auto whitespace-pre-wrap">
                    {activeJob.logs.split("\n").slice(-20).join("\n")}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AutoApplyLoading() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-200 border-t-emerald-600" />
      <p className="text-sm text-slate-500">{t("autoApply.loadingPage")}</p>
    </div>
  );
}

export default function AutoApplyPage() {
  return (
    <Suspense fallback={<AutoApplyLoading />}>
      <AutoApplyContent />
    </Suspense>
  );
}
