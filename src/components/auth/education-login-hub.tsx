"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap, Lock, Mail, Loader2, Shield, BookOpen,
  Calculator, UserCheck, Building2, ChevronRight, Award,
  FileText, Users, Wallet, IdCard, Sparkles, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";
import { CERTIFICATE_SCHOOL } from "@/lib/certificates/config";

const PORTALS = [
  { roleKey: "school_admin", email: "admin@songadh.local", pass: "SchoolAdmin@123", icon: Building2, gradient: "from-blue-600 to-indigo-600", ring: "ring-blue-500" },
  { roleKey: "teacher", email: "teacher@songadh.local", pass: "Teacher@123", icon: BookOpen, gradient: "from-emerald-500 to-teal-600", ring: "ring-emerald-500" },
  { roleKey: "clerk", email: "clerk@songadh.local", pass: "Clerk@123", icon: UserCheck, gradient: "from-amber-500 to-orange-500", ring: "ring-amber-500" },
  { roleKey: "student", email: "student@songadh.local", pass: "Student@123", icon: GraduationCap, gradient: "from-sky-500 to-cyan-500", ring: "ring-sky-500" },
  { roleKey: "ca", email: "ca@songadh.local", pass: "CA@12345", icon: Calculator, gradient: "from-rose-500 to-pink-600", ring: "ring-rose-500" },
  { roleKey: "super_admin", email: "superadmin@shs.local", pass: "SuperAdmin@123", icon: Shield, gradient: "from-violet-600 to-purple-600", ring: "ring-violet-500" },
] as const;

const MODULES = [
  { icon: Award, labelKey: "loginHub.moduleScholarship" },
  { icon: FileText, labelKey: "loginHub.moduleResults" },
  { icon: Wallet, labelKey: "loginHub.moduleAccounting" },
  { icon: Users, labelKey: "loginHub.moduleAdmissions" },
  { icon: IdCard, labelKey: "loginHub.moduleIdCards" },
  { icon: BookOpen, labelKey: "loginHub.moduleCertificates" },
] as const;

export function EducationLoginHub({ next = "/" }: { next?: string }) {
  const router = useRouter();
  const t = useT();
  const [email, setEmail] = useState("admin@songadh.local");
  const [password, setPassword] = useState("SchoolAdmin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<string>("school_admin");

  const selectPortal = (portal: (typeof PORTALS)[number]) => {
    setSelectedRole(portal.roleKey);
    setEmail(portal.email);
    setPassword(portal.pass);
    setError("");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t("common.loginFailed"));
        return;
      }
      router.push(data.redirect || next);
      router.refresh();
    } catch {
      setError(t("common.networkError"));
    } finally {
      setLoading(false);
    }
  };

  const activePortal = PORTALS.find((p) => p.roleKey === selectedRole);

  return (
    <div className="login-hub min-h-screen flex flex-col lg:flex-row bg-[#f0f4fa]">
      {/* ── Hero Panel ───────────────────────────────────── */}
      <div className="login-hub-hero relative lg:w-[54%] xl:w-[58%] shrink-0 overflow-hidden text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0c1e4a] via-[#1e3a8a] to-[#2563eb]" />
        <div className="absolute inset-0 opacity-[0.07]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-cyan-400/20 blur-3xl" />

        <div className="relative z-10 flex flex-col min-h-[320px] lg:min-h-screen p-8 lg:p-12 xl:p-14">
          {/* Top bar */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur border border-white/20 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-200">{t("loginHub.badge")}</p>
                <h1 className="text-lg font-bold leading-tight">{t("erp.systemName")}</h1>
              </div>
            </div>
            <LanguageSwitcher variant="hero" />
          </div>

          {/* School branding */}
          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-xs font-medium text-blue-100 mb-6 w-fit">
              <Sparkles className="h-3.5 w-3.5" />
              {t("loginHub.trustedPlatform")}
            </div>
            <h2 className="text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              {CERTIFICATE_SCHOOL.nameGu}
            </h2>
            <p className="text-blue-100/90 text-sm mt-2 font-medium">{CERTIFICATE_SCHOOL.nameEnAlt}</p>
            <p className="text-blue-200/80 text-sm mt-4 leading-relaxed max-w-md">
              {t("loginHub.heroDesc")}
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-8">
              {[
                { val: "500+", label: t("loginHub.statStudents") },
                { val: "6", label: t("loginHub.statPortals") },
                { val: "100%", label: t("loginHub.statSecure") },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 px-4 py-3 text-center">
                  <p className="text-2xl font-bold">{s.val}</p>
                  <p className="text-[11px] text-blue-200 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Modules grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-8">
              {MODULES.map((m) => (
                <div key={m.labelKey} className="flex items-center gap-2.5 rounded-xl bg-white/8 border border-white/10 px-3 py-2.5 backdrop-blur-sm">
                  <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                    <m.icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-xs font-medium text-blue-50 leading-tight">{t(m.labelKey)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Trust footer */}
          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap gap-4 text-[11px] text-blue-300/80">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {t("loginHub.gsebReady")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {t("loginHub.digitalGujarat")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="h-3.5 w-3.5" /> {CERTIFICATE_SCHOOL.diseCode}</span>
          </div>
        </div>
      </div>

      {/* ── Login Panel ──────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-[440px]">
          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{t("loginHub.badge")}</p>
                <h1 className="text-base font-bold text-slate-900">{t("erp.systemName")}</h1>
              </div>
            </div>
            <LanguageSwitcher variant="login" className="shrink-0" />
          </div>

          <div className="login-hub-card rounded-3xl bg-white border border-slate-200/80 shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Card header gradient strip */}
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600" />

            <div className="p-8 pt-7">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{t("login.formTitle")}</h2>
                  <p className="text-sm text-slate-500 mt-1">{t("loginHub.selectRole")}</p>
                </div>
                <div className="hidden lg:block shrink-0">
                  <LanguageSwitcher variant="login" />
                </div>
              </div>

              {/* Portal selector */}
              <div className="grid grid-cols-3 gap-2 mb-6">
                {PORTALS.map((p) => {
                  const active = selectedRole === p.roleKey;
                  return (
                    <button
                      key={p.roleKey}
                      type="button"
                      onClick={() => selectPortal(p)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl border p-2.5 transition-all ${
                        active
                          ? `border-transparent bg-gradient-to-br ${p.gradient} text-white shadow-md ring-2 ${p.ring} ring-offset-2`
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white"
                      }`}
                    >
                      <p.icon className={`h-5 w-5 ${active ? "text-white" : "text-slate-500"}`} />
                      <span className="text-[10px] font-semibold leading-tight text-center">
                        {t(`roles.${p.roleKey}` as "roles.school_admin")}
                      </span>
                    </button>
                  );
                })}
              </div>

              {activePortal && (
                <div className={`mb-5 flex items-center gap-3 rounded-xl bg-gradient-to-r ${activePortal.gradient} p-3 text-white shadow-sm`}>
                  <activePortal.icon className="h-5 w-5 shrink-0 opacity-90" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{t(`roles.${activePortal.roleKey}` as "roles.school_admin")}</p>
                    <p className="text-[11px] text-white/80">{t("loginHub.portalReady")}</p>
                  </div>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("common.email")}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@school.local"
                      className="login-hub-input w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t("login.password")}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="login-hub-input w-full h-12 pl-11 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm text-slate-900 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    <span className="shrink-0 mt-0.5">⚠</span>
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 border-0"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> {t("loginHub.signingIn")}</>
                  ) : (
                    <>{t("login.loginBtn")} <ChevronRight className="h-4 w-4" /></>
                  )}
                </Button>
              </form>
            </div>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400 leading-relaxed">
            {t("loginHub.footerNote")}
            <br />
            <span className="text-slate-500">{CERTIFICATE_SCHOOL.address}</span>
          </p>
        </div>
      </div>
    </div>
  );
}
