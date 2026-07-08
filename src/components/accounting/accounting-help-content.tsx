"use client";

import { CheckCircle2, FileText, TrendingUp, Shield, AlertCircle, Circle, BookOpen } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

export function AccountingHelpContent() {
  const t = useT();

  return (
    <div className="prose prose-slate max-w-none">

      {/* Overview */}
      <div className="rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 p-5 mb-6">
        <h3 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-600" />
          {t("accounting.helpOverview")}
        </h3>
        <p className="text-sm text-slate-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: t("accounting.helpOverviewText") }} />
      </div>

      {/* Step-by-step setup */}
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        {t("accounting.helpGettingStarted")}
      </h3>
      <div className="space-y-3 mb-6">
        <div className="flex gap-3 items-start">
          <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">1</div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{t("accounting.helpStep1")}</p>
            <p className="text-xs text-slate-600">{t("accounting.helpStep1Desc")}</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">2</div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{t("accounting.helpStep2")}</p>
            <p className="text-xs text-slate-600">{t("accounting.helpStep2Desc")}</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-bold">3</div>
          <div>
            <p className="font-semibold text-sm text-slate-800">{t("accounting.helpStep3")}</p>
            <p className="text-xs text-slate-600">{t("accounting.helpStep3Desc")}</p>
          </div>
        </div>
      </div>

      {/* Daily operations */}
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
        <FileText className="h-5 w-5 text-violet-600" />
        {t("accounting.helpDailyOps")}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3">
          <p className="font-semibold text-sm text-emerald-900 mb-1">{t("accounting.helpReceiptVoucher")}</p>
          <p className="text-xs text-emerald-800">{t("accounting.helpReceiptDesc")}</p>
          <p className="text-[11px] text-emerald-700 mt-1">{t("accounting.helpReceiptEntry")}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3">
          <p className="font-semibold text-sm text-red-900 mb-1">{t("accounting.helpPaymentVoucher")}</p>
          <p className="text-xs text-red-800">{t("accounting.helpPaymentDesc")}</p>
          <p className="text-[11px] text-red-700 mt-1">{t("accounting.helpPaymentEntry")}</p>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3">
          <p className="font-semibold text-sm text-blue-900 mb-1">{t("accounting.helpJournalVoucher")}</p>
          <p className="text-xs text-blue-800">{t("accounting.helpJournalDesc")}</p>
          <p className="text-[11px] text-blue-700 mt-1">{t("accounting.helpJournalEntry")}</p>
        </div>
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3">
          <p className="font-semibold text-sm text-amber-900 mb-1">{t("accounting.helpContraVoucher")}</p>
          <p className="text-xs text-amber-800">{t("accounting.helpContraDesc")}</p>
          <p className="text-[11px] text-amber-700 mt-1">{t("accounting.helpContraEntry")}</p>
        </div>
      </div>

      {/* How to create voucher */}
      <h3 className="text-base font-bold text-slate-900 mb-3">{t("accounting.helpCreateVoucher")}</h3>
      <ol className="space-y-2 text-sm text-slate-700 mb-6 list-decimal list-inside">
        <li>{t("accounting.helpCreateStep1")}</li>
        <li>{t("accounting.helpCreateStep2")}</li>
        <li>{t("accounting.helpCreateStep3")}</li>
        <li>
          {t("accounting.helpCreateStep4")}
          <ul className="ml-6 mt-1 space-y-0.5 text-xs list-disc list-inside">
            <li>{t("accounting.helpCreateStep4a")}</li>
            <li>{t("accounting.helpCreateStep4b")}</li>
            <li>{t("accounting.helpCreateStep4c")}</li>
          </ul>
        </li>
        <li dangerouslySetInnerHTML={{ __html: t("accounting.helpCreateStep5") }} />
        <li dangerouslySetInnerHTML={{ __html: t("accounting.helpCreateStep6") }} />
      </ol>

      {/* Reports */}
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-indigo-600" />
        {t("accounting.helpReports")}
      </h3>
      <div className="space-y-2 mb-6">
        <div className="flex items-start gap-2.5 text-sm">
          <Circle className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-slate-700">{t("accounting.helpReportVoucher")}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Circle className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-slate-700">{t("accounting.helpReportTrial")}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Circle className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-slate-700">{t("accounting.helpReportLedger")}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Circle className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-slate-700">{t("accounting.helpReportIncome")}</span>
        </div>
        <div className="flex items-start gap-2.5 text-sm">
          <Circle className="h-3 w-3 text-slate-400 mt-0.5 shrink-0" />
          <span className="text-slate-700">{t("accounting.helpReportBalance")}</span>
        </div>
      </div>

      {/* CA Audit */}
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
        <Shield className="h-5 w-5 text-violet-600" />
        {t("accounting.helpCaAudit")}
      </h3>
      <div className="rounded-lg border border-violet-200 bg-violet-50 p-4 mb-6">
        <p className="text-sm text-slate-700 leading-relaxed mb-2" dangerouslySetInnerHTML={{ __html: t("accounting.helpCaAuditText") }} />
        <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside ml-2">
          <li dangerouslySetInnerHTML={{ __html: t("accounting.helpCaStep1") }} />
          <li>{t("accounting.helpCaStep2")}</li>
          <li dangerouslySetInnerHTML={{ __html: t("accounting.helpCaStep3") }} />
          <li>{t("accounting.helpCaStep4")}</li>
          <li>{t("accounting.helpCaStep5")}</li>
        </ol>
      </div>

      {/* Common mistakes */}
      <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
        <AlertCircle className="h-5 w-5 text-red-600" />
        {t("accounting.helpMistakes")}
      </h3>
      <div className="space-y-2 text-sm text-slate-700 mb-6">
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold shrink-0">✗</span>
          <p dangerouslySetInnerHTML={{ __html: t("accounting.helpMistake1") }} />
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold shrink-0">✗</span>
          <p dangerouslySetInnerHTML={{ __html: t("accounting.helpMistake2") }} />
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold shrink-0">✗</span>
          <p dangerouslySetInnerHTML={{ __html: t("accounting.helpMistake3") }} />
        </div>
        <div className="flex items-start gap-2">
          <span className="text-red-500 font-bold shrink-0">✗</span>
          <p dangerouslySetInnerHTML={{ __html: t("accounting.helpMistake4") }} />
        </div>
      </div>

      {/* Quick reference */}
      <h3 className="text-base font-bold text-slate-900 mb-3">{t("accounting.helpQuickRef")}</h3>
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <p className="font-bold text-emerald-900 mb-2">{t("accounting.helpDebitInc")}</p>
          <ul className="space-y-0.5 text-emerald-800">
            <li>{t("accounting.helpDebitItem1")}</li>
            <li>{t("accounting.helpDebitItem2")}</li>
            <li>{t("accounting.helpDebitItem3")}</li>
          </ul>
        </div>
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="font-bold text-blue-900 mb-2">{t("accounting.helpCreditInc")}</p>
          <ul className="space-y-0.5 text-blue-800">
            <li>{t("accounting.helpCreditItem1")}</li>
            <li>{t("accounting.helpCreditItem2")}</li>
            <li>{t("accounting.helpCreditItem3")}</li>
          </ul>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-slate-200">
        <p className="text-xs text-slate-500 text-center">{t("accounting.helpFooter")}</p>
      </div>

    </div>
  );
}
