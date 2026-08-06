"use client";

import { Spinner, PageLoader } from "@/components/ui/loader";
import { useEffect, useState, use, useCallback, useMemo } from "react";
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
  Info,
} from "lucide-react";
import Link from "next/link";
import type { Student } from "@/generated/prisma/client";
import { getDgPortalConfig, getSchemeGroup } from "@/lib/dg-portal";
import "./auto-submit.css";

const PATH_KEYS: Record<
  DocType,
  keyof Pick<
    Student,
    | "photoPath"
    | "aadhaarDocPath"
    | "incomeCertPath"
    | "casteCertPath"
    | "marksheet10Path"
    | "marksheet12Path"
    | "bankPassbookPath"
    | "feeReceiptPath"
  >
> = {
  photo: "photoPath",
  aadhaar: "aadhaarDocPath",
  income: "incomeCertPath",
  caste: "casteCertPath",
  marksheet10: "marksheet10Path",
  marksheet12: "marksheet12Path",
  bankPassbook: "bankPassbookPath",
  feeReceipt: "feeReceiptPath",
};

export default function AutoSubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const t = useT();
  const { id } = use(params);
  const defaultDocs = useMemo(() => getDefaultDocuments(t), [t]);
  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [started, setStarted] = useState(false);
  const [documents, setDocuments] = useState<DocumentInfo[]>(() =>
    defaultDocs.map((d) => ({ ...d })),
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
        const saved = data.documents?.find(
          (d: { type: DocType }) => d.type === def.type,
        );
        return {
          ...def,
          previewUrl: saved?.previewUrl ?? null,
          fileName: saved?.fileName ?? null,
          mimeType: saved?.mimeType ?? null,
          size: saved?.size ?? null,
          filePath: saved?.filePath ?? null,
          dgReady: saved?.dgReady ?? false,
        };
      }),
    );
  }, [id, defaultDocs]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/students/${id}`).then((r) => r.json()),
      loadDocuments(),
    ])
      .then(([data]) => {
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
      })
      .finally(() => setLoading(false));
  }, [id, loadDocuments]);

  const handleDocUpdate = (type: DocType, data: Partial<DocumentInfo>) => {
    setDocuments((prev) =>
      prev.map((d) => (d.type === type ? { ...d, ...data } : d)),
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
          ? {
              ...d,
              previewUrl: null,
              fileName: null,
              mimeType: null,
              size: null,
            }
          : d,
      ),
    );
    const pathKey = PATH_KEYS[type];
    setForm((prev) => ({ ...prev, [pathKey]: "" }));
  };

  const saveCredentials = async (opts?: { silent?: boolean }) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/students/${id}/credentials`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || t("autoSubmit.saveFailed"));
        return false;
      }
      if (!opts?.silent) alert(t("autoSubmit.saved"));
      return true;
    } finally {
      setSaving(false);
    }
  };

  const startAutomation = async (mode: string) => {
    if (!form.dgLoginId.trim() && mode === "full") {
      alert(t("autoSubmit.loginRequired"));
      return;
    }
    const saved = await saveCredentials({ silent: true });
    if (!saved) return;
    setStarting(true);

    try {
      const preflightRes = await fetch("/api/automation/preflight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: [id] }),
      });
      const preflight = await preflightRes.json().catch(() => ({}));
      const row = Array.isArray(preflight.students) ? preflight.students[0] : null;
      if (!preflightRes.ok) {
        alert(preflight.error || t("autoSubmit.startFailed"));
        return;
      }
      if (!row?.ready) {
        const blockers = [
          ...(row?.missingFields || []).map(
            (f: { message: string }) => f.message,
          ),
          ...(row?.missingDocuments || []).map(
            (doc: string) => `Missing document: ${doc}`,
          ),
          ...(row?.invalidDocuments || []).map(
            (doc: string) => `Document too large / not DG-ready: ${doc}`,
          ),
        ].filter(Boolean);
        alert(
          blockers.length
            ? `${t("autoSubmit.preflightBlocked")}\n\n${blockers.join("\n")}`
            : t("autoSubmit.preflightBlocked"),
        );
        return;
      }

      const res = await fetch("/api/automation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id, mode }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setStarted(true);
      } else {
        alert(data.error || t("autoSubmit.startFailed"));
      }
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return <PageLoader />;
  }

  if (!student) {
    return (
      <p className="py-16 text-center text-slate-500">{t("students.notFound")}</p>
    );
  }

  const portal = getDgPortalConfig(student.scholarshipScheme);
  const schemeGroup = getSchemeGroup(student.scholarshipScheme);
  const isSjed = portal.type === "sjed";

  return (
    <div className="asub">
      <div className="asub__hero">
        <Link href={`/students/${id}`} className="asub__back" aria-label="Back">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="asub__hero-copy">
          <h1 className="asub__title">
            {t("autoSubmit.pageTitle", {
              name: `${student.firstName} ${student.surname}`,
            })}
          </h1>
          <p className="asub__sub">{t("autoSubmit.subtitle")}</p>
        </div>
      </div>

      <div className="asub__info asub__info--tip">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
        <div className="space-y-1.5 text-sm">
          <p className="font-semibold">{t("autoSubmit.otpTitle")}</p>
          <p>
            <strong>{t("autoSubmit.otpQ1")}</strong> {t("autoSubmit.otpA1")}
          </p>
          <p>
            <strong>{t("autoSubmit.otpQ2")}</strong> {t("autoSubmit.otpA2")}
          </p>
          <p>
            <strong>{t("autoSubmit.otpQ3")}</strong> {t("autoSubmit.otpA3")}
          </p>
          <p className="pt-0.5 font-medium text-sky-800">{t("autoSubmit.otpTip")}</p>
        </div>
      </div>

      <div className="asub__info asub__info--warn">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <p className="mb-1 font-semibold">{t("autoSubmit.howItWorks")}</p>
          <ol>
            <li>{t("autoSubmit.step1", { portal: portal.labelHi })}</li>
            <li>{t("autoSubmit.step2")}</li>
            <li>
              <strong>{t("autoSubmit.step3")}</strong>
            </li>
            <li>{t("autoSubmit.step4")}</li>
            <li>
              <strong>{t("autoSubmit.step5")}</strong>
            </li>
          </ol>
        </div>
      </div>

      {started && (
        <div className="asub__info asub__info--ok">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div className="text-sm">
            <p className="font-semibold">{t("autoSubmit.browserOpened")}</p>
            <p>{t("autoSubmit.browserOpenedDesc")}</p>
          </div>
        </div>
      )}

      <div className="asub__info asub__info--portal">
        <div className="min-w-0">
          <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-teal-700/80">
            {t("autoSubmit.schemePortal", { scheme: schemeGroup })}
          </p>
          <p className="text-lg font-bold text-slate-900">{portal.labelHi}</p>
          <p className="mt-0.5 text-sm text-slate-600">{student.scholarshipScheme}</p>
          <p className="mt-1 text-xs text-slate-500">{portal.description}</p>
        </div>
        <a
          href={portal.loginUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline"
        >
          {portal.loginUrl.split("/").pop()}
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      <section className="asub__panel">
        <header className="asub__panel-head">
          <div>
            <h2 className="asub__panel-title">
              <span className="asub__panel-ico">
                <LogIn className="h-4 w-4" />
              </span>
              {t("autoSubmit.dgLogin")}
            </h2>
            <p className="asub__panel-desc">
              {isSjed
                ? t("autoSubmit.sjedLoginDesc")
                : t("autoSubmit.citizenLoginDesc")}
            </p>
          </div>
        </header>
        <div className="asub__panel-body space-y-4">
          {!isSjed && (
            <Select
              label={t("autoSubmit.loginMethod")}
              options={[
                { value: "mobile", label: t("autoSubmit.mobileNumber") },
                { value: "email", label: t("autoSubmit.emailId") },
              ]}
              value={form.dgLoginMethod}
              onChange={(e) =>
                setForm({ ...form, dgLoginMethod: e.target.value })
              }
            />
          )}
          <Input
            label={
              isSjed ? t("autoSubmit.sjedUserId") : t("autoSubmit.loginId")
            }
            value={form.dgLoginId}
            onChange={(e) => setForm({ ...form, dgLoginId: e.target.value })}
            placeholder={
              isSjed
                ? t("autoSubmit.sjedUsernamePlaceholder")
                : "9876543210"
            }
          />
          <Input
            label={t("autoSubmit.password")}
            type="password"
            value={form.dgPassword}
            onChange={(e) => setForm({ ...form, dgPassword: e.target.value })}
            placeholder={t("autoSubmit.dgPasswordPlaceholder")}
          />
          <p className="text-xs text-slate-500">{t("autoSubmit.passwordLocalNote")}</p>
        </div>
      </section>

      <section className="asub__panel">
        <header className="asub__panel-head">
          <div>
            <h2 className="asub__panel-title">
              <span className="asub__panel-ico">
                <FileUp className="h-4 w-4" />
              </span>
              {t("autoSubmit.documentsTitle")}
            </h2>
            <p className="asub__panel-desc">{t("autoSubmit.documentsDesc")}</p>
          </div>
        </header>
        <div className="asub__panel-body">
          <DocumentUploader
            studentId={id}
            documents={documents}
            onUpdate={handleDocUpdate}
            onRemove={handleDocRemove}
          />
        </div>
      </section>

      <section className="asub__panel">
        <header className="asub__panel-head">
          <div>
            <h2 className="asub__panel-title">
              <span className="asub__panel-ico">
                <Monitor className="h-4 w-4" />
              </span>
              {t("autoSubmit.startAutomation")}
            </h2>
          </div>
        </header>
        <div className="asub__panel-body">
          <div className="asub__actions">
            <button
              type="button"
              className="asub__btn asub__btn--primary"
              onClick={() => startAutomation("full")}
              disabled={starting || !form.dgLoginId}
            >
              {starting ? (
                <Spinner size="sm" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              {starting
                ? t("autoSubmit.starting")
                : t("autoSubmit.loginAutoFill")}
            </button>

            <button
              type="button"
              className="asub__btn asub__btn--secondary"
              onClick={() => startAutomation("fill-only")}
              disabled={starting}
            >
              <Play className="h-4 w-4" />
              {t("autoSubmit.fillOnly")}
            </button>

            <button
              type="button"
              className="asub__btn asub__btn--ghost"
              onClick={() => saveCredentials()}
              disabled={saving}
            >
              {saving ? <Spinner size="sm" /> : <Save className="h-4 w-4" />}
              {saving ? t("common.saving") : t("autoSubmit.saveCredentials")}
            </button>
          </div>
        </div>
      </section>

      {student.lastAutomationLog && (
        <section className="asub__panel">
          <header className="asub__panel-head">
            <div>
              <h2 className="asub__panel-title">{t("autoSubmit.lastLog")}</h2>
              {student.lastAutomationAt ? (
                <p className="asub__panel-desc">
                  {new Date(student.lastAutomationAt).toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
          </header>
          <div className="asub__panel-body">
            <pre className="asub__log">{student.lastAutomationLog}</pre>
          </div>
        </section>
      )}
    </div>
  );
}
