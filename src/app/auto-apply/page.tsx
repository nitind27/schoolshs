"use client";

import { Spinner, PageLoader } from "@/components/ui/loader";
import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CategoryBadge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";
import { Play, RefreshCw, CheckCircle, XCircle, Clock, Square, CheckSquare, Bot, LogIn, Shield, Save, ExternalLink, Users, BookOpen, Search, ChevronDown, Info, X } from "lucide-react";
import type { Student } from "@/generated/prisma/client";
import { normalizeCategory } from "@/lib/category-inference";

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

interface PreflightData {
  students: Array<{
    id: string;
    name: string;
    scheme: string;
    portalType: "sjed" | "citizen";
    ready: boolean;
    missingFields: Array<{ field: string; message: string }>;
    missingDocuments: string[];
    invalidDocuments: string[];
    documents: Array<{
      type: string;
      required: boolean;
      available: boolean;
      dgReady: boolean;
      size: number | null;
      maxKB: number;
    }>;
  }>;
  summary: {
    selected: number;
    found: number;
    ready: number;
    blocked: number;
    portalTypes: Array<"sjed" | "citizen">;
    mixedPortals: boolean;
  };
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

function isScholarshipEligibleStudent(student: Student): boolean {
  return normalizeCategory(student.category) !== "Open";
}

function sortAcademicValues(a: string, b: string): number {
  const numA = parseInt(a, 10);
  const numB = parseInt(b, 10);
  if (!Number.isNaN(numA) && !Number.isNaN(numB) && numA !== numB) {
    return numA - numB;
  }
  return a.localeCompare(b, undefined, { numeric: true });
}

function AutoApplyContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const preselectIds = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
  }, [searchParams]);

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
  const [selectedStandard, setSelectedStandard] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [excludedOpenCount, setExcludedOpenCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showLoginPanel, setShowLoginPanel] = useState(false);
  const [showJobDetail, setShowJobDetail] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [preflight, setPreflight] = useState<PreflightData | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);

  const classOptions = useMemo(() => {
    const standards = [...new Set(students.map((s) => s.standard?.trim()).filter(Boolean) as string[])]
      .sort(sortAcademicValues);
    return standards.map((standard) => ({
      value: standard,
      label: `${t("autoApply.classLabel", { name: standard })} (${
        students.filter((s) => s.standard?.trim() === standard).length
      })`,
    }));
  }, [students, t]);

  const divisionOptions = useMemo(() => {
    if (!selectedStandard) return [];
    const sections = [...new Set(
      students
        .filter((s) => s.standard?.trim() === selectedStandard)
        .map((s) => s.section?.trim())
        .filter(Boolean) as string[],
    )].sort(sortAcademicValues);
    return sections.map((section) => ({
      value: section,
      label: `${t("autoApply.divisionLabel", { name: section })} (${
        students.filter(
          (s) =>
            s.standard?.trim() === selectedStandard &&
            s.section?.trim() === section,
        ).length
      })`,
    }));
  }, [selectedStandard, students, t]);

  const categoryOptions = useMemo(() => {
    if (!selectedStandard || !selectedSection) return [];
    const categories = [...new Set(
      students
        .filter(
          (s) =>
            s.standard?.trim() === selectedStandard &&
            s.section?.trim() === selectedSection,
        )
        .map((s) => normalizeCategory(s.category))
        .filter((category): category is NonNullable<typeof category> =>
          Boolean(category && category !== "Open"),
        ),
    )].sort();
    return categories.map((category) => ({
      value: category,
      label: `${category} (${
        students.filter(
          (s) =>
            s.standard?.trim() === selectedStandard &&
            s.section?.trim() === selectedSection &&
            normalizeCategory(s.category) === category,
        ).length
      })`,
    }));
  }, [selectedSection, selectedStandard, students]);

  const fullFilteredStudents = useMemo(() => {
    if (!selectedStandard || !selectedSection || !selectedCategory) return [];
    return students.filter(
      (s) =>
        s.standard?.trim() === selectedStandard &&
        s.section?.trim() === selectedSection &&
        normalizeCategory(s.category) === selectedCategory,
    );
  }, [selectedCategory, selectedSection, selectedStandard, students]);

  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return fullFilteredStudents;
    const q = searchTerm.toLowerCase();
    return fullFilteredStudents.filter(
      (s) =>
        s.firstName.toLowerCase().includes(q) ||
        s.surname.toLowerCase().includes(q) ||
        s.aadhaarNumber.includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [fullFilteredStudents, searchTerm]);

  const activeFilterTotal = fullFilteredStudents.length;

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
    const readyPromise = fetch("/api/students?limit=500&status=ready").then((r) => r.json());
    const selectedPromise =
      preselectIds.size > 0
        ? fetch(`/api/students?ids=${[...preselectIds].join(",")}&limit=100`).then((r) => r.json())
        : Promise.resolve({ students: [] });

    Promise.all([readyPromise, selectedPromise])
      .then(([readyData, selectedData]) => {
        const map = new Map<string, Student>();
        for (const s of (readyData.students || []) as Student[]) map.set(s.id, s);
        for (const s of (selectedData.students || []) as Student[]) map.set(s.id, s);
        const allStudents = [...map.values()];
        const list = allStudents.filter(isScholarshipEligibleStudent);
        setStudents(list);
        setExcludedOpenCount(allStudents.length - list.length);

        if (preselectIds.size > 0) {
          const valid = new Set(list.filter((s) => preselectIds.has(s.id)).map((s) => s.id));
          setSelected(valid);
          const first = list.find((s) => valid.has(s.id));
          if (first) {
            setSelectedStandard(first.standard?.trim() || "");
            setSelectedSection(first.section?.trim() || "");
            setSelectedCategory(normalizeCategory(first.category) || "");
          }
        } else {
          setSelected(new Set());
        }
      })
      .finally(() => setLoading(false));
  }, [preselectIds, t]);

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

  const portalSessionSaved = portalType === "sjed" ? sessionStatus?.sjed?.sessionSaved : sessionStatus?.citizen?.sessionSaved;
  const portalLastLogin = portalType === "sjed" ? sessionStatus?.sjed?.lastLoginAt : sessionStatus?.citizen?.lastLoginAt;
  const jobRunning = activeJob?.status === "running";

  const startJob = async () => {
    if (selected.size === 0) { alert(t("autoApply.selectStudents")); return; }
    setStarting(true);
    const response = await fetch("/api/automation/preflight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selected) }),
    });
    const data = await response.json();
    setStarting(false);
    if (!response.ok) {
      alert(data.error || t("autoApply.automationStartFailed"));
      return;
    }
    const next = data as PreflightData;
    setPreflight(next);
    if (next.summary.portalTypes.length === 1) {
      setPortalType(next.summary.portalTypes[0]);
    }
  };

  const launchPreflightJob = async () => {
    if (!preflight || preflight.summary.blocked > 0 || preflight.summary.mixedPortals) {
      return;
    }
    const resolvedPortal = preflight.summary.portalTypes[0];
    if (!resolvedPortal) return;
    const configured =
      resolvedPortal === "sjed"
        ? sessionStatus?.sjed?.configured
        : sessionStatus?.citizen?.configured;
    if (!configured) {
      setPortalType(resolvedPortal);
      setShowLoginPanel(true);
      alert(
        resolvedPortal === "sjed"
          ? t("autoApply.setupSjedFirst")
          : t("autoApply.setupCitizenFirst"),
      );
      return;
    }

    setStarting(true);
    const res = await fetch("/api/automation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: preflight.students.map((student) => student.id),
        mode: "auto",
        actionMode,
      }),
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
    setPreflight(null);
    loadSessionStatus();
  };

  const sendJobOtp = async () => {
    if (!activeJob || !/^\d{4,8}$/.test(otpCode.trim())) return;
    setSendingOtp(true);
    const response = await fetch(`/api/automation/jobs/${activeJob.id}/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: otpCode.trim() }),
    });
    const payload = await response.json().catch(() => ({}));
    setSendingOtp(false);
    if (!response.ok) {
      alert(payload.error || "OTP send failed");
      return;
    }
    setOtpCode("");
  };

  const activeFilterSelected = fullFilteredStudents.filter((s) => selected.has(s.id)).length;
  const allActiveFilterSelected =
    fullFilteredStudents.length > 0 &&
    fullFilteredStudents.every((s) => selected.has(s.id));

  return (
    <div className="-m-1 flex min-h-0 flex-col lg:h-[calc(100dvh-5.5rem)] lg:min-h-[520px]">
      {preselectIds.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
          <span className="font-medium">
            {t("autoApply.preselectedHint", { count: selected.size || preselectIds.size })}
          </span>
          <a href="/auto-apply" className="font-semibold underline underline-offset-2">
            {t("autoApply.clearPreselect")}
          </a>
        </div>
      )}
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
              <span className="ml-1.5 text-lg font-bold text-violet-700">{classOptions.length}</span>
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
                  {savingCreds ? <Spinner size="sm" /> : <Save className="h-3.5 w-3.5" />}
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
                  <><Spinner size="sm" />{jobRunning ? t("autoApply.runningJob", { done: activeJob!.completedCount, total: activeJob!.totalCount }) : t("autoApply.startingAutomation")}</>
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
        <section className="flex min-h-0 flex-1 flex-col overflow-visible rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 lg:overflow-hidden">
          {/* Panel header */}
          <div className="shrink-0 bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 px-4 py-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold">{t("autoApply.selectStudentsByClass")}</h2>
                  <p className="text-[11px] text-white/80">{t("autoApply.readyStudentsSummary", { students: students.length, classes: classOptions.length })}</p>
                </div>
              </div>
              {selectedStandard && selectedSection && selectedCategory && (
                <div className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs backdrop-blur">
                  <Users className="h-3.5 w-3.5" />
                  <span className="font-semibold">{activeFilterSelected}/{activeFilterTotal}</span>
                  <span className="text-white/70">{t("autoApply.selectedStudents").toLowerCase()}</span>
                </div>
              )}
            </div>
          </div>

          {loading ? (
            <PageLoader label={t("autoApply.loadingStudents")} />
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
              {/* Class, division and scholarship-category filters */}
              <div className="shrink-0 space-y-3 border-b border-slate-100 bg-gradient-to-b from-violet-50/50 to-white px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Select
                    label={t("autoApply.selectClassLabel")}
                    options={classOptions}
                    value={selectedStandard}
                    onChange={(e) => {
                      setSelectedStandard(e.target.value);
                      setSelectedSection("");
                      setSelectedCategory("");
                      setSearchTerm("");
                    }}
                    emptyLabel={t("autoApply.selectClassPlaceholder")}
                    className="h-11 font-medium border-violet-200 focus:border-violet-500 focus:ring-violet-500/20 bg-white shadow-sm"
                  />
                  <Select
                    label={t("autoApply.selectDivisionLabel")}
                    options={divisionOptions}
                    value={selectedSection}
                    onChange={(e) => {
                      setSelectedSection(e.target.value);
                      setSelectedCategory("");
                      setSearchTerm("");
                    }}
                    emptyLabel={t("autoApply.selectDivisionPlaceholder")}
                    disabled={!selectedStandard}
                    className="h-11 font-medium border-violet-200 focus:border-violet-500 focus:ring-violet-500/20 bg-white shadow-sm"
                  />
                  <Select
                    label={t("autoApply.selectCategoryLabel")}
                    options={categoryOptions}
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSearchTerm("");
                    }}
                    emptyLabel={t("autoApply.selectCategoryPlaceholder")}
                    disabled={!selectedSection}
                    className="h-11 font-medium border-violet-200 focus:border-violet-500 focus:ring-violet-500/20 bg-white shadow-sm"
                  />
                </div>

                {excludedOpenCount > 0 && (
                  <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                    {t("autoApply.openCategoryExcluded", { count: excludedOpenCount })}
                  </p>
                )}

                {selectedStandard && selectedSection && selectedCategory ? (
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
                      onClick={() => toggleClassSelection(fullFilteredStudents)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                    >
                      {allActiveFilterSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
                      {t("autoApply.selectAllFiltered")}
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
              <div className="min-h-0 flex-1 overflow-visible bg-slate-50/30 lg:overflow-y-auto">
                {!selectedStandard || !selectedSection || !selectedCategory ? (
                  <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-3 p-8 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-violet-100 to-indigo-100 shadow-inner">
                      <BookOpen className="h-9 w-9 text-violet-500" />
                    </div>
                    <p className="max-w-xs text-sm font-medium text-slate-600">{t("autoApply.selectThreeFiltersFirst")}</p>
                    <p className="text-xs text-slate-400">{t("autoApply.openCategoryNotEligible")}</p>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="flex h-full min-h-[160px] flex-col items-center justify-center gap-2 p-8 text-slate-400">
                    <Search className="h-8 w-8 opacity-30" />
                    <p className="text-sm">{t("autoApply.noSearchResults", { term: searchTerm })}</p>
                  </div>
                ) : (
                  <div className="p-3 space-y-2">
                    <p className="px-1 text-xs font-medium text-slate-500">
                      {t("autoApply.studentsInFilter", { count: activeFilterTotal })}
                      {searchTerm.trim() ? ` · ${filteredStudents.length} shown` : ""}
                    </p>
                    {filteredStudents.map((s, idx) => {
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
              <Spinner size="sm" />
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
              {/otp|login|captcha/i.test(activeJob.currentStep || "") && (
                <div className="mb-3 flex flex-wrap items-end gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="min-w-[180px] flex-1">
                    <label className="mb-1 block text-xs font-semibold text-amber-900">
                      Digital Gujarat OTP
                    </label>
                    <input
                      value={otpCode}
                      onChange={(event) =>
                        setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))
                      }
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="4–8 digit OTP"
                      className="h-9 w-full rounded-lg border border-amber-300 bg-white px-3 font-mono text-sm outline-none focus:ring-2 focus:ring-amber-200"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void sendJobOtp()}
                    disabled={sendingOtp || !/^\d{4,8}$/.test(otpCode)}
                  >
                    {sendingOtp ? <Spinner size="sm" /> : null}
                    Send OTP
                  </Button>
                </div>
              )}
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

      {preflight && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="flex h-[100dvh] max-h-[100dvh] w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-2xl">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b bg-gradient-to-r from-emerald-50 to-blue-50 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-slate-900">
                  Auto Apply Preflight Preview
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Form fields, exact scheme, portal and required documents verify
                  karke hi browser start hoga.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreflight(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-white"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid shrink-0 grid-cols-2 gap-2 border-b p-3 sm:grid-cols-4 sm:gap-3 sm:p-4">
              {[
                ["Selected", preflight.summary.selected, "text-slate-800"],
                ["Ready", preflight.summary.ready, "text-emerald-700"],
                ["Blocked", preflight.summary.blocked, "text-red-700"],
                [
                  "Portal",
                  preflight.summary.mixedPortals
                    ? "Mixed"
                    : (preflight.summary.portalTypes[0] || "—").toUpperCase(),
                  preflight.summary.mixedPortals
                    ? "text-red-700"
                    : "text-blue-700",
                ],
              ].map(([label, value, color]) => (
                <div
                  key={String(label)}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="text-xs font-medium text-slate-500">{label}</p>
                  <p className={`mt-1 text-xl font-bold ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {preflight.summary.mixedPortals && (
              <div className="mx-4 mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Pre-Matric (SJED) aur Post-Matric (Citizen) students ko alag
                batch me select karein.
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 overscroll-contain sm:p-4">
              {preflight.students.map((student) => (
                <div
                  key={student.id}
                  className={`rounded-xl border p-3 ${
                    student.ready
                      ? "border-emerald-200 bg-emerald-50/50"
                      : "border-red-200 bg-red-50/50"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {student.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {student.scheme || "Scheme missing"} ·{" "}
                        {student.portalType.toUpperCase()}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        student.ready
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {student.ready ? "Ready" : "Fix required"}
                    </span>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                    {student.documents
                      .filter((document) => document.required)
                      .map((document) => (
                        <span
                          key={`${student.id}-doc-${document.type}`}
                          className={`rounded px-2 py-1 ${
                            document.dgReady
                              ? "bg-emerald-100 text-emerald-700"
                              : document.available
                                ? "bg-orange-100 text-orange-800"
                                : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {document.dgReady ? "✓" : "!"} {document.type}
                          {document.size != null
                            ? ` · ${(document.size / 1024).toFixed(0)}KB`
                            : ""}
                        </span>
                      ))}
                  </div>

                  {!student.ready && (
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      {student.missingFields.map((error) => (
                        <span
                          key={`${student.id}-${error.field}`}
                          className="rounded bg-red-100 px-2 py-1 text-red-700"
                          title={error.message}
                        >
                          {error.field}
                        </span>
                      ))}
                      {student.missingDocuments.map((document) => (
                        <span
                          key={`${student.id}-missing-${document}`}
                          className="rounded bg-amber-100 px-2 py-1 text-amber-800"
                        >
                          Missing: {document}
                        </span>
                      ))}
                      {student.invalidDocuments.map((document) => (
                        <span
                          key={`${student.id}-invalid-${document}`}
                          className="rounded bg-orange-100 px-2 py-1 text-orange-800"
                        >
                          Oversize: {document}
                        </span>
                      ))}
                      <a
                        href={`/students/${student.id}/auto-submit`}
                        className="ml-auto font-semibold text-blue-700 underline"
                      >
                        Fix data/documents
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex shrink-0 flex-col gap-3 border-t bg-slate-50 px-3 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5 sm:py-4">
              <p className="text-xs text-slate-500">
                CAPTCHA/OTP manual rahega. Final submit se pehle portal preview
                par approval li jayegi.
              </p>
              <div className="grid w-full grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:flex sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setPreflight(null)}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => void launchPreflightJob()}
                  disabled={
                    starting ||
                    preflight.summary.blocked > 0 ||
                    preflight.summary.mixedPortals
                  }
                >
                  {starting ? <Spinner size="sm" /> : <Play className="h-4 w-4" />}
                  Start verified Auto Apply
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AutoApplyLoading() {
  const t = useT();
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <Spinner size="lg" />
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
