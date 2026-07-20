"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { StudentIdCard } from "@/components/id-cards/student-id-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Loader2, Lock, LogOut, Printer, Shield } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { SCHOOL_LOGO_URL } from "@/lib/school-assets";
import type { SchoolSettings, Student } from "@/generated/prisma/client";
import "@/components/id-cards/id-card-print.css";

interface ShareStudent {
  id: string;
  firstName: string;
  middleName: string | null;
  surname: string;
  fatherName: string | null;
  mobileNumber: string | null;
  dateOfBirth: string | null;
  grNumber: string | null;
  rollNumber: string | null;
  standard: string | null;
  section: string | null;
  currentAddress: string | null;
  currentCity: string | null;
  currentDistrict: string | null;
  schoolClass?: { name: string; standard: string; section: string } | null;
  photoUrl?: string;
}

interface ShareSettings {
  schoolName: string;
  schoolAddress: string | null;
  schoolPhone: string | null;
  academicYear: string;
  tagline: string | null;
  idCardPrimaryColor: string;
  idCardAccentColor: string;
  logoUrl: string | null;
}

export function IdCardSharePortal() {
  const t = useT();
  const params = useParams();
  const slug = String(params.slug || "");

  const [meta, setMeta] = useState<{ schoolName?: string; label?: string; authenticated?: boolean } | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [students, setStudents] = useState<ShareStudent[]>([]);
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [label, setLabel] = useState("");

  const loadCards = useCallback(async () => {
    const res = await fetch(`/api/id-cards/share/${slug}/data`);
    if (!res.ok) return;
    const data = await res.json();
    setStudents(data.students || []);
    setSettings(data.settings || null);
    setLabel(data.label || "");
    setMeta((m) => ({ ...m, authenticated: true }));
  }, [slug]);

  const loadMeta = useCallback(async () => {
    const res = await fetch(`/api/id-cards/share/${slug}`);
    if (!res.ok) {
      setMeta(null);
      setPageLoading(false);
      return;
    }
    const data = await res.json();
    setMeta(data);
    if (data.authenticated) {
      await loadCards();
    }
    setPageLoading(false);
  }, [slug, loadCards]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");
    const res = await fetch(`/api/id-cards/share/${slug}/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAuthError(data.error || t("idCardShare.invalidCredentials"));
      setAuthLoading(false);
      return;
    }
    await loadCards();
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await fetch(`/api/id-cards/share/${slug}/auth`, { method: "DELETE" });
    setStudents([]);
    setSettings(null);
    setMeta((m) => ({ ...m, authenticated: false }));
    setPassword("");
  };

  if (pageLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!meta) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="rounded-2xl border border-red-200 bg-white p-8 text-center shadow-lg max-w-md">
          <Shield className="mx-auto h-12 w-12 text-red-400 mb-3" />
          <h1 className="text-lg font-bold text-slate-900">{t("idCardShare.linkInvalid")}</h1>
          <p className="mt-2 text-sm text-slate-500">{t("idCardShare.linkInvalidDesc")}</p>
        </div>
      </div>
    );
  }

  if (!meta.authenticated || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/95 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg">
              <CreditCard className="h-7 w-7" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">{meta.schoolName}</h1>
            {meta.label && <p className="mt-1 text-sm text-slate-500">{meta.label}</p>}
            <p className="mt-3 text-xs text-slate-400">{t("idCardShare.loginPrompt")}</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label={t("idCardShare.username")}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <Input
              label={t("idCardShare.password")}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            {authError && (
              <p className="text-sm text-red-600 flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5" />
                {authError}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={authLoading}>
              {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("idCardShare.openCards")}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const cardSettings = settings as unknown as SchoolSettings;

  return (
    <div className="id-card-share-page min-h-screen bg-slate-100">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold text-slate-900">{settings.schoolName}</h1>
            <p className="text-xs text-slate-500">
              {label || t("idCardShare.printBatch")} · {t("idCardShare.cardsCount", { count: students.length })}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t("idCardShare.logout")}</span>
            </Button>
            <Button size="sm" onClick={() => window.print()} disabled={students.length === 0}>
              <Printer className="h-3.5 w-3.5" />
              {t("idCardShare.printAll")}
            </Button>
          </div>
        </div>
      </div>

      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-500 print:hidden">
          <CreditCard className="h-12 w-12 opacity-30 mb-3" />
          <p>{t("idCards.noStudentsHint")}</p>
        </div>
      ) : (
        <div className="id-card-print-bundle mx-auto max-w-6xl px-4 py-6 print:p-0">
          {students.map((s, i) => (
            <div key={s.id} className="id-card-print-sheet">
              <div className="id-card-print-inner">
                <StudentIdCard
                  student={s as unknown as Student & { schoolClass?: ShareStudent["schoolClass"] }}
                  settings={cardSettings}
                  photoUrl={s.photoUrl}
                  logoUrl={settings.logoUrl || SCHOOL_LOGO_URL}
                  className="id-card-print-size"
                />
                <p className="id-card-print-label print:hidden text-xs text-slate-400 mt-2 text-center">
                  {i + 1} / {students.length}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
