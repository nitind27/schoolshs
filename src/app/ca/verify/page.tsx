"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Flag } from "lucide-react";
import { formatIndianCurrency } from "@/lib/accounting";
import { useT } from "@/i18n/locale-provider";
import "@/components/ca/ca-portal.css";

export default function CaVerifyPage() {
  const t = useT();
  const [vouchers, setVouchers] = useState<Record<string, unknown>[]>([]);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch("/api/accounting/vouchers?auditStatus=pending")
      .then((r) => r.json())
      .then((d) => setVouchers(d.vouchers || []))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const voucherTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      receipt: t("accounting.voucherReceipt"),
      payment: t("accounting.voucherPayment"),
      journal: t("accounting.voucherJournal"),
      contra: t("accounting.voucherContra"),
    };
    return map[type] || type;
  };

  const audit = async (voucherId: string, auditStatus: string) => {
    await fetch("/api/accounting/audit", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voucherId, auditStatus, auditRemarks: remarks[voucherId] || "" }),
    });
    load();
  };

  return (
    <div className="ca-portal space-y-6">
      <div>
        <h1 className="ca-page-title">{t("caPortal.voucherVerification")}</h1>
        <p className="ca-page-sub">{t("caPortal.voucherVerificationDesc")}</p>
      </div>

      {loading ? (
        <div className="ca-loading">
          <div className="ca-loading-spinner" />
        </div>
      ) : vouchers.length === 0 ? (
        <div className="ca-panel">
          <div className="ca-panel-body">
            <p className="ca-empty">{t("caPortal.noVouchersThisFy")}</p>
          </div>
        </div>
      ) : (
        vouchers.map((v) => (
          <article key={v.id as string} className="ca-verify-card">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">{v.voucherNo as string}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {voucherTypeLabel(v.voucherType as string)} ·{" "}
                  {new Date(v.voucherDate as string).toLocaleDateString("en-IN")} ·{" "}
                  {formatIndianCurrency(v.totalAmount as number)}
                </p>
              </div>
              <span className="ca-badge is-warn">{t("auditStatus.pending")}</span>
            </div>

            <div className="space-y-2 text-sm text-slate-700">
              <p>
                <strong>{t("accounting.party")}:</strong> {(v.partyName as string) || "—"} ·{" "}
                <strong>{t("accounting.paymentMode")}:</strong> {(v.paymentMode as string) || "—"}
              </p>
              <p>
                <strong>{t("accounting.narration")}:</strong> {(v.narration as string) || "—"}
              </p>
              {(v.billNo as string) && (
                <p>
                  <strong>{t("accounting.billNo")}:</strong> {v.billNo as string}{" "}
                  {v.billDate ? `(${new Date(v.billDate as string).toLocaleDateString("en-IN")})` : ""}
                </p>
              )}
            </div>

            <div className="ca-verify-lines mt-3">
              {((v.lines as { account: { name: string }; debit: number; credit: number }[]) || []).map((l, i) => (
                <div key={i}>
                  <span>{l.account.name}</span>
                  <span className="font-medium text-slate-800">
                    {t("accounting.debit")} {l.debit} · {t("accounting.credit")} {l.credit}
                  </span>
                </div>
              ))}
            </div>

            <textarea
              className="ca-textarea mt-3"
              rows={3}
              placeholder={t("caPortal.auditRemarks")}
              value={remarks[v.id as string] || ""}
              onChange={(e) => setRemarks({ ...remarks, [v.id as string]: e.target.value })}
            />

            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="ca-btn is-primary" onClick={() => audit(v.id as string, "verified")}>
                <CheckCircle className="h-4 w-4" />
                {t("caPortal.verify")}
              </button>
              <button type="button" className="ca-btn" onClick={() => audit(v.id as string, "query")}>
                <Flag className="h-4 w-4" />
                {t("caPortal.query")}
              </button>
              <button
                type="button"
                className="ca-btn"
                style={{ color: "#b91c1c", borderColor: "#fecaca" }}
                onClick={() => audit(v.id as string, "flagged")}
              >
                <XCircle className="h-4 w-4" />
                {t("caPortal.flag")}
              </button>
            </div>
          </article>
        ))
      )}
    </div>
  );
}
