"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Shield,
  FileSearch,
  BarChart3,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Clock3,
  Building2,
  Briefcase,
} from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import "@/components/ca/ca-portal.css";

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

function statusBadgeClass(status: string) {
  if (status === "verified" || status === "closed" || status === "completed") return "is-ok";
  if (status === "flagged" || status === "query") return "is-danger";
  if (status === "pending" || status === "submitted" || status === "open") return "is-warn";
  return "is-muted";
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

  const pending =
    (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "pending")
      ?._count || 0;
  const verified =
    (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "verified")
      ?._count || 0;
  const flagged =
    (data?.voucherStats as { auditStatus: string; _count: number }[])?.find((s) => s.auditStatus === "flagged")
      ?._count || 0;
  const fy = data?.financialYear as { label: string; auditStatus: string; _count?: { vouchers: number } } | null;
  const school = data?.school as { id: string; name: string } | null;
  const recentVouchers =
    (data?.recentVouchers as
      | { id: string; voucherDate: string; voucherType: string; voucherNo: string; totalAmount: number; auditStatus: string }[]
      | undefined) || [];

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
      <div className="ca-portal">
        <div className="ca-loading">
          <div className="ca-loading-spinner" />
        </div>
      </div>
    );
  }

  const totalVouchers = fy?._count?.vouchers || 0;

  return (
    <div className="ca-portal space-y-6">
      <header className="ca-portal-hero">
        <div className="ca-portal-hero-inner">
          <div>
            <div className="ca-portal-eyebrow">
              <Briefcase className="h-3.5 w-3.5" />
              {t("caNav.title")}
            </div>
            <h1>{t("caPortal.dashboardTitle")}</h1>
            <p>{t("caPortal.dashboardSubtitle")}</p>
          </div>
          <div className="ca-portal-hero-meta">
            {school?.name && (
              <span className="ca-portal-pill is-accent">
                <Building2 className="h-3.5 w-3.5" />
                {school.name}
              </span>
            )}
            {fy?.label && (
              <span className="ca-portal-pill">
                <Shield className="h-3.5 w-3.5" />
                FY {fy.label}
              </span>
            )}
          </div>
        </div>
      </header>

      {error && (
        <div className="ca-panel">
          <div className="ca-panel-body text-sm font-medium text-red-700">{error}</div>
        </div>
      )}

      {schools.length > 0 && (
        <section className="ca-panel">
          <div className="ca-panel-head">
            <div>
              <h2>
                <Building2 className="h-5 w-5 text-amber-700" />
                {t("caPortal.assignedSchools")}
              </h2>
              <p>{t("caPortal.assignedSchoolsDesc")}</p>
            </div>
          </div>
          <div className="ca-panel-body">
            <div className="ca-school-grid">
              {schools.map((s) => {
                const fyInfo = s.financialYear;
                const status = fyInfo?.auditStatus || "open";
                return (
                  <article key={s.id} className={`ca-school-card ${s.isActive ? "is-active" : ""}`}>
                    <div className="ca-school-card-top">
                      <div className="min-w-0">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          {s.isActive && <span className="ca-badge is-active">{t("caPortal.activeSchool")}</span>}
                          <span className={`ca-badge ${statusBadgeClass(status)}`}>{auditStatusLabel(status)}</span>
                        </div>
                        <h3 className="ca-school-name">{s.name}</h3>
                        <p className="ca-school-code">
                          {t("caPortal.schoolCode")}: {s.code}
                        </p>
                      </div>
                      {!s.isActive && (
                        <button type="button" className="ca-btn shrink-0" onClick={() => switchSchool(s.id)}>
                          {t("caPortal.switchSchool")}
                        </button>
                      )}
                    </div>
                    <div className="ca-school-meta">
                      <span>
                        {fyInfo ? `${t("caPortal.financialYear")}: ${fyInfo.label}` : t("accounting.fyNotSet")}
                      </span>
                      {fyInfo?.submittedAt ? (
                        <span>
                          {t("caPortal.submittedOn")}: {new Date(fyInfo.submittedAt).toLocaleDateString("en-IN")}
                        </span>
                      ) : (
                        <span className="font-semibold text-amber-700">{t("caPortal.noSubmission")}</span>
                      )}
                      {(s.pendingVouchers || 0) > 0 && (
                        <span className="font-semibold text-amber-700">
                          {s.pendingVouchers} {t("caPortal.pendingVerification").toLowerCase()}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <div className="ca-fy-banner">
        <div className="ca-fy-icon">
          <Shield className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("caPortal.financialYear")}: {fy?.label || t("accounting.fyNotSet")}
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {t("caPortal.auditStatusLabel")}:{" "}
            <span className="font-bold text-amber-800">{auditStatusLabel(fy?.auditStatus || "open")}</span>
          </p>
        </div>
      </div>

      <div className="ca-stat-grid">
        <div className="ca-stat">
          <div className="ca-stat-icon is-warn">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="ca-stat-label">{t("caPortal.pendingVerification")}</div>
          <div className="ca-stat-value is-warn">{pending.toLocaleString("en-IN")}</div>
        </div>
        <div className="ca-stat">
          <div className="ca-stat-icon is-ok">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div className="ca-stat-label">{t("caPortal.verifiedVouchers")}</div>
          <div className="ca-stat-value is-ok">{verified.toLocaleString("en-IN")}</div>
        </div>
        <div className="ca-stat">
          <div className="ca-stat-icon is-danger">
            <Shield className="h-5 w-5" />
          </div>
          <div className="ca-stat-label">{t("auditStatus.flagged")}</div>
          <div className="ca-stat-value is-danger">{flagged.toLocaleString("en-IN")}</div>
        </div>
        <div className="ca-stat">
          <div className="ca-stat-icon is-accent">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="ca-stat-label">{t("accounting.totalVouchers")}</div>
          <div className="ca-stat-value is-accent">{totalVouchers.toLocaleString("en-IN")}</div>
        </div>
      </div>

      <div className="ca-action-grid">
        <Link href="/ca/verify" className="ca-action">
          <div className="ca-action-icon is-warn">
            <FileSearch className="h-5 w-5" />
          </div>
          <div>
            <h3>{t("caPortal.verifyVouchersTitle")}</h3>
            <p>{t("caPortal.verifyVouchersDesc")}</p>
            <ArrowRight className="ca-action-arrow h-4 w-4" />
          </div>
        </Link>
        <Link href="/accounting/trial-balance" className="ca-action">
          <div className="ca-action-icon is-slate">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h3>{t("caNav.trialBalance")}</h3>
            <p>{t("caPortal.trialBalanceDesc")}</p>
            <ArrowRight className="ca-action-arrow h-4 w-4" />
          </div>
        </Link>
        <Link href="/accounting/reports" className="ca-action">
          <div className="ca-action-icon is-ok">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h3>{t("caNav.financialReports")}</h3>
            <p>{t("caPortal.financialReportsDesc")}</p>
            <ArrowRight className="ca-action-arrow h-4 w-4" />
          </div>
        </Link>
        <Link href="/ca/audit" className="ca-action">
          <div className="ca-action-icon">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <h3>{t("caPortal.auditSession")}</h3>
            <p>{t("caPortal.auditSessionDesc")}</p>
            <ArrowRight className="ca-action-arrow h-4 w-4" />
          </div>
        </Link>
      </div>

      <section className="ca-panel">
        <div className="ca-panel-head">
          <div>
            <h2>
              <Clock3 className="h-5 w-5 text-amber-700" />
              {t("caPortal.recentVouchers")}
            </h2>
          </div>
          <Link href="/ca/verify" className="ca-btn is-primary">
            {t("caPortal.verify")}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="ca-panel-body">
          {recentVouchers.length === 0 ? (
            <p className="ca-empty">{t("caPortal.noVouchersThisFy")}</p>
          ) : (
            recentVouchers.map((v) => (
              <div key={v.id} className="ca-voucher-row">
                <div>
                  <p className="ca-voucher-no">
                    {v.voucherNo} · {v.voucherType}
                  </p>
                  <p className="ca-voucher-date">{new Date(v.voucherDate).toLocaleDateString("en-IN")}</p>
                </div>
                <div>
                  <p className="ca-voucher-amt">{formatIndianCurrency(v.totalAmount || 0)}</p>
                  <div className="mt-1 flex justify-end">
                    <span className={`ca-badge ${statusBadgeClass(v.auditStatus)}`}>
                      {auditStatusLabel(v.auditStatus)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
