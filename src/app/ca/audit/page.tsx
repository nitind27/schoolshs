"use client";

import { ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import "@/components/ca/ca-portal.css";

const CHECKLIST_KEYS = [
  "checklist1",
  "checklist2",
  "checklist3",
  "checklist4",
  "checklist5",
  "checklist6",
  "checklist7",
  "checklist8",
] as const;

export default function CaAuditPage() {
  const t = useT();

  return (
    <div className="ca-portal mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="ca-page-title">{t("caPortal.auditSessionTitle")}</h1>
        <p className="ca-page-sub">{t("caPortal.auditSessionSubtitle")}</p>
      </div>

      <section className="ca-panel">
        <div className="ca-panel-head">
          <div>
            <h2>
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              {t("caPortal.auditChecklist")}
            </h2>
          </div>
        </div>
        <div className="ca-panel-body space-y-4">
          <div>
            {CHECKLIST_KEYS.map((key) => (
              <div key={key} className="ca-check-item">
                <span className="ca-check-mark">✓</span>
                <span>{t(`caPortal.${key}`)}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3 border-t border-slate-200 pt-4">
            <input className="ca-input" placeholder={t("caPortal.caName")} />
            <input className="ca-input" placeholder={t("caPortal.membershipNo")} />
            <textarea className="ca-textarea" placeholder={t("caPortal.findings")} rows={4} />
            <button type="button" className="ca-btn is-primary w-full" style={{ height: "2.75rem" }}>
              {t("caPortal.completeSignOff")}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
