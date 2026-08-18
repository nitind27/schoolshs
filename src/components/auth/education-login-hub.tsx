"use client";

import { Spinner } from "@/components/ui/loader";
import { useEffect, useRef, useState } from "react";
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
import {
  PLAYSTORE_DEMO_STUDENT_OTP,
  isPlaystoreDemoStudent,
} from "@/lib/playstore-demo-student";
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
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);
  const isCaPortal = searchParams.get("portal") === "ca";
  const sessionRevoked = searchParams.get("reason") === "session_revoked";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolCodeTouched, setSchoolCodeTouched] = useState(false);
  const [schoolLookupError, setSchoolLookupError] = useState("");
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
  const [studentSetupRequired, setStudentSetupRequired] = useState(false);
  const [studentSetupOtp, setStudentSetupOtp] = useState("");
  const [studentNewPassword, setStudentNewPassword] = useState("");
  const [studentConfirmPassword, setStudentConfirmPassword] = useState("");
  const [showStudentNewPassword, setShowStudentNewPassword] = useState(false);
  const [showStudentConfirmPassword, setShowStudentConfirmPassword] = useState(false);
  const [studentNewPasswordTouched, setStudentNewPasswordTouched] = useState(false);
  const [studentConfirmPasswordTouched, setStudentConfirmPasswordTouched] = useState(false);
  const [studentSetupLoading, setStudentSetupLoading] = useState(false);
  const [studentSetupMsg, setStudentSetupMsg] = useState("");
  const [studentSetupComplete, setStudentSetupComplete] = useState(false);
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
      setSchoolLookupError("");
      return;
    }
    const code = schoolCode.trim().toUpperCase();
    if (!code || code.length < 3) {
      setBranding(null);
      setSchoolLookupError("");
      return;
    }

    const timer = setTimeout(() => {
      setBrandingLoading(true);
      setSchoolLookupError("");
      fetch(`/api/auth/school-branding?code=${encodeURIComponent(code)}`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.error || "School not found");
          setBranding(data.school);
          localStorage.setItem(SCHOOL_CODE_KEY, code);
          setSchoolLookupError("");
          setError("");
        })
        .catch(() => {
          setBranding(null);
          setSchoolLookupError(t("login.schoolNotFound"));
        })
        .finally(() => setBrandingLoading(false));
    }, 450);

    return () => clearTimeout(timer);
  }, [schoolCode, isCaPortal, t]);

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
    const payload: Record<string, unknown> = {
      email: email.trim().toLowerCase(),
      password,
      captchaToken,
      captchaAnswer,
      rememberMe,
      latitude: geo.latitude ?? null,
      longitude: geo.longitude ?? null,
      accuracyM: geo.accuracyM ?? null,
      sessionAction: sessionAction || undefined,
    };
    if (!isCaPortal) {
      payload.schoolCode = schoolCode.trim().toUpperCase();
    }
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    return { res, data };
  };

  const validateSchoolCode = (): boolean => {
    if (isCaPortal) return true;
    const code = schoolCode.trim().toUpperCase();
    // Empty code allowed — Super Admin login (server rejects school accounts without code)
    if (!code) return true;
    setSchoolCodeTouched(true);
    if (code.length < 3) {
      setError(t("login.schoolCodeTooShort"));
      return false;
    }
    if (brandingLoading) {
      setError(t("login.schoolCodeVerifying"));
      return false;
    }
    if (!branding || schoolLookupError) {
      setError(t("login.schoolNotFound"));
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil && new Date(lockedUntil) > new Date()) return;
    if (!validateSchoolCode()) return;

    setLoading(true);
    setError("");
    setCaptchaInvalid(false);
    setEmailNotVerified(false);
    setStudentSetupRequired(false);
    setStudentSetupComplete(false);
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
        if (data.studentSetupRequired) {
          setStudentSetupRequired(true);
          setStudentSetupMsg(
            data.otpSent
              ? t("login.studentSetupOtpSent")
              : t("login.studentSetupOtpAlreadySent"),
          );
          setError("");
          toast.warning(
            t("login.studentSetupTitle"),
            t("login.studentSetupRequired"),
          );
        } else if (data.emailNotVerified) {
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
  const schoolCodeTrimmed = schoolCode.trim();
  const schoolCodeFieldError =
    schoolCodeTouched && !isCaPortal && schoolCodeTrimmed
      ? schoolCodeTrimmed.length < 3
        ? t("login.schoolCodeTooShort")
        : schoolLookupError
      : schoolLookupError || "";
  // Super Admin: empty school code OK. School staff: code must be verified first.
  const canSubmitLogin =
    !loading &&
    !isLocked &&
    !studentSetupRequired &&
    (isCaPortal ||
      !schoolCodeTrimmed ||
      (Boolean(branding) && !brandingLoading && !schoolLookupError));

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

  const getStudentNewPasswordError = (value: string) => {
    if (!value) return t("login.studentPasswordRequired");
    if (value.length < 8) return t("login.studentPasswordTooShort");
    if (!/[A-Za-z]/.test(value)) return t("login.studentPasswordLetterRequired");
    if (!/\d/.test(value)) return t("login.studentPasswordNumberRequired");
    if (value === "123456") return t("login.studentPasswordCannotBeTemporary");
    return "";
  };

  const getStudentConfirmPasswordError = (value: string) => {
    if (!value) return t("login.studentConfirmPasswordRequired");
    if (value !== studentNewPassword) return t("login.studentPasswordMismatch");
    return "";
  };

  const studentNewPasswordError = studentNewPasswordTouched
    ? getStudentNewPasswordError(studentNewPassword)
    : "";
  const studentConfirmPasswordError = studentConfirmPasswordTouched
    ? getStudentConfirmPasswordError(studentConfirmPassword)
    : "";

  const completeStudentSetup = async () => {
    const demoStudent = isPlaystoreDemoStudent(email);
    setStudentNewPasswordTouched(!demoStudent);
    setStudentConfirmPasswordTouched(!demoStudent);
    if (studentSetupOtp.replace(/\D/g, "").length !== 6) {
      setStudentSetupMsg(t("login.otpInvalidLength"));
      return;
    }
    if (!demoStudent) {
      const newPasswordError = getStudentNewPasswordError(studentNewPassword);
      if (newPasswordError) {
        setStudentSetupMsg(newPasswordError);
        toast.warning(
          t("login.studentSetupTitle"),
          newPasswordError,
        );
        return;
      }
      const confirmPasswordError = getStudentConfirmPasswordError(
        studentConfirmPassword,
      );
      if (confirmPasswordError) {
        setStudentSetupMsg(confirmPasswordError);
        toast.warning(
          t("login.studentSetupTitle"),
          confirmPasswordError,
        );
        return;
      }
    }

    setStudentSetupLoading(true);
    setStudentSetupMsg("");
    try {
      const res = await fetch("/api/auth/student-first-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          currentPassword: password,
          otp: studentSetupOtp,
          newPassword: studentNewPassword,
          confirmPassword: studentConfirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data.error || t("login.studentSetupFailed");
        setStudentSetupMsg(message);
        toast.error(t("login.studentSetupFailed"), message);
        return;
      }
      setStudentSetupRequired(false);
      setStudentSetupOtp("");
      setStudentNewPassword("");
      setStudentConfirmPassword("");
      setStudentNewPasswordTouched(false);
      setStudentConfirmPasswordTouched(false);
      setShowStudentNewPassword(false);
      setShowStudentConfirmPassword(false);
      if (!data.keepPassword) {
        setPassword("");
      }
      setCaptchaAnswer("");
      setCaptchaRefreshKey((key) => key + 1);
      setStudentSetupMsg("");
      setStudentSetupComplete(true);
      requestAnimationFrame(() => {
        mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
        passwordInputRef.current?.focus();
      });
      toast.success(
        t("login.studentSetupCompleteTitle"),
        data.keepPassword
          ? t("login.studentSetupCompleteDemo")
          : t("login.studentSetupComplete"),
      );
    } catch {
      setStudentSetupMsg(t("common.networkError"));
    } finally {
      setStudentSetupLoading(false);
    }
  };

  const resendStudentSetupOtp = async () => {
    setResendLoading(true);
    setStudentSetupMsg("");
    try {
      const res = await fetch("/api/auth/student-first-login/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          currentPassword: password,
        }),
      });
      const data = await res.json();
      setStudentSetupMsg(
        res.ok
          ? data.message || t("login.resendSuccess")
          : data.error || t("common.networkError"),
      );
    } catch {
      setStudentSetupMsg(t("common.networkError"));
    } finally {
      setResendLoading(false);
    }
  };

  const handleFormSubmit = (event: React.FormEvent) => {
    if (studentSetupRequired) {
      event.preventDefault();
      void completeStudentSetup();
      return;
    }
    void handleLogin(event);
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

      <header className="auth-login-navbar">
        <div className="auth-login-navbar-inner">
          <Link href="/" className="auth-portal-logo">
            <div className="auth-portal-logo-mark">
              <School className="h-5 w-5" strokeWidth={1.75} />
            </div>
            <div className="auth-login-brand-copy">
              <div className="auth-portal-logo-eyebrow">
                {isCaPortal ? t("login.caLoginBadge") : t("loginHub.badge")}
              </div>
              <div className="auth-portal-logo-title">
                {isCaPortal ? t("caNav.title") : t("landing.productName")}
              </div>
            </div>
          </Link>

          <nav className="auth-login-nav" aria-label="Login page navigation">
            <Link href="/#modules">{t("landing.navModules")}</Link>
            <Link href="/#portals">{t("landing.navPortals")}</Link>
            <Link href="/contact">{t("landing.navContact")}</Link>
          </nav>

          <div className="auth-login-navbar-actions">
            <LanguageSwitcher variant="login" />
            <Link href="/" className="auth-login-home-link">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>{t("landing.productName")}</span>
            </Link>
          </div>
        </div>
      </header>

      <aside className="auth-portal-brand">
        <div className="auth-brand-decor" aria-hidden>
          <div className="auth-brand-orb auth-brand-orb-1" />
          <div className="auth-brand-orb auth-brand-orb-2" />
          <div className="auth-brand-orb auth-brand-orb-3" />
          <div className="auth-brand-grid" />
          <div className="auth-brand-arc" />
        </div>

        <div className="auth-portal-brand-inner">
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
        <div ref={mainScrollRef} className="auth-portal-main-scroll">
          <div className="auth-portal-form-card">
            {sessionRevoked && (
              <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-950">
                {t("login.sessionRevokedBanner")}
              </div>
            )}

            {studentSetupComplete && (
              <div
                className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-emerald-950"
                role="status"
              >
                <p className="font-semibold">
                  {t("login.studentSetupCompleteTitle")}
                </p>
                <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                  {t("login.studentSetupComplete")}
                </p>
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

            <form onSubmit={handleFormSubmit} className="auth-portal-form">
              {!isCaPortal && (
                <div className="auth-portal-field">
                  <label className="auth-portal-label" htmlFor="school-code">
                    {t("login.schoolCode")}
                  </label>
                  <div className="auth-portal-input-wrap">
                    <Building2 className="auth-portal-input-icon" strokeWidth={1.75} />
                    <input
                      id="school-code"
                      type="text"
                      value={schoolCode}
                      onChange={(e) => {
                        setSchoolCode(e.target.value.toUpperCase());
                        setSchoolCodeTouched(true);
                        setSchoolLookupError("");
                        setError("");
                      }}
                      onBlur={() => setSchoolCodeTouched(true)}
                      placeholder={t("login.schoolCodePlaceholder")}
                      className={`auth-portal-input is-mono${schoolCodeFieldError ? " is-invalid" : ""}`}
                      autoComplete="organization"
                      disabled={isLocked}
                      maxLength={20}
                    />
                    {brandingLoading && <Spinner size="sm" className="auth-portal-spinner" />}
                  </div>
                  {schoolCodeFieldError && (
                    <p className="mt-1 text-xs font-medium text-red-600">{schoolCodeFieldError}</p>
                  )}
                  {branding && !schoolCodeFieldError && (
                    <p className="mt-1 text-xs font-medium text-emerald-700">
                      {t("login.schoolVerified")}: {branding.name}
                    </p>
                  )}
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
                    disabled={isLocked || studentSetupRequired}
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
                    ref={passwordInputRef}
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    className="auth-portal-input"
                    style={{ paddingRight: "2.5rem" }}
                    disabled={isLocked || studentSetupRequired}
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

              <label className={`auth-remember${isLocked || studentSetupRequired ? " is-disabled" : ""}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  disabled={isLocked || studentSetupRequired}
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
                disabled={isLocked || studentSetupRequired}
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

            {studentSetupRequired && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-3 text-sm text-blue-950">
                <p className="font-semibold">{t("login.studentSetupTitle")}</p>
                <p className="mt-1 text-xs leading-relaxed text-blue-800">
                  {isPlaystoreDemoStudent(email)
                    ? t("login.studentSetupDemoHint")
                    : t("login.studentSetupHint", { email: email.trim().toLowerCase() })}
                </p>
                {isPlaystoreDemoStudent(email) ? (
                  <p className="mt-2 rounded-lg border border-blue-200 bg-white px-3 py-2 font-mono text-sm font-bold tracking-[0.3em] text-blue-900">
                    {t("login.studentSetupDemoOtp", { otp: PLAYSTORE_DEMO_STUDENT_OTP })}
                  </p>
                ) : null}

                <div className="mt-3">
                  <label className="mb-2 block text-xs font-semibold">
                    {t("login.otpLabel")}
                  </label>
                  <OtpInput
                    value={studentSetupOtp}
                    onChange={setStudentSetupOtp}
                    disabled={studentSetupLoading}
                    boxClassName="border-blue-300 focus:border-blue-500 focus:ring-blue-200"
                  />
                </div>

                {!isPlaystoreDemoStudent(email) ? (
                <div className="mt-3 grid gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold" htmlFor="student-new-password">
                      {t("login.studentNewPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="student-new-password"
                        type={showStudentNewPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={studentNewPassword}
                        onChange={(event) => {
                          setStudentNewPassword(event.target.value);
                        }}
                        onBlur={() => setStudentNewPasswordTouched(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void completeStudentSetup();
                          }
                        }}
                        placeholder={t("login.studentNewPasswordPlaceholder")}
                        className={`h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm outline-none focus:ring-2 ${
                          studentNewPasswordError
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                            : "border-blue-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                        aria-invalid={Boolean(studentNewPasswordError)}
                        aria-describedby={
                          studentNewPasswordError
                            ? "student-new-password-error"
                            : "student-password-rules"
                        }
                        disabled={studentSetupLoading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowStudentNewPassword((value) => !value)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-700 hover:text-blue-950"
                        aria-label={
                          showStudentNewPassword
                            ? t("login.hidePassword")
                            : t("login.showPassword")
                        }
                        disabled={studentSetupLoading}
                      >
                        {showStudentNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {studentNewPasswordError && (
                      <p
                        id="student-new-password-error"
                        className="mt-1 text-xs font-medium text-red-600"
                      >
                        {studentNewPasswordError}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold" htmlFor="student-confirm-password">
                      {t("login.studentConfirmPassword")}
                    </label>
                    <div className="relative">
                      <input
                        id="student-confirm-password"
                        type={showStudentConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={studentConfirmPassword}
                        onChange={(event) =>
                          setStudentConfirmPassword(event.target.value)
                        }
                        onBlur={() => setStudentConfirmPasswordTouched(true)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            void completeStudentSetup();
                          }
                        }}
                        placeholder={t("login.studentConfirmPasswordPlaceholder")}
                        className={`h-10 w-full rounded-lg border bg-white px-3 pr-10 text-sm outline-none focus:ring-2 ${
                          studentConfirmPasswordError
                            ? "border-red-400 focus:border-red-500 focus:ring-red-100"
                            : "border-blue-200 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                        aria-invalid={Boolean(studentConfirmPasswordError)}
                        aria-describedby={
                          studentConfirmPasswordError
                            ? "student-confirm-password-error"
                            : undefined
                        }
                        disabled={studentSetupLoading}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowStudentConfirmPassword((value) => !value)
                        }
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-blue-700 hover:text-blue-950"
                        aria-label={
                          showStudentConfirmPassword
                            ? t("login.hidePassword")
                            : t("login.showPassword")
                        }
                        disabled={studentSetupLoading}
                      >
                        {showStudentConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {studentConfirmPasswordError && (
                      <p
                        id="student-confirm-password-error"
                        className="mt-1 text-xs font-medium text-red-600"
                      >
                        {studentConfirmPasswordError}
                      </p>
                    )}
                  </div>
                </div>
                ) : null}

                {!isPlaystoreDemoStudent(email) ? (
                <p id="student-password-rules" className="mt-2 text-[11px] text-blue-700">
                  {t("login.studentPasswordRules")}
                </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={completeStudentSetup}
                    disabled={
                      studentSetupLoading ||
                      studentSetupOtp.length !== 6 ||
                      (!isPlaystoreDemoStudent(email) &&
                        (!studentNewPassword || !studentConfirmPassword))
                    }
                    className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {studentSetupLoading
                      ? t("login.studentSetupSaving")
                      : isPlaystoreDemoStudent(email)
                        ? t("login.studentVerifyDemo")
                        : t("login.studentVerifyAndChange")}
                  </button>
                  <button
                    type="button"
                    onClick={resendStudentSetupOtp}
                    disabled={resendLoading || studentSetupLoading}
                    className="text-xs font-semibold text-blue-800 underline hover:no-underline disabled:opacity-50"
                  >
                    {resendLoading
                      ? t("login.resending")
                      : t("login.resendVerification")}
                  </button>
                </div>
                {studentSetupMsg && (
                  <p className="mt-2 text-xs font-medium">{studentSetupMsg}</p>
                )}
              </div>
            )}

            {!studentSetupRequired && (
              <button
                type="submit"
                className="auth-portal-submit"
                disabled={!canSubmitLogin}
              >
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
            )}
            </form>

            <div className="auth-portal-footer">
              <p className="auth-portal-managed">{t("landing.managedBy")}</p>
              <div className="auth-portal-footer-links">
                <Link href="/privacy" className="auth-portal-back">
                  Privacy Policy
                </Link>
                <Link href="/" className="auth-portal-back">
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t("landing.productName")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
