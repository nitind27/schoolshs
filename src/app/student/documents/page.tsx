"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { useT } from "@/i18n/locale-provider";

const DOC_KEYS: Record<string, string> = {
  photoPath: "documents.photo",
  aadhaarDocPath: "documents.aadhaar",
  incomeCertPath: "documents.income",
  casteCertPath: "documents.caste",
  marksheet10Path: "documents.marksheet10",
  marksheet12Path: "documents.marksheet12",
  bankPassbookPath: "documents.bankPassbook",
  feeReceiptPath: "documents.feeReceipt",
};

export default function StudentDocumentsPage() {
  const t = useT();
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    fetch("/api/student-portal").then((r) => r.json()).then((d) => setStudent(d.student));
  }, []);

  if (!student) return null;

  const docs = Object.entries(DOC_KEYS).filter(([key]) => student[key]);

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold">{t("studentPortal.myDocuments")}</h1>
      <div className="grid gap-3">
        {docs.length ? docs.map(([key, labelKey]) => (
          <Card key={key}>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-sky-600" />
                <span className="font-medium">{t(labelKey)}</span>
              </div>
              <a href={student[key] as string} target="_blank" className="text-sm text-blue-600 hover:underline">{t("common.view")}</a>
            </CardContent>
          </Card>
        )) : (
          <Card><CardContent className="p-8 text-center text-slate-500">{t("studentPortal.noDocuments")}</CardContent></Card>
        )}
      </div>
    </div>
  );
}
