"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { useT } from "@/i18n/locale-provider";
import {
  Play,
  RefreshCw,
  Zap,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Square,
  CheckSquare,
  Bot,
  LogIn,
  Shield,
  Save,
  Smartphone,
  MessageSquare,
  Copy,
  Share2,
  Bell,
  Zap,
} from "lucide-react";
import type { Student } from "@/generated/prisma/client";
import { extractOtpFromSms } from "@/lib/sms-otp";

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
  sjed: {
    configured: boolean;
    username: string | null;
    sessionSaved: boolean;
    lastLoginAt: string | null;
    profileReady: boolean;
  };
  citizen: {
    configured: boolean;
    loginId: string | null;
    sessionSaved: boolean;
    lastLoginAt: string | null;
    profileReady: boolean;
  };
}

const PORTAL_OPTIONS = [
  { value: "sjed", labelKey: "autoApply.portalSjed", descKey: "autoApply.portalSjedDesc" },
  { value: "citizen", labelKey: "autoApply.portalCitizen", descKey: "autoApply.portalCitizenDesc" },
];

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

const ACTION_OPTIONS = [
  { value: "auto", labelKey: "autoApply.actionAuto" },
  { value: "new_apply", labelKey: "autoApply.actionNew" },
  { value: "edit", labelKey: "autoApply.actionEdit" },
];

function statusColor(status: string) {
  switch (status) {
    case "submitted":
    case "filled":
      return "bg-green-100 text-green-700";
    case "running":
      return "bg-blue-100 text-blue-700";
    case "failed":
      return "bg-red-100 text-red-700";
    case "pending":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-amber-100 text-amber-700";
  }
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
    dgSjedUsername: "",
    dgSjedPassword: "",
    dgCitizenLoginId: "",
    dgCitizenPassword: "",
    dgCitizenLoginMethod: "mobile",
  });
  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [savingCreds, setSavingCreds] = useState(false);
  const [credsSaved, setCredsSaved] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [smsWebhookUrl, setSmsWebhookUrl] = useState("");
  const [forwarderWebhookUrl, setForwarderWebhookUrl] = useState("");
  const [forwarderSetupUrl, setForwarderSetupUrl] = useState("");
  const [phoneBridgeUrl, setPhoneBridgeUrl] = useState("");
  const [phoneMobile, setPhoneMobile] = useState("");
  const [phoneConnected, setPhoneConnected] = useState<string | null>(null);
  const [connectingPhone, setConnectingPhone] = useState(false);
  const [bridgeCopied, setBridgeCopied] = useState(false);
  const [smsInbox, setSmsInbox] = useState<
    { id: string; sender: string | null; body: string; otpCode: string | null; consumed: boolean; createdAt: string }[]
  >([]);
  const [smsLatestOtp, setSmsLatestOtp] = useState<string | null>(null);
  const [smsLatestConsumed, setSmsLatestConsumed] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);
  const [forwarderCopied, setForwarderCopied] = useState(false);
  const [smsOtpMode, setSmsOtpMode] = useState<"mine" | "remote">("remote");
  const [smsDeliveryMethod, setSmsDeliveryMethod] = useState<"forwarder" | "bridge">("forwarder");
  const prevOtpRef = useRef<string | null>(null);

  const loadSmsSetup = useCallback(() => {
    fetch("/api/automation/sms/setup")
      .then((r) => r.json())
      .then((d) => {
        if (d.webhookUrl) setSmsWebhookUrl(d.webhookUrl);
        if (d.forwarderWebhookUrl) setForwarderWebhookUrl(d.forwarderWebhookUrl);
        if (d.forwarderSetupUrl) setForwarderSetupUrl(d.forwarderSetupUrl);
        if (d.phoneBridgeUrl) setPhoneBridgeUrl(d.phoneBridgeUrl);
        if (d.dgOtpMobile) setPhoneMobile(d.dgOtpMobile);
        if (d.mobileMasked) setPhoneConnected(d.mobileMasked);
      });
  }, []);

  const loadSmsInbox = useCallback(() => {
    fetch("/api/automation/sms/inbox")
      .then((r) => r.json())
      .then((d) => {
        setSmsInbox(d.messages || []);
        setSmsLatestOtp(d.latestOtp?.code || null);
        setSmsLatestConsumed(Boolean(d.latestOtp?.consumed));
      });
  }, []);

  const loadSessionStatus = useCallback(() => {
    fetch("/api/automation/session-status")
      .then((r) => r.json())
      .then((d) => {
        if (d?.sjed && d?.citizen) setSessionStatus(d);
      })
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
    loadSmsSetup();
    loadSmsInbox();
    fetch("/api/automation/jobs")
      .then((r) => r.json())
      .then((d) => setRecentJobs(d.jobs || []));
  }, [loadStudents, loadDgSettings, loadSessionStatus, loadSmsSetup, loadSmsInbox]);

  useEffect(() => {
    const interval = setInterval(loadSmsInbox, 2500);
    return () => clearInterval(interval);
  }, [loadSmsInbox]);

  useEffect(() => {
    if (!smsLatestOtp || smsLatestOtp === prevOtpRef.current) return;
    prevOtpRef.current = smsLatestOtp;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      new Notification("DG OTP", { body: smsLatestOtp, tag: "dg-otp" });
    }
  }, [smsLatestOtp]);

  const enableOtpNotify = () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      void Notification.requestPermission();
    }
  };

  const shareBridgeWhatsApp = () => {
    const link = smsDeliveryMethod === "forwarder" ? forwarderSetupUrl : phoneBridgeUrl;
    if (!link) return;
    const msg =
      smsDeliveryMethod === "forwarder"
        ? t("autoApply.smsForwarderWhatsAppMsg")
        : t("autoApply.smsWhatsAppMsg");
    const text = encodeURIComponent(`${msg}\n\n${link}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const copyForwarderUrl = async () => {
    if (!forwarderWebhookUrl) return;
    await navigator.clipboard.writeText(forwarderWebhookUrl);
    setForwarderCopied(true);
    setTimeout(() => setForwarderCopied(false), 2000);
  };

  useEffect(() => {
    if (!activeJob || ["completed", "failed", "partial"].includes(activeJob.status)) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/automation/jobs/${activeJob.id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveJob(data.job);
      }
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

  const saveDgCredentials = async () => {
    if (portalType === "sjed" && !dgForm.dgSjedUsername.trim()) {
      alert(t("autoApply.sjedUsernameRequired"));
      return;
    }
    if (portalType === "citizen" && !dgForm.dgCitizenLoginId.trim()) {
      alert(t("autoApply.citizenSetupRequired"));
      return;
    }
    setSavingCreds(true);
    const body =
      portalType === "sjed"
        ? { dgSjedUsername: dgForm.dgSjedUsername, dgSjedPassword: dgForm.dgSjedPassword }
        : {
            dgCitizenLoginId: dgForm.dgCitizenLoginId,
            dgCitizenPassword: dgForm.dgCitizenPassword,
            dgCitizenLoginMethod: dgForm.dgCitizenLoginMethod,
          };
    const res = await fetch("/api/school/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingCreds(false);
    if (res.ok) {
      setCredsSaved(true);
      setTimeout(() => setCredsSaved(false), 2000);
      loadSessionStatus();
      loadDgSettings();
    }
  };

  const portalConfigured =
    portalType === "sjed"
      ? sessionStatus?.sjed?.configured || dgForm.dgSjedUsername.trim()
      : sessionStatus?.citizen?.configured || dgForm.dgCitizenLoginId.trim();

  const portalSessionSaved =
    portalType === "sjed" ? sessionStatus?.sjed?.sessionSaved : sessionStatus?.citizen?.sessionSaved;

  const portalLastLogin =
    portalType === "sjed" ? sessionStatus?.sjed?.lastLoginAt : sessionStatus?.citizen?.lastLoginAt;

  const startJob = async () => {
    if (!portalConfigured) {
      alert(portalType === "sjed" ? t("autoApply.sjedSetupRequired") : t("autoApply.citizenSetupRequired"));
      return;
    }
    if (
      (portalType === "sjed" && dgForm.dgSjedUsername.trim() && !sessionStatus?.sjed?.configured) ||
      (portalType === "citizen" && dgForm.dgCitizenLoginId.trim() && !sessionStatus?.citizen?.configured)
    ) {
      await saveDgCredentials();
    }
    if (selected.size === 0) {
      alert(t("autoApply.selectStudents"));
      return;
    }
    setStarting(true);
    const res = await fetch("/api/automation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        studentIds: Array.from(selected),
        mode: "auto",
        actionMode,
        portalType,
      }),
    });
    const data = await res.json();
    setStarting(false);

    if (!res.ok) {
      alert(data.error || t("autoApply.startFailed"));
      return;
    }

    const jobRes = await fetch(`/api/automation/jobs/${data.jobId}`);
    const jobData = await jobRes.json();
    setActiveJob(jobData.job);
    loadSessionStatus();
  };

  const actionLabel = (action: string) => {
    if (action === "new_apply") return t("autoApply.actionNewShort");
    if (action === "edit") return t("autoApply.actionEditShort");
    if (action === "auto_detected") return t("autoApply.actionAutoShort");
    return action;
  };

  const awaitingOtp =
    activeJob?.status === "running" &&
    activeJob.currentStep?.toLowerCase().includes("otp");

  const submitOtp = async () => {
    if (!activeJob?.id || !/^\d{4,8}$/.test(otpInput.trim())) return;
    setOtpSending(true);
    const res = await fetch(`/api/automation/jobs/${activeJob.id}/otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ otp: otpInput.trim() }),
    });
    setOtpSending(false);
    if (res.ok) {
      setOtpSent(true);
      setOtpInput("");
      setTimeout(() => setOtpSent(false), 2500);
    }
  };

  const copyWebhookUrl = async () => {
    if (!smsWebhookUrl) return;
    await navigator.clipboard.writeText(smsWebhookUrl);
    setUrlCopied(true);
    setTimeout(() => setUrlCopied(false), 2000);
  };

  const copyBridgeUrl = async () => {
    if (!phoneBridgeUrl) return;
    await navigator.clipboard.writeText(phoneBridgeUrl);
    setBridgeCopied(true);
    setTimeout(() => setBridgeCopied(false), 2000);
  };

  const connectPhone = async () => {
    if (!/^[6-9]\d{9}$/.test(phoneMobile.replace(/\D/g, "").slice(-10))) {
      alert(t("autoApply.smsPhonePlaceholder"));
      return;
    }
    setConnectingPhone(true);
    const mobile = phoneMobile.replace(/\D/g, "").slice(-10);
    const res = await fetch("/api/automation/sms/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mobile }),
    });
    const data = await res.json();
    setConnectingPhone(false);
    if (res.ok) {
      setPhoneConnected(data.mobileMasked);
      setPhoneBridgeUrl(data.phoneBridgeUrl);
      loadSmsSetup();
    } else {
      alert(data.error || "Failed");
    }
  };

  const regenerateSmsToken = async () => {
    await fetch("/api/automation/sms/setup", { method: "POST" });
    loadSmsSetup();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Bot className="h-7 w-7 text-emerald-600" />
            {t("autoApply.title")}
          </h1>
          <p className="text-slate-500 mt-1">{t("autoApply.subtitle")}</p>
        </div>
        <Button variant="outline" onClick={loadStudents}>
          <RefreshCw className="h-4 w-4" /> {t("common.filter")}
        </Button>
      </div>

      {smsLatestOtp && (
        <div className={`rounded-xl border-2 p-4 shadow-sm ${smsLatestConsumed ? "border-slate-300 bg-slate-50" : "border-green-400 bg-gradient-to-r from-green-50 to-emerald-100 animate-pulse"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className={`text-xs font-medium uppercase tracking-wide ${smsLatestConsumed ? "text-slate-600" : "text-green-800"}`}>
                {smsLatestConsumed ? "OTP mil gaya (use ho chuka)" : t("autoApply.smsLiveOtpTitle")}
              </p>
              <p className="text-4xl font-mono font-bold text-green-900 tracking-widest mt-1">{smsLatestOtp}</p>
              <p className="text-[11px] text-green-700 mt-1">
                {smsLatestConsumed ? "Naya OTP chahiye to phone se dubara bhejein" : t("autoApply.smsLiveOtpHint")}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-green-600 text-green-800"
              onClick={() => navigator.clipboard.writeText(smsLatestOtp)}
            >
              <Copy className="h-4 w-4" /> {t("autoApply.smsCopy")}
            </Button>
          </div>
        </div>
      )}

      <Card className="border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Zap className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-sm text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">{t("autoApply.howItWorks")}</p>
              <p>{t("autoApply.flow1")}</p>
              <p>{t("autoApply.flow2")}</p>
              <p>{t("autoApply.flow3")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-blue-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <LogIn className="h-4 w-4 text-blue-600" />
                {t("autoApply.portalType")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label={t("autoApply.portalType")}
                options={PORTAL_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                value={portalType}
                onChange={(e) => setPortalType(e.target.value as "sjed" | "citizen")}
              />
              <p className="text-xs text-slate-500">
                {t(portalType === "sjed" ? "autoApply.portalSjedDesc" : "autoApply.portalCitizenDesc")}
              </p>
              <p className="text-[10px] text-slate-400">{t("autoApply.portalHint")}</p>

              {portalSessionSaved && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 p-2 rounded-lg">
                  <Shield className="h-3.5 w-3.5 shrink-0" />
                  <span>
                    {t("autoApply.sessionActive")}
                    {portalLastLogin && <> — {new Date(portalLastLogin).toLocaleString("en-IN")}</>}
                  </span>
                </div>
              )}

              {portalType === "sjed" ? (
                <>
                  <Input
                    label={t("autoSubmit.sjedUserId")}
                    value={dgForm.dgSjedUsername}
                    onChange={(e) => setDgForm({ ...dgForm, dgSjedUsername: e.target.value })}
                    placeholder={t("autoSubmit.sjedUsernamePlaceholder")}
                  />
                  <Input
                    label={t("autoSubmit.password")}
                    type="password"
                    value={dgForm.dgSjedPassword}
                    onChange={(e) => setDgForm({ ...dgForm, dgSjedPassword: e.target.value })}
                    placeholder={t("autoSubmit.dgPasswordPlaceholder")}
                  />
                </>
              ) : (
                <>
                  <Select
                    label={t("autoApply.loginMethod")}
                    options={[
                      { value: "mobile", label: t("autoSubmit.mobileNumber") },
                      { value: "email", label: t("autoSubmit.emailId") },
                    ]}
                    value={dgForm.dgCitizenLoginMethod}
                    onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginMethod: e.target.value })}
                  />
                  <Input
                    label={t("autoSubmit.loginId")}
                    value={dgForm.dgCitizenLoginId}
                    onChange={(e) => setDgForm({ ...dgForm, dgCitizenLoginId: e.target.value })}
                    placeholder="9876543210"
                  />
                  <Input
                    label={t("autoSubmit.password")}
                    type="password"
                    value={dgForm.dgCitizenPassword}
                    onChange={(e) => setDgForm({ ...dgForm, dgCitizenPassword: e.target.value })}
                    placeholder={t("autoSubmit.dgPasswordPlaceholder")}
                  />
                </>
              )}

              <p className="text-[10px] text-slate-400">{t("autoSubmit.passwordLocalNote")}</p>
              <Button variant="outline" className="w-full" onClick={saveDgCredentials} disabled={savingCreds}>
                {savingCreds ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {credsSaved
                  ? t("autoSubmit.saved")
                  : portalType === "sjed"
                    ? t("autoApply.saveSchoolLogin")
                    : t("autoApply.saveCitizenLogin")}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-violet-200">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-violet-600" />
                {t("autoApply.smsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-slate-600">
              <p>{t("autoApply.smsDescNew")}</p>

              <Input
                label={t("autoApply.smsPhoneLabel")}
                value={phoneMobile}
                onChange={(e) => setPhoneMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder={t("autoApply.smsPhonePlaceholder")}
                inputMode="numeric"
              />

              {phoneConnected && (
                <div className="flex items-center gap-2 text-green-700 bg-green-50 rounded-lg p-2 text-xs font-medium">
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  {t("autoApply.smsConnected")}: {phoneConnected}
                </div>
              )}

              <Button type="button" className="w-full" onClick={connectPhone} disabled={connectingPhone}>
                {connectingPhone ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                {t("autoApply.smsConnect")}
              </Button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSmsDeliveryMethod("forwarder")}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${smsDeliveryMethod === "forwarder" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 text-slate-600"}`}
                >
                  {t("autoApply.smsMethodForwarder")}
                </button>
                <button
                  type="button"
                  onClick={() => setSmsDeliveryMethod("bridge")}
                  className={`flex-1 rounded-lg border px-2 py-2 text-[11px] font-medium transition ${smsDeliveryMethod === "bridge" ? "border-violet-500 bg-violet-50 text-violet-900" : "border-slate-200 text-slate-600"}`}
                >
                  {t("autoApply.smsMethodBridge")}
                </button>
              </div>

              {smsDeliveryMethod === "forwarder" && forwarderSetupUrl && (
                <div className="space-y-2 rounded-lg border-2 border-emerald-300 bg-emerald-50/80 p-3">
                  <p className="font-bold text-emerald-900 flex items-center gap-2">
                    <Zap className="h-4 w-4" /> {t("autoApply.smsForwarderTitle")}
                  </p>
                  <p className="text-[10px] text-emerald-800 leading-relaxed">{t("autoApply.smsForwarderHintNew")}</p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSmsOtpMode("mine")}
                      className={`flex-1 rounded border px-2 py-1.5 text-[10px] ${smsOtpMode === "mine" ? "border-emerald-600 bg-white font-medium" : "border-emerald-200"}`}
                    >
                      {t("autoApply.smsModeMine")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSmsOtpMode("remote")}
                      className={`flex-1 rounded border px-2 py-1.5 text-[10px] ${smsOtpMode === "remote" ? "border-emerald-600 bg-white font-medium" : "border-emerald-200"}`}
                    >
                      {t("autoApply.smsModeRemote")}
                    </button>
                  </div>

                  {smsOtpMode === "mine" && (
                    <div className="flex justify-center py-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(forwarderSetupUrl)}`}
                        alt="Forwarder QR"
                        className="rounded-lg border border-white shadow"
                        width={160}
                        height={160}
                      />
                    </div>
                  )}

                  <input
                    readOnly
                    value={forwarderSetupUrl}
                    className="w-full rounded border border-emerald-200 bg-white px-2 py-1.5 text-[10px] font-mono"
                  />

                  {forwarderWebhookUrl && (
                    <div className="flex gap-1">
                      <input
                        readOnly
                        value={forwarderWebhookUrl}
                        className="flex-1 rounded border border-emerald-200 bg-white px-1 py-1 font-mono text-[9px]"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={copyForwarderUrl} className="text-[10px] h-8 shrink-0">
                        {forwarderCopied ? t("autoApply.smsCopied") : t("autoApply.smsCopy")}
                      </Button>
                    </div>
                  )}

                  <Button type="button" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={shareBridgeWhatsApp}>
                    <Share2 className="h-4 w-4" />
                    {smsOtpMode === "remote" ? t("autoApply.smsForwarderWhatsApp") : t("autoApply.smsOpenForwarderOnPhone")}
                  </Button>
                </div>
              )}

              {smsDeliveryMethod === "bridge" && phoneBridgeUrl && (
                <div className="space-y-2 rounded-lg border border-violet-200 bg-violet-50/50 p-3">
                  <p className="font-medium text-violet-900">{t("autoApply.smsBridgeFallback")}</p>
                  <p className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 rounded p-2">
                    {t("autoApply.smsBridgeWarning")}
                  </p>
                  {phoneBridgeUrl.startsWith("http://localhost") && (
                    <p className="text-[10px] text-amber-700">{t("autoApply.smsNoteLocal")}</p>
                  )}
                  {smsOtpMode === "mine" && (
                    <div className="flex justify-center py-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(phoneBridgeUrl)}`}
                        alt="Bridge QR"
                        className="rounded-lg border border-white shadow"
                        width={160}
                        height={160}
                      />
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input readOnly value={phoneBridgeUrl} className="flex-1 rounded border border-violet-200 bg-white px-2 py-1.5 text-[10px] font-mono" />
                    <Button type="button" variant="outline" size="sm" onClick={copyBridgeUrl}>
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <Button type="button" className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white" onClick={shareBridgeWhatsApp}>
                    <Share2 className="h-4 w-4" />
                    {t("autoApply.smsWhatsApp")}
                  </Button>
                </div>
              )}

              <Button type="button" variant="ghost" size="sm" className="w-full text-[11px]" onClick={enableOtpNotify}>
                <Bell className="h-3.5 w-3.5" />
                {t("autoApply.smsNotifyEnable")}
              </Button>

              <div>
                <p className="font-medium text-slate-700 mb-2 flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t("autoApply.smsInbox")}
                  {smsLatestOtp && (
                    <span className="text-green-700 font-bold ml-auto">
                      {t("autoApply.smsLatestOtp")}: {smsLatestOtp}
                    </span>
                  )}
                </p>
                <div className="max-h-28 overflow-y-auto space-y-1.5 rounded-lg border border-slate-100 bg-slate-50 p-2">
                  {smsInbox.length === 0 ? (
                    <p className="text-slate-400 text-center py-2">{t("autoApply.smsNoMessages")}</p>
                  ) : (
                    smsInbox.slice(0, 5).map((m) => (
                      <div
                        key={m.id}
                        className={`rounded p-2 text-[11px] ${m.otpCode && !m.consumed ? "bg-green-100 border border-green-200" : "bg-white border border-slate-100"}`}
                      >
                        <p className="text-slate-700 line-clamp-1">{m.body}</p>
                        {m.otpCode && <p className="font-bold text-green-800">OTP: {m.otpCode}</p>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("autoApply.settings")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select
                label={t("autoApply.actionMode")}
                options={ACTION_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey) }))}
                value={actionMode}
                onChange={(e) => setActionMode(e.target.value)}
              />
              <p className="text-xs text-slate-500">{t("autoApply.actionHint")}</p>
              <Button
                className="w-full"
                size="lg"
                onClick={startJob}
                disabled={starting || selected.size === 0 || activeJob?.status === "running"}
              >
                {starting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {t("autoApply.start", { count: selected.size })}
              </Button>
            </CardContent>
          </Card>

          {recentJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("autoApply.recentJobs")}</CardTitle>
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
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-50 border border-slate-100 text-sm"
                  >
                    <div className="flex justify-between">
                      <span className="font-medium capitalize">{j.status}</span>
                      <span className="text-slate-500">{j.completedCount}/{j.totalCount}</span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {new Date(j.createdAt).toLocaleString("en-IN")}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {activeJob && (
            <Card className="border-blue-200">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    {activeJob.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                    {activeJob.status === "completed" && <CheckCircle className="h-4 w-4 text-green-600" />}
                    {activeJob.status === "failed" && <XCircle className="h-4 w-4 text-red-600" />}
                    {t("autoApply.liveStatus")}
                  </CardTitle>
                  <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${statusColor(activeJob.status)}`}>
                    {activeJob.status}
                  </span>
                </div>
                <p className="text-sm text-slate-500">{activeJob.currentStep || t("autoApply.processing")}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {awaitingOtp && (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                      <Smartphone className="h-4 w-4" />
                      {t("autoApply.otpTitle")}
                    </div>
                    <p className="text-xs text-amber-800">{t("autoApply.otpHint")}</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={8}
                        value={otpInput}
                        onChange={(e) => {
                          const raw = e.target.value;
                          const extracted = extractOtpFromSms(raw) || raw.replace(/\D/g, "");
                          setOtpInput(extracted.slice(0, 8));
                        }}
                        placeholder={t("autoApply.otpPlaceholder")}
                        className="flex-1 rounded-lg border border-amber-200 px-3 py-2 text-lg font-mono tracking-widest"
                      />
                      <Button onClick={submitOtp} disabled={otpSending || otpInput.length < 4}>
                        {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("autoApply.otpSubmit")}
                      </Button>
                    </div>
                    {otpSent && (
                      <p className="text-xs text-green-700 font-medium">{t("autoApply.otpSent")}</p>
                    )}
                  </div>
                )}
                <div>
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>{t("autoApply.overallProgress")}</span>
                    <span>{activeJob.overallPercent}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${activeJob.overallPercent}%` }}
                    />
                  </div>
                  <div className="flex gap-4 mt-2 text-xs text-slate-500">
                    <span className="text-green-600">{activeJob.completedCount} {t("autoApply.done")}</span>
                    <span className="text-red-600">{activeJob.failedCount} {t("autoApply.failed")}</span>
                    <span>{activeJob.totalCount} {t("autoApply.total")}</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activeJob.studentProgress?.map((sp) => (
                    <div key={sp.studentId} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-medium text-sm">{sp.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusColor(sp.status)}`}>
                          {sp.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 mb-1">
                        {sp.dgAction && sp.dgAction !== "unknown" && (
                          <span className="bg-white px-1.5 py-0.5 rounded border">{actionLabel(sp.dgAction)}</span>
                        )}
                        {sp.dgPortalStatus && (
                          <span className="bg-white px-1.5 py-0.5 rounded border">DG: {sp.dgPortalStatus}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600">{sp.step}</p>
                      <div className="h-1 bg-slate-200 rounded-full mt-2 overflow-hidden">
                        <div className="h-full bg-blue-500 transition-all" style={{ width: `${sp.percent}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                {activeJob.logs && (
                  <pre className="text-[10px] bg-slate-900 text-green-400 p-3 rounded-lg max-h-32 overflow-y-auto whitespace-pre-wrap">
                    {activeJob.logs.split("\n").slice(-30).join("\n")}
                  </pre>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span>{t("autoApply.readyStudents")} ({students.length})</span>
                <button
                  type="button"
                  onClick={() =>
                    setSelected(selected.size === students.length ? new Set() : new Set(students.map((s) => s.id)))
                  }
                  className="text-xs text-blue-600 hover:underline"
                >
                  {selected.size === students.length ? t("bulkSubmitPage.deselectAll") : t("bulkSubmitPage.selectAll")}
                </button>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center h-32 items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                </div>
              ) : students.length === 0 ? (
                <p className="text-center py-8 text-slate-500">{t("autoApply.noReady")}</p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {students.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                      onClick={() => toggleSelect(s.id)}
                    >
                      {selected.has(s.id) ? (
                        <CheckSquare className="h-4 w-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="h-4 w-4 text-slate-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{s.firstName} {s.surname}</p>
                        <p className="text-xs text-slate-500">{s.aadhaarNumber} · {s.scholarshipScheme}</p>
                      </div>
                      <CategoryBadge category={s.category} />
                      <Badge status={s.status} />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AutoApplyPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <AutoApplyContent />
    </Suspense>
  );
}
