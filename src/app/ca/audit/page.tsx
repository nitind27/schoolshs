"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

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
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">{t("caPortal.auditSessionTitle")}</h1>
        <p className="text-slate-500">{t("caPortal.auditSessionSubtitle")}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-6 w-6 text-violet-600" /> {t("caPortal.auditChecklist")}</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 text-sm">
            {CHECKLIST_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">✓ {t(`caPortal.${key}`)}</div>
            ))}
          </div>
          <div className="pt-4 border-t space-y-3">
            <input className="w-full border rounded-lg p-3 text-sm" placeholder={t("caPortal.caName")} />
            <input className="w-full border rounded-lg p-3 text-sm" placeholder={t("caPortal.membershipNo")} />
            <textarea className="w-full border rounded-lg p-3 text-sm" placeholder={t("caPortal.findings")} rows={4} />
            <Button className="w-full bg-violet-700">{t("caPortal.completeSignOff")}</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
