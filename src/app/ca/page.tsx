"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, FileSearch, BarChart3, CheckCircle, AlertTriangle, ArrowRight, Clock3, Building2 } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import { Button } from "@/components/ui/button";

interface CaSchool {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
  pendingVouchers?: number;
  financialYear?: {
    label: string;
    auditStatus: string;
    submittedAt?: string | null;
    _count?: { vouchers: number };
  } | null;
}

export default function CaDashboard() {
  const t = useT();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [schools, setSchools] = useState<CaSchool[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    Promise.all([
      fetch("/api/accounting").then((r) => r.json()),
      fetch("/api/ca/schools").then((r) => r.json()),
    ])
      .then(([accounting, caSchools]) => {
        if (accounting?.error) throw new Error(accounting.error);
        setData(accounting);
        setSchools(caSchools.schools || []);
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"));
  };

  useEffect(load, []);

  const pending = (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "pending")?._count || 0;
  const verified = (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "verified")?._count || 0;
  const flagged = (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "flagged")?._count || 0;
  const fy = data?.financialYear as { label: string; auditStatus: string } | null;
  const school = data?.school as { id: string; name: string } | null;
  const recentVouchers =
    (data?.recentVouchers as { id: string; voucherDate: string; voucherType: string; voucherNo: string; totalAmount: number; auditStatus: string }[] | undefined) || [];

  const auditStatusLabel = (status: string) => {
    const key = `auditStatus.${status}` as "auditStatus.pending";
    const translated = t(key);
    return translated !== key ? translated : status;
  };

  const switchSchool = async (schoolId: string) => {
    await fetch("/api/ca/schools", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ schoolId }),
    });
    load();
    window.location.reload();
  };

  if (!data && !error) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-violet-200 bg-gradient-to-r from-white via-violet-50/50 to-indigo-50/50 p-5">
        <h1 className="text-2xl font-bold text-slate-900">{t("caPortal.dashboardTitle")}</h1>
        <p className="text-slate-600">{t("caPortal.dashboardSubtitle")}</p>
        {school?.name && (
          <p className="mt-2 text-sm font-semibold text-violet-800">
            {t("caPortal.activeSchool")}: {school.name}
          </p>
        )}
      </div>

      {error && (
        <Card className="border-red-200">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      )}

      {schools.length > 0 && (
        <Card className="border-violet-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building2 className="h-5 w-5 text-violet-600" />
              {t("caPortal.assignedSchools")}
            </CardTitle>
            <p className="text-sm text-slate-500">{t("caPortal.assignedSchoolsDesc")}</p>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {schools.map((s) => {
              const fyInfo = s.financialYear;
              const status = fyInfo?.auditStatus || "open";
              return (
                <div
                  key={s.id}
                  className={`rounded-xl border p-4 transition-all ${
                    s.isActive ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200" : "border-slate-200 bg-white hover:border-violet-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{t("caPortal.schoolCode")}: {s.code}</p>
                      <p className="text-xs text-slate-600 mt-2">
                        {fyInfo ? `${t("caPortal.financialYear")}: ${fyInfo.label}` : t("accounting.fyNotSet")}
                      </p>
                      <p className="text-xs font-medium text-violet-700 mt-1">
                        {t("caPortal.fyStatus")}: {auditStatusLabel(status)}
                      </p>
                      {fyInfo?.submittedAt ? (
                        <p className="text-[11px] text-slate-500 mt-1">
                          {t("caPortal.submittedOn")}: {new Date(fyInfo.submittedAt).toLocaleDateString("en-IN")}
                        </p>
                      ) : (
                        <p className="text-[11px] text-amber-600 mt-1">{t("caPortal.noSubmission")}</p>
                      )}
                    </div>
                    {!s.isActive && (
                      <Button size="sm" variant="outline" onClick={() => switchSchool(s.id)}>
                        {t("caPortal.switchSchool")}
                      </Button>
                    )}
                  </div>
                  {(s.pendingVouchers || 0) > 0 && (
                    <p className="text-xs text-amber-700 mt-3 font-medium">
                      {s.pendingVouchers} {t("caPortal.pendingVerification").toLowerCase()}
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Card className="border-violet-200 bg-violet-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Shield className="h-12 w-12 text-violet-700" />
            <div>
              <p className="font-semibold text-violet-900">{t("caPortal.financialYear")}: {fy?.label || t("accounting.fyNotSet")}</p>
              <p className="text-sm text-violet-700">{t("caPortal.auditStatusLabel")}: <span className="font-bold">{auditStatusLabel(fy?.auditStatus || "open")}</span></p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-4 gap-4">
        <Card><CardContent className="p-6"><AlertTriangle className="h-8 w-8 text-amber-600 mb-2" /><p className="text-sm text-slate-500">{t("caPortal.pendingVerification")}</p><p className="text-3xl font-bold text-amber-600">{pending.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-6"><CheckCircle className="h-8 w-8 text-emerald-600 mb-2" /><p className="text-sm text-slate-500">{t("caPortal.verifiedVouchers")}</p><p className="text-3xl font-bold text-emerald-600">{verified.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-6"><Shield className="h-8 w-8 text-red-600 mb-2" /><p className="text-sm text-slate-500">{t("auditStatus.flagged")}</p><p className="text-3xl font-bold text-red-600">{flagged.toLocaleString("en-IN")}</p></CardContent></Card>
        <Card><CardContent className="p-6"><BarChart3 className="h-8 w-8 text-violet-600 mb-2" /><p className="text-sm text-slate-500">{t("accounting.totalVouchers")}</p><p className="text-3xl font-bold">{((fy as { _count?: { vouchers: number } })?._count?.vouchers || 0).toLocaleString("en-IN")}</p></CardContent></Card>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Link href="/ca/verify"><Card className="hover:border-violet-300"><CardContent className="p-6 flex gap-4"><FileSearch className="h-10 w-10 text-violet-600" /><div><h3 className="font-semibold">{t("caPortal.verifyVouchersTitle")}</h3><p className="text-sm text-slate-500">{t("caPortal.verifyVouchersDesc")}</p><ArrowRight className="h-4 w-4 text-violet-600 mt-2" /></div></CardContent></Card></Link>
        <Link href="/accounting/trial-balance"><Card className="hover:border-violet-300"><CardContent className="p-6 flex gap-4"><BarChart3 className="h-10 w-10 text-blue-600" /><div><h3 className="font-semibold">{t("caNav.trialBalance")}</h3><p className="text-sm text-slate-500">{t("caPortal.trialBalanceDesc")}</p><ArrowRight className="h-4 w-4 text-blue-600 mt-2" /></div></CardContent></Card></Link>
        <Link href="/accounting/reports"><Card className="hover:border-violet-300"><CardContent className="p-6 flex gap-4"><Shield className="h-10 w-10 text-emerald-600" /><div><h3 className="font-semibold">{t("caNav.financialReports")}</h3><p className="text-sm text-slate-500">{t("caPortal.financialReportsDesc")}</p><ArrowRight className="h-4 w-4 text-emerald-600 mt-2" /></div></CardContent></Card></Link>
        <Link href="/ca/audit"><Card className="hover:border-violet-300"><CardContent className="p-6 flex gap-4"><CheckCircle className="h-10 w-10 text-amber-600" /><div><h3 className="font-semibold">{t("caPortal.auditSession")}</h3><p className="text-sm text-slate-500">{t("caPortal.auditSessionDesc")}</p><ArrowRight className="h-4 w-4 text-amber-600 mt-2" /></div></CardContent></Card></Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock3 className="h-5 w-5 text-violet-600" />
            {t("caPortal.recentVouchers")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentVouchers.length === 0 ? (
            <p className="text-sm text-slate-500">{t("caPortal.noVouchersThisFy")}</p>
          ) : (
            <div className="space-y-2">
              {recentVouchers.map((v) => (
                <div key={v.id} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{v.voucherNo} - {v.voucherType}</p>
                    <p className="text-xs text-slate-500">{new Date(v.voucherDate).toLocaleDateString("en-IN")}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-900">{formatIndianCurrency(v.totalAmount || 0)}</p>
                    <p className="text-xs text-slate-500 capitalize">{auditStatusLabel(v.auditStatus)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
