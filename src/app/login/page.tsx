"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GraduationCap, Lock, Mail, Loader2, Shield, Users,
  Calculator, BookOpen, UserCheck, ChevronRight, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

const PORTALS = [
  {
    roleKey: "super_admin",
    email: "superadmin@shs.local",
    pass: "SuperAdmin@123",
    icon: Shield,
    color: "from-violet-600 to-purple-700",
    bg: "bg-violet-50 border-violet-200",
    label: "Super Admin",
    desc: "System control",
  },
  {
    roleKey: "school_admin",
    email: "admin@songadh.local",
    pass: "SchoolAdmin@123",
    icon: Building2,
    color: "from-blue-600 to-indigo-700",
    bg: "bg-blue-50 border-blue-200",
    label: "School Admin",
    desc: "Full school access",
  },
  {
    roleKey: "teacher",
    email: "teacher@songadh.local",
    pass: "Teacher@123",
    icon: BookOpen,
    color: "from-emerald-600 to-teal-700",
    bg: "bg-emerald-50 border-emerald-200",
    label: "Teacher",
    desc: "Classes & results",
  },
  {
    roleKey: "clerk",
    email: "clerk@songadh.local",
    pass: "Clerk@123",
    icon: UserCheck,
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-50 border-amber-200",
    label: "Clerk",
    desc: "Admissions & docs",
  },
  {
    roleKey: "ca",
    email: "ca@songadh.local",
    pass: "CA@12345",
    icon: Calculator,
    color: "from-rose-600 to-pink-700",
    bg: "bg-rose-50 border-rose-200",
    label: "Chartered Accountant",
    desc: "Audit & finance",
  },
  {
    roleKey: "student",
    email: "student@songadh.local",
    pass: "Student@123",
    icon: GraduationCap,
    color: "from-sky-500 to-cyan-600",
    bg: "bg-sky-50 border-sky-200",
    label: "Student",
    desc: "My scholarship",
  },
] as const;

function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-200 border-t-blue-600" />
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const next = searchParams.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const quickLogin = (portal: (typeof PORTALS)[number]) => {
    setEmail(portal.email);
    setPassword(portal.pass);
    setError("");
  };

  return (
    <div className="min-h-screen flex bg-slate-50">

      {/* ── Left panel ──────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[480px] xl:w-[520px] shrink-0 flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e3a8a 55%, #1d4ed8 100%)" }}
      >
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute -right-20 top-10 h-72 w-72 rounded-full opacity-10" style={{ background: "radial-gradient(circle, white 0%, transparent 60%)" }} />
        <div className="pointer-events-none absolute -left-16 bottom-16 h-56 w-56 rounded-full opacity-8" style={{ background: "radial-gradient(circle, #60a5fa 0%, transparent 60%)" }} />

        {/* Brand */}
        <div className="relative">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)", border: "1px solid rgba(255,255,255,.2)" }}>
              <GraduationCap className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white leading-tight">{t("erp.systemName")}</h1>
              <p className="text-xs text-blue-300">{t("erp.systemTagline")}</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white leading-snug">
              {t("erp.headline")}
            </h2>
            <p className="text-sm text-blue-200 mt-3 leading-relaxed">
              Government & Private School Scholarship Management Portal — Digital Gujarat
            </p>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {["Multi-School", "Bulk Submit", "Auto Apply", "Bilingual", "Aadhaar Ready"].map((f) => (
              <span key={f} className="rounded-full text-xs font-medium px-3 py-1.5" style={{ background: "rgba(255,255,255,.12)", color: "rgba(255,255,255,.85)", border: "1px solid rgba(255,255,255,.15)" }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Portal cards */}
        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-300/70 mb-4">Quick Portal Access</p>
          <div className="grid grid-cols-2 gap-2.5">
            {PORTALS.map((p) => (
              <button
                key={p.roleKey}
                onClick={() => quickLogin(p)}
                className="group flex items-center gap-3 rounded-xl px-3.5 py-3 text-left transition-all"
                style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.1)" }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.13)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.07)"; }}
              >
                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${p.color}`}>
                  <p.icon className="h-4 w-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-tight">{p.label}</p>
                  <p className="text-[10px] text-blue-300/70 leading-tight">{p.desc}</p>
                </div>
                <ChevronRight className="h-3 w-3 text-white/30 shrink-0 ml-auto group-hover:text-white/60 transition-colors" />
              </button>
            ))}
          </div>
        </div>

        <p className="relative text-[11px] text-blue-400/60 mt-6">{t("common.copyright")}</p>
      </div>

      {/* ── Right panel ─────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-[420px]">

          {/* Mobile brand */}
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">{t("erp.systemName")}</h1>
                <p className="text-xs text-slate-500">Digital Gujarat Portal</p>
              </div>
            </div>
            <LanguageSwitcher variant="compact" className="w-36" />
          </div>

          {/* Login card */}
          <div className="rounded-2xl bg-white border border-slate-200 shadow-xl p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("login.formTitle")}</h2>
                <p className="text-sm text-slate-500 mt-1">{t("erp.selectPortalLogin")}</p>
              </div>
              <div className="hidden lg:block shrink-0">
                <LanguageSwitcher variant="login" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {t("common.email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@school.local"
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  {t("login.password")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 rounded-xl border border-slate-300 text-sm bg-white text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <span className="shrink-0">⚠</span>
                  {error}
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in…
                  </>
                ) : (
                  <>
                    {t("login.loginBtn")}
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo portals */}
            <div className="mt-6">
              <div className="relative flex items-center gap-3 mb-4">
                <div className="h-px flex-1 bg-slate-200" />
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{t("erp.demoPortals")}</p>
                <div className="h-px flex-1 bg-slate-200" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PORTALS.map((p) => (
                  <button
                    key={p.roleKey}
                    onClick={() => quickLogin(p)}
                    className={`group flex items-center gap-2.5 rounded-xl border p-3 text-left transition-all hover:shadow-sm ${p.bg}`}
                  >
                    <div className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${p.color}`}>
                      <p.icon className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-800 leading-tight truncate">{p.label}</p>
                      <p className="text-[10px] text-slate-500 leading-tight">{t("erp.clickToFill")}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-4 text-center text-xs text-slate-400">
            Secured portal — Government of Gujarat &amp; Private Schools
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginForm />
    </Suspense>
  );
}
