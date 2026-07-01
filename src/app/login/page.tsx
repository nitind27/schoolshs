"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GraduationCap, Lock, Mail, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { useT } from "@/i18n/locale-provider";

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

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-950 text-white p-12 flex-col justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/10 rounded-xl">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("login.title")}</h1>
              <p className="text-blue-200 text-sm">{t("login.subtitle")}</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold leading-tight whitespace-pre-line">
            {t("login.headline")}
          </h2>
          <ul className="space-y-3 text-blue-100 text-sm">
            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> {t("login.feature1")}</li>
            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> {t("login.feature2")}</li>
            <li className="flex items-center gap-2"><Shield className="h-4 w-4" /> {t("login.feature3")}</li>
          </ul>
        </div>
        <p className="text-xs text-blue-300">{t("common.copyright")}</p>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-blue-700" />
              <h1 className="text-xl font-bold text-slate-900">{t("login.title")}</h1>
            </div>
            <LanguageSwitcher variant="compact" className="w-36" />
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">{t("login.formTitle")}</h2>
                <p className="text-slate-500 text-sm mt-1">{t("login.formSubtitle")}</p>
              </div>
              <div className="hidden lg:block w-40 shrink-0">
                <LanguageSwitcher variant="login" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                  <Mail className="h-4 w-4" /> {t("common.email")}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@songadh.local"
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 flex items-center gap-1 mb-1">
                  <Lock className="h-4 w-4" /> {t("login.password")}
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-11 px-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              <Button type="submit" className="w-full h-11" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login.loginBtn")}
              </Button>
            </form>

            <div className="mt-6 p-3 bg-slate-50 rounded-lg text-xs text-slate-500 space-y-1">
              <p><strong>{t("login.demoSuperAdmin")}:</strong> superadmin@shs.local / SuperAdmin@123</p>
              <p><strong>{t("login.demoSchoolAdmin")}:</strong> admin@songadh.local / SchoolAdmin@123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <LoginForm />
    </Suspense>
  );
}
