"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Building2, ArrowRight, ArrowLeft, Eye, EyeOff, Check, School } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LoginBrandBook } from "@/components/auth/login-brand-book";
import { LoginCaptcha } from "@/components/auth/login-captcha";
import { LoginLockBanner } from "@/components/auth/login-lock-banner";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "@/components/ui/toast";
import { useT } from "@/i18n/locale-provider";
import { isUserRole } from "@/lib/roles";
import { notifyAuthChanged } from "@/lib/auth-client";
import { getBrowserLoginGeo } from "@/lib/browser-login-geo";
import { DeviceSessionModal, type DeviceSessionRow } from "@/components/auth/device-session-modal";
import "./login-portal.css";

type SchoolBranding = {
  code: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  udiseCode?: string | null;
  district?: string | null;
};

const SCHOOL_CODE_KEY = "shs_school_code";
const REMEMBER_KEY = "shs_remember_me";
const REMEMBER_EMAIL_KEY = "shs_remember_email";

export function EducationLoginHub({ next = "/dashboard" }: { next?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const isCaPortal = searchParams.get("portal") === "ca";
  const sessionRevoked = searchParams.get("reason") === "session_revoked";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [branding, setBranding] = useState<SchoolBranding | null>(null);
  const [brandingLoading, setBrandingLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  const [captchaInvalid, setCaptchaInvalid] = useState(false);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<string | null>(null);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [verifyOtp, setVerifyOtp] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState("");
  const [deviceSessions, setDeviceSessions] = useState<DeviceSessionRow[] | null>(null);
  const [deviceUserName, setDeviceUserName] = useState("");
  const [deviceBusy, setDeviceBusy] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const remember = localStorage.getItem(REMEMBER_KEY) === "1";
    setRememberMe(remember);
    if (remember) {
      const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (savedEmail) setEmail(savedEmail);
    }
  }, []);

  useEffect(() => {
    if (isCaPortal) {
      setSchoolCode("");
      setBranding(null);
      return;
    }
    const fromUrl = searchParams.get("school")?.trim().toUpperCase();
    const saved = typeof window !== "undefined" ? localStorage.getItem(SCHOOL_CODE_KEY) : null;
    const code = fromUrl || saved || "";
    if (code) setSchoolCode(code);
  }, [searchParams, isCaPortal]);

  useEffect(() => {
    if (isCaPortal) {
      setBranding(null);
      setBrandingLoading(false);
      return;
    }
    const code = schoolCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setBranding(null);
      return;
    }

    const timer = setTimeout(() => {
      setBrandingLoading(true);
      fetch(`/api/auth/school-branding?code=${encodeURIComponent(code)}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "School not found");
          setBranding(data.school);
          localStorage.setItem(SCHOOL_CODE_KEY, code);
          setError("");
        })
        .catch(() => setBranding(null))
        .finally(() => setBrandingLoading(false));
    }, 450);

    return () => clearTimeout(timer);
  }, [schoolCode, isCaPortal]);

  const finishSuccessfulLogin = (data: {
    redirect?: string;
    user?: { name?: string; role?: string; id?: string };
    revokedOthers?: boolean;
  }) => {
    if (rememberMe) {
      localStorage.setItem(REMEMBER_KEY, "1");
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim().toLowerCase());
      if (!isCaPortal && schoolCode.trim()) {
        localStorage.setItem(SCHOOL_CODE_KEY, schoolCode.trim().toUpperCase());
      }
    } else {
      localStorage.removeItem(REMEMBER_KEY);
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
      // Keep school code convenience only when remember is on
    }

    const redirectTo = data.redirect || next;
    const userName = String(data.user?.name || email.split("@")[0] || "User");
    const userRole = String(data.user?.role || "");
    const roleLabel = isUserRole(userRole) ? t(`roles.${userRole}`) : userRole;

    toast.success(
      t("login.successTitle"),
      data.revokedOthers
        ? t("login.deviceRevokedToast")
        : t("login.successToastDesc", { name: userName, role: roleLabel || "portal" }),
    );

    notifyAuthChanged({ role: userRole || null, userId: data.user?.id ?? null });
    setDeviceSessions(null);
    router.push(redirectTo);
    router.refresh();
  };

  const postLogin = async (sessionAction?: "keep_all" | "logout_others") => {
    const geo = await getBrowserLoginGeo();
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        captchaToken,
        captchaAnswer,
        rememberMe,
        latitude: geo.latitude ?? null,
        longitude: geo.longitude ?? null,
        accuracyM: geo.accuracyM ?? null,
        sessionAction: sessionAction || undefined,
      }),
    });
    const data = await res.json();
    return { res, data };
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && new Date(lockedUntil) > new Date()) return;

    setLoading(true);
    setError("");
    setCaptchaInvalid(false);
    setEmailNotVerified(false);
    setVerifyOtp("");
    setVerifyMsg("");
    setResendMsg("");
    try {
      const { res, data } = await postLogin();
      if (res.status === 409 && data.requiresDeviceChoice) {
        setDeviceSessions(data.sessions || []);
        setDeviceUserName(String(data.user?.name || email.split("@")[0] || "User"));
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const errMsg = data.error || t("common.loginFailed");
        if (data.emailNotVerified) {
          setEmailNotVerified(true);
          setError(data.error || t("login.emailNotVerified"));
          toast.warning(t("login.emailNotVerifiedTitle"), data.error || t("login.emailNotVerified"));
        } else if (data.locked && data.lockedUntil) {
          setLockedUntil(data.lockedUntil);
          setError(data.error || t("login.accountLocked"));
          toast.error(t("login.accountLocked"), data.error || t("login.accountLockedDesc", { time: "15 min" }));
        } else if (data.captchaInvalid || data.captchaRequired) {
          setCaptchaInvalid(true);
          setError(data.error || t("login.captchaInvalid"));
          setCaptchaRefreshKey((k) => k + 1);
          toast.error(t("login.captchaInvalid"));
        } else {
          setError(errMsg);
          setCaptchaRefreshKey((k) => k + 1);
          toast.error(t("common.loginFailed"), errMsg);
        }
        setLoading(false);
        return;
      }
      finishSuccessfulLogin(data);
    } catch {
      setError(t("common.networkError"));
      toast.error(t("common.networkError"));
      setLoading(false);
    }
  };

  const resolveDeviceChoice = async (action: "keep_all" | "logout_others") => {
    setDeviceBusy(true);
    try {
      const { res, data } = await postLogin(action);
      if (!res.ok) {
        toast.error(data.error || t("common.loginFailed"));
        setCaptchaRefreshKey((k) => k + 1);
        setDeviceSessions(null);
        return;
      }
      if (action === "keep_all") {
        toast.success(t("login.successTitle"), t("login.deviceKeepToast"));
      }
      finishSuccessfulLogin(data);
    } catch {
      toast.error(t("common.networkError"));
    } finally {
      setDeviceBusy(false);
      setLoading(false);
    }
  };

  const isLocked = Boolean(lockedUntil && new Date(lockedUntil) > new Date());

  const resendVerification = async () => {
    if (!email.trim() || !password) {
      setResendMsg(t("login.resendNeedCredentials"));
      return;
    }
    setResendLoading(true);
    setResendMsg("");
    setVerifyMsg("");
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });
      const data = await res.json();
      setResendMsg(res.ok ? data.message || t("login.resendSuccess") : data.error || t("common.networkError"));
    } catch {
      setResendMsg(t("common.networkError"));
    } finally {
      setResendLoading(false);
    }
  };

  const submitOtpVerification = async () => {
    if (!email.trim() || !password) {
      setVerifyMsg(t("login.resendNeedCredentials"));
      return;
    }
    if (verifyOtp.replace(/\D/g, "").length !== 6) {
      setVerifyMsg(t("login.otpInvalidLength"));
      return;
    }
    setVerifyLoading(true);
    setVerifyMsg("");
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          otp: verifyOtp.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setVerifyMsg(data.error || t("login.otpVerifyFailed"));
        return;
      }
      setVerifyMsg(data.message || t("login.otpVerifySuccess"));
      setEmailNotVerified(false);
      setVerifyOtp("");
      setError("");
    } catch {
      setVerifyMsg(t("common.networkError"));
    } finally {
      setVerifyLoading(false);
    }
  };

  const headline = isCaPortal
    ? t("caNav.title")
    : branding?.name || t("erp.systemName");
  const metaLine = isCaPortal
    ? t("login.caLoginHero")
    : branding
      ? [branding.district, branding.udiseCode ? `UDISE ${branding.udiseCode}` : null]
          .filter(Boolean)
          .join(" | ")
      : t("login.subtitle");

  return (
    <div className={`auth-portal ${isCaPortal ? "is-ca-portal" : ""}`}>
      {deviceSessions && (
        <DeviceSessionModal
          sessions={deviceSessions}
          userName={deviceUserName}
          busy={deviceBusy}
          onKeepAll={() => void resolveDeviceChoice("keep_all")}
          onLogoutOthers={() => void resolveDeviceChoice("logout_others")}
          onCancel={() => {
            setDeviceSessions(null);
            setLoading(false);
          }}
        />
      )}
      <aside className="auth-portal-brand">
        <div className="auth-brand-decor" aria-hidden>
          <div className="auth-brand-orb auth-brand-orb-1" />
          <div className="auth-brand-orb auth-brand-orb-2" />
          <div className="auth-brand-orb auth-brand-orb-3" />
          <div className="auth-brand-grid" />
          <div className="auth-brand-arc" />
        </div>

        <div className="auth-portal-brand-inner">
          <div className="auth-portal-topbar">
            <Link href="/" className="auth-portal-logo">
              <div className="auth-portal-logo-mark">
                <School className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div>
                <div className="auth-portal-logo-eyebrow">
                  {isCaPortal ? t("login.caLoginBadge") : t("loginHub.badge")}
                </div>
                <div className="auth-portal-logo-title">
                  {isCaPortal ? t("caNav.title") : t("landing.productName")}
                </div>
              </div>
            </Link>
            <LanguageSwitcher variant="hero" />
          </div>

          <div className="auth-portal-hero auth-portal-hero-book">
            <LoginBrandBook
              branding={isCaPortal ? null : branding}
              headline={headline}
              metaLine={metaLine}
              mode={isCaPortal ? "ca" : "default"}
            />
          </div>

          <div className="auth-portal-brand-footer">
            <span className="auth-brand-footer-pill">{t("loginHub.gsebReady")}</span>
            <span className="auth-brand-footer-pill is-accent">{t("login.secureLogin")}</span>
          </div>
        </div>
      </aside>

      <main className="auth-portal-main">
        <div className="auth-portal-mobile-header">
          <Link href="/" className="auth-portal-logo">
            <div className="auth-portal-logo-mark">
              <School className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <div className="auth-portal-logo-eyebrow">
                {isCaPortal ? t("login.caLoginBadge") : t("loginHub.badge")}
              </div>
              <div className="auth-portal-logo-title">
                {isCaPortal ? t("caNav.title") : t("landing.productName")}
              </div>
            </div>
          </Link>
          <LanguageSwitcher variant="login" />
        </div>

        <div className="auth-portal-main-scroll">
          <div className="auth-portal-form-card">
            <header className="auth-portal-form-header">
              <h2>{isCaPortal ? t("login.formTitleCa") : t("login.formTitle")}</h2>
              <p>{isCaPortal ? t("login.formSubtitleCa") : t("login.formSubtitleNew")}</p>
            </header>

            {sessionRevoked && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                {t("login.sessionRevokedBanner")}
              </div>
            )}

            {branding && !isCaPortal && (
              <div className="auth-portal-school-chip" title={branding.name}>
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>
                  {branding.name} - {branding.code}
                </span>
              </div>
            )}

            {isCaPortal && (
              <div className="auth-portal-school-chip auth-portal-ca-chip">
                <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                <span>{t("login.schoolCodeCaHint")}</span>
              </div>
            )}

            {isLocked && lockedUntil && (
              <LoginLockBanner
                lockedUntil={lockedUntil}
                onExpired={() => {
                  setLockedUntil(null);
                  setError("");
                  setCaptchaRefreshKey((k) => k + 1);
                }}
              />
            )}

            <form onSubmit={handleLogin} className="auth-portal-form">
              {!isCaPortal && (
                <div className="auth-portal-field">
                  <label className="auth-portal-label" htmlFor="school-code">
                    {t("login.schoolCodeOptional")}
                  </label>
                  <div className="auth-portal-input-wrap">
                    <Building2 className="auth-portal-input-icon" strokeWidth={1.75} />
                    <input
                      id="school-code"
                      type="text"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                      placeholder={t("login.schoolCodePlaceholder")}
                      className="auth-portal-input is-mono"
                      autoComplete="organization"
                      disabled={isLocked}
                    />
                    {brandingLoading && <Spinner size="sm" className="auth-portal-spinner" />}
                  </div>
                </div>
              )}

              <div className="auth-portal-field">
                <label className="auth-portal-label" htmlFor="email">
                  {t("common.email")}
                </label>
                <div className="auth-portal-input-wrap">
                  <Mail className="auth-portal-input-icon" strokeWidth={1.75} />
                  <input
                    id="email"
                    type="email"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                    className="auth-portal-input"
                    disabled={isLocked}
                  />
                </div>
              </div>

              <div className="auth-portal-field">
                <label className="auth-portal-label" htmlFor="password">
                  {t("login.password")}
                </label>
                <div className="auth-portal-input-wrap">
                  <Lock className="auth-portal-input-icon" strokeWidth={1.75} />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    className="auth-portal-input"
                    style={{ paddingRight: "2.5rem" }}
                    disabled={isLocked}
                  />
                  <button
                    type="button"
                    className="auth-portal-input-action"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <label className={`auth-remember${isLocked ? " is-disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLocked}
                />
                <span className="auth-remember-box" aria-hidden>
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                <span className="auth-remember-copy">
                  <span className="auth-remember-title">{t("login.rememberMe")}</span>
                  <span className="auth-remember-hint">{t("login.rememberMeHint")}</span>
                </span>
              </label>

              <LoginCaptcha
                answer={captchaAnswer}
                onAnswerChange={setCaptchaAnswer}
                onTokenChange={setCaptchaToken}
                disabled={isLocked}
                invalid={captchaInvalid}
                refreshKey={captchaRefreshKey}
              />

            {error && <div className="auth-portal-error">{error}</div>}

            {emailNotVerified && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                <p className="font-semibold">{t("login.emailNotVerifiedTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed opacity-90">{t("login.emailNotVerifiedHint")}</p>
                <div className="mt-3">
                  <label className="mb-2 block text-xs font-semibold text-amber-900">{t("login.otpLabel")}</label>
                  <OtpInput
                    value={verifyOtp}
                    onChange={setVerifyOtp}
                    disabled={isLocked || verifyLoading}
                    boxClassName="border-amber-300 focus:border-amber-500 focus:ring-amber-200"
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={submitOtpVerification}
                    disabled={verifyLoading || isLocked || verifyOtp.length !== 6}
                    className="rounded-lg bg-amber-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-900 disabled:opacity-50"
                  >
                    {verifyLoading ? t("login.otpVerifying") : t("login.verifyOtp")}
                  </button>
                  <button
                    type="button"
                    onClick={resendVerification}
                    disabled={resendLoading || isLocked}
                    className="text-xs font-semibold text-amber-800 underline hover:no-underline disabled:opacity-50"
                  >
                    {resendLoading ? t("login.resending") : t("login.resendVerification")}
                  </button>
                </div>
                {verifyMsg && <p className="mt-2 text-xs font-medium">{verifyMsg}</p>}
                {resendMsg && <p className="mt-2 text-xs">{resendMsg}</p>}
              </div>
            )}

            <button type="submit" className="auth-portal-submit" disabled={loading || isLocked}>
                {loading ? (
                  <>
                    <Spinner size="sm" />
                    {t("loginHub.signingIn")}
                  </>
                ) : (
                  <>
                    {t("login.loginBtn")}
                    <ArrowRight className="h-4 w-4" strokeWidth={2} />
                  </>
                )}
              </button>
            </form>

            <div className="auth-portal-footer">
              <p className="auth-portal-managed">{t("landing.managedBy")}</p>
              <Link href="/" className="auth-portal-back">
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("landing.productName")}
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
