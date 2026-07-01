"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { STUDENT_STATUSES } from "@/lib/constants";
import { Download, FileSpreadsheet } from "lucide-react";
import { useState } from "react";
import { useT } from "@/i18n/locale-provider";

export default function ExportPage() {
  const t = useT();
  const [status, setStatus] = useState("");

  const handleExport = (format: "csv") => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    window.open(`/api/students/export?${params}`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("exportPage.title")}</h1>
        <p className="text-slate-500 mt-1">{t("exportPage.subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("exportPage.exportOptions")}</CardTitle>
          <CardDescription>{t("exportPage.exportOptionsDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Select
            label={t("exportPage.filterStatus")}
            options={STUDENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          />

          <div className="flex gap-3">
            <Button onClick={() => handleExport("csv")} size="lg">
              <Download className="h-4 w-4" />
              {t("exportPage.exportAsCsv")}
            </Button>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">{t("exportPage.exportFieldsTitle")}</p>
            <p>{t("exportPage.exportFieldsDesc")}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            {t("exportPage.exportTips")}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600 space-y-2">
          <p>{t("exportPage.tip1")}</p>
          <p>{t("exportPage.tip2")}</p>
          <p>{t("exportPage.tip3")}</p>
          <p>{t("exportPage.tip4")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
