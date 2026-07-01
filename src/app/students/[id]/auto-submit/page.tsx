"use client";

import { useEffect, useState, use, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  DocumentUploader,
  getDefaultDocuments,
  type DocType,
  type DocumentInfo,
} from "@/components/documents/document-uploader";
import { useT } from "@/i18n/locale-provider";
import {
  ArrowLeft,
  Play,
  Save,
  Monitor,
  AlertTriangle,
  CheckCircle,
  LogIn,
  FileUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import type { Student } from "@/generated/prisma/client";
import { getDgPortalConfig, getSchemeGroup } from "@/lib/dg-portal";

const PATH_KEYS: Record<DocType, keyof Pick<Student,
  "photoPath" | "aadhaarDocPath" | "incomeCertPath" | "casteCertPath" |
  "marksheet10Path" | "marksheet12Path" | "bankPassbookPath" | "feeReceiptPath"
>> = {
  photo: "photoPath",
  aadhaar: "aadhaarDocPath",
  income: "incomeCertPath",
  caste: "casteCertPath",
  marksheet10: "marksheet10Path",
  marksheet12: "marksheet12Path",
  bankPassbook: "bankPassbookPath",
  feeReceipt: "feeReceiptPath",
};

export default function AutoSubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useT();
  const { id } = use(params);
  const defaultDocs = useMemo(() => getDefaultDocuments(t), [t]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>(() =>
    defaultDocs.map((d) => ({ ...d }))
  );

  const [form, setForm] = useState({
    dgLoginId: "",
    dgPassword: "",
    dgLoginMethod: "mobile",
    photoPath: "",
    aadhaarDocPath: "",
    incomeCertPath: "",
    casteCertPath: "",
    marksheet10Path: "",
    marksheet12Path: "",
    bankPassbookPath: "",
    feeReceiptPath: "",
  });

  const loadDocuments = useCallback(async () => {
    const res = await fetch(`/api/students/${id}/documents`);
    if (!res.ok) return;
    const data = await res.json();

    setDocuments(
      defaultDocs.map((def) => {
        const saved = data.documents?.find((d: { type: DocType }) => d.type === def.type);
        return {
          ...def,
          previewUrl: saved?.previewUrl ?? null,
          fileName: saved?.fileName ?? null,
          mimeType: saved?.mimeType ?? null,
          size: saved?.size ?? null,
          filePath: saved?.filePath ?? null,
          dgReady: saved?.dgReady ?? false,
        };
      })
    );
  }, [id, defaultDocs]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then((r) => r.json()),
      loadDocuments(),
    ]).then(([data]) => {
      if (data?.id) {
        setStudent(data);
        setForm({
          dgLoginId: data.dgLoginId || data.mobileNumber || "",
          dgPassword: data.dgPassword || "",
          dgLoginMethod: data.dgLoginMethod || "mobile",
          photoPath: data.photoPath || "",
          aadhaarDocPath: data.aadhaarDocPath || "",
          incomeCertPath: data.incomeCertPath || "",
          casteCertPath: data.casteCertPath || "",
          marksheet10Path: data.marksheet10Path || "",
          marksheet12Path: data.marksheet12Path || "",
          bankPassbookPath: data.bankPassbookPath || "",
          feeReceiptPath: data.feeReceiptPath || "",
        });
      }
    }).finally(() => setLoading(false));
  }, [id, loadDocuments]);

  const handleDocUpdate = (type: DocType, data: Partial<DocumentInfo>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.type === type ? { ...d, ...data } : d))
    );
    if (data.filePath) {
      const pathKey = PATH_KEYS[type];
      setForm((prev) => ({ ...prev, [pathKey]: data.filePath! }));
    }
  };

  const handleDocRemove = (type: DocType) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.type === type
          ? { ...d, previewUrl: null, fileName: null, mimeType: null, size: null }
          : d
      )
    );
    const pathKey = PATH_KEYS[type];
    setForm((prev) => ({ ...prev, [pathKey]: "" }));
  };

  const saveCredentials = async () => {
    setSaving(true);
    await fetch(`/api/students/${id}/credentials`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    alert(t("autoSubmit.saved"));
  };

  const startAutomation = async (mode: string) => {
    await saveCredentials();
    setStarting(true);

    const res = await fetch("/api/automation/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentId: id, mode }),
    });

    const data = await res.json();
    setStarting(false);

    if (res.ok) {
      setStarted(true);
    } else {
      alert(data.error || t("autoSubmit.startFailed"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!student) return <p className="text-center py-16 text-slate-500">{t("students.notFound")}</p>;

  const portal = getDgPortalConfig(student.scholarshipScheme);
  const schemeGroup = getSchemeGroup(student.scholarshipScheme);
  const isSjed = portal.type === "sjed";

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link href={`/students/${id}`}>
          <button className="p-2 rounded-lg hover:bg-slate-100">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t("autoSubmit.pageTitle", { name: `${student.firstName} ${student.surname}` })}
          </h1>
          <p className="text-slate-500 mt-1">{t("autoSubmit.subtitle")}</p>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4 space-y-3">
          <p className="font-semibold text-blue-900">{t("autoSubmit.otpTitle")}</p>
          <div className="text-sm text-blue-800 space-y-2">
            <p><strong>{t("autoSubmit.otpQ1")}</strong> {t("autoSubmit.otpA1")}</p>
            <p><strong>{t("autoSubmit.otpQ2")}</strong> {t("autoSubmit.otpA2")}</p>
            <p><strong>{t("autoSubmit.otpQ3")}</strong> {t("autoSubmit.otpA3")}</p>
            <p className="text-blue-700 font-medium pt-1">{t("autoSubmit.otpTip")}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">{t("autoSubmit.howItWorks")}</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>{t("autoSubmit.step1", { portal: portal.labelHi })}</li>
              <li>{t("autoSubmit.step2")}</li>
              <li><strong>{t("autoSubmit.step3")}</strong></li>
              <li>{t("autoSubmit.step4")}</li>
              <li><strong>{t("autoSubmit.step5")}</strong></li>
            </ol>
          </div>
        </CardContent>
      </Card>

      {started && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-4 flex gap-3">
            <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0" />
            <div className="text-sm text-emerald-800">
              <p className="font-medium">{t("autoSubmit.browserOpened")}</p>
              <p>{t("autoSubmit.browserOpenedDesc")}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className={isSjed ? "border-purple-200 bg-purple-50" : "border-blue-200 bg-blue-50"}>
        <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1">
              {t("autoSubmit.schemePortal", { scheme: schemeGroup })}
            </p>
            <p className="font-bold text-slate-900 text-lg">{portal.labelHi}</p>
            <p className="text-sm text-slate-600 mt-0.5">{student.scholarshipScheme}</p>
            <p className="text-xs text-slate-500 mt-1">{portal.description}</p>
          </div>
          <div className="text-right shrink-0">
            <a
              href={portal.loginUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:underline"
            >
              {portal.loginUrl.split("/").pop()}
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LogIn className="h-5 w-5" /> {t("autoSubmit.dgLogin")}
          </CardTitle>
          <CardDescription>
            {isSjed ? t("autoSubmit.sjedLoginDesc") : t("autoSubmit.citizenLoginDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSjed && (
            <Select
              label={t("autoSubmit.loginMethod")}
              options={[
                { value: "mobile", label: t("autoSubmit.mobileNumber") },
                { value: "email", label: t("autoSubmit.emailId") },
              ]}
              value={form.dgLoginMethod}
              onChange={(e) => setForm({ ...form, dgLoginMethod: e.target.value })}
            />
          )}
          <Input
            label={isSjed ? t("autoSubmit.sjedUserId") : t("autoSubmit.loginId")}
            value={form.dgLoginId}
            onChange={(e) => setForm({ ...form, dgLoginId: e.target.value })}
            placeholder={isSjed ? t("autoSubmit.sjedUsernamePlaceholder") : "9876543210"}
          />
          <Input
            label={t("autoSubmit.password")}
            type="password"
            value={form.dgPassword}
            onChange={(e) => setForm({ ...form, dgPassword: e.target.value })}
            placeholder={t("autoSubmit.dgPasswordPlaceholder")}
          />
          <p className="text-xs text-slate-500">
            {t("autoSubmit.passwordLocalNote")}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" /> {t("autoSubmit.documentsTitle")}
          </CardTitle>
          <CardDescription>
            {t("autoSubmit.documentsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DocumentUploader
            studentId={id}
            documents={documents}
            onUpdate={handleDocUpdate}
            onRemove={handleDocRemove}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" /> {t("autoSubmit.startAutomation")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Button
              size="lg"
              onClick={() => startAutomation("full")}
              disabled={starting || !form.dgLoginId}
            >
              <Play className="h-4 w-4" />
              {starting ? t("autoSubmit.starting") : t("autoSubmit.loginAutoFill")}
            </Button>

            <Button
              variant="secondary"
              size="lg"
              onClick={() => startAutomation("fill-only")}
              disabled={starting}
            >
              <Play className="h-4 w-4" />
              {t("autoSubmit.fillOnly")}
            </Button>

            <Button variant="outline" onClick={saveCredentials} disabled={saving}>
              <Save className="h-4 w-4" />
              {saving ? t("common.saving") : t("autoSubmit.saveCredentials")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {student.lastAutomationLog && (
        <Card>
          <CardHeader>
            <CardTitle>{t("autoSubmit.lastLog")}</CardTitle>
            {student.lastAutomationAt && (
              <CardDescription>
                {new Date(student.lastAutomationAt).toLocaleString("en-IN")}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-slate-900 text-green-400 p-4 rounded-lg overflow-x-auto max-h-60 whitespace-pre-wrap">
              {student.lastAutomationLog}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
