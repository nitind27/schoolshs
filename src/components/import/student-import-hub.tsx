"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { CSV_HEADERS, CSV_HEADER_LABELS } from "@/lib/constants";
import {
  applyColumnMap,
  autoMapColumns,
  downloadFailedRows,
  downloadImportTemplate,
  getMappedFieldCount,
  parseStudentImportFile,
  REQUIRED_IMPORT_FIELDS,
  runBulkImport,
  validateImportRows,
  type ImportFieldKey,
  type ImportResult,
  type ParsedImportFile,
  type RowValidation,
} from "@/lib/import/student-import";
import {
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  Columns3,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  FileWarning,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";

type Step = "upload" | "map" | "validate" | "importing" | "done";

const FIELD_GROUPS: { title: string; fields: ImportFieldKey[] }[] = [
  {
    title: "Personal",
    fields: ["firstName", "middleName", "surname", "aadhaarName", "dateOfBirth", "gender", "aadhaarNumber", "mobileNumber", "email", "bloodGroup"],
  },
  {
    title: "Family",
    fields: ["motherName", "fatherName", "guardianName", "category", "caste", "religion", "parentOccupation", "annualFamilyIncome", "isOrphan", "familySize"],
  },
  {
    title: "Address",
    fields: ["currentAddress", "currentDistrict", "currentCity", "currentPincode", "permanentAddress", "permanentDistrict", "permanentCity", "permanentPincode", "residentType", "habitationType"],
  },
  {
    title: "Academic",
    fields: ["standard", "section", "rollNumber", "grNumber", "scholarshipScheme", "financialYear", "courseType", "courseName", "institutionName", "currentYear", "board10th", "percentage10th", "year10th"],
  },
  {
    title: "Bank",
    fields: ["bankName", "branchName", "accountNumber", "ifscCode", "accountHolderName"],
  },
];

export function StudentImportHub() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedImportFile | null>(null);
  const [columnMap, setColumnMap] = useState<Record<string, ImportFieldKey | "">>({});
  const [mappedRows, setMappedRows] = useState<Record<string, unknown>[]>([]);
  const [validations, setValidations] = useState<RowValidation[]>([]);
  const [skipInvalid, setSkipInvalid] = useState(true);
  const [importProgress, setImportProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [previewFilter, setPreviewFilter] = useState<"all" | "valid" | "warning" | "error">("all");

  const stats = useMemo(() => {
    const valid = validations.filter((v) => v.status === "valid").length;
    const warning = validations.filter((v) => v.status === "warning").length;
    const err = validations.filter((v) => v.status === "error").length;
    return { valid, warning, error: err, total: validations.length };
  }, [validations]);

  const mappedCount = useMemo(() => getMappedFieldCount(columnMap), [columnMap]);
  const missingRequired = useMemo(
    () => REQUIRED_IMPORT_FIELDS.filter((f) => !Object.values(columnMap).includes(f)),
    [columnMap]
  );

  const filteredPreview = useMemo(() => {
    if (previewFilter === "all") return validations.slice(0, 20);
    return validations.filter((v) => v.status === previewFilter).slice(0, 20);
  }, [validations, previewFilter]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setParsed(null);
    setColumnMap({});
    setMappedRows([]);
    setValidations([]);
    setResult(null);
    setError(null);
    setImportProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFile = async (f: File) => {
    setError(null);
    setResult(null);
    setFile(f);
    try {
      const data = await parseStudentImportFile(f);
      if (!data.rawRows.length) {
        setError(t("importPage.noRowsFound"));
        return;
      }
      setParsed(data);
      setColumnMap(data.columnMap);
      setStep("map");
    } catch {
      setError(t("importPage.parseError"));
    }
  };

  const reloadSheet = async (sheetName: string) => {
    if (!file) return;
    const data = await parseStudentImportFile(file, sheetName);
    setParsed(data);
    setColumnMap(data.columnMap);
  };

  const applyMapping = useCallback(() => {
    if (!parsed) return;
    const rows = applyColumnMap(parsed.rawRows, columnMap);
    setMappedRows(rows);
    setValidations(validateImportRows(rows));
    setStep("validate");
  }, [parsed, columnMap]);

  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);
    setError(null);

    const validIndexes = new Set(
      validations.map((v, i) => i).filter((i) => validations[i].status !== "error")
    );

    const rowsToImport = skipInvalid
      ? mappedRows.filter((_, i) => validIndexes.has(i))
      : mappedRows;

    if (!rowsToImport.length) {
      setError(t("importPage.nothingToImport"));
      setStep("validate");
      return;
    }

    try {
      const res = await runBulkImport(
        rowsToImport,
        { skipInvalid, validRowIndexes: skipInvalid ? validIndexes : undefined },
        (done, total) => setImportProgress(Math.round((done / total) * 100))
      );
      setResult(res);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("importPage.importFailed"));
      setStep("validate");
    }
  };

  const updateColumnMap = (fileHeader: string, field: string) => {
    setColumnMap((prev) => ({ ...prev, [fileHeader]: field as ImportFieldKey | "" }));
  };

  const fieldOptions = CSV_HEADERS.map((k) => ({
    value: k,
    label: CSV_HEADER_LABELS[k] || k,
  }));

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("importPage.title")}</h1>
          <p className="text-slate-500 mt-1">{t("importPage.subtitleLong")}</p>
        </div>
        {step !== "upload" && step !== "importing" && (
          <Button variant="outline" size="sm" onClick={reset}>
            <RefreshCw className="h-4 w-4" /> {t("importPage.startOver")}
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex flex-wrap gap-2">
        {(["upload", "map", "validate", "done"] as const).map((s, i) => {
          const labels = [t("importPage.stepUpload"), t("importPage.stepMap"), t("importPage.stepValidate"), t("importPage.stepDone")];
          const active = step === s || (step === "importing" && s === "validate") || (step === "done" && s === "done");
          const done =
            (s === "upload" && step !== "upload") ||
            (s === "map" && ["validate", "importing", "done"].includes(step)) ||
            (s === "validate" && step === "done");
          return (
            <div
              key={s}
              className={cn(
                "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border",
                active ? "bg-blue-50 border-blue-200 text-blue-800" : done ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-slate-50 border-slate-200 text-slate-500"
              )}
            >
              <span className="w-5 h-5 rounded-full bg-white flex items-center justify-center text-[10px] font-bold border">
                {done ? "✓" : i + 1}
              </span>
              {labels[i]}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Template & guide */}
      {(step === "upload" || step === "map") && (
        <>
          <Card>
            <CardContent className="p-4">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-sm text-slate-600 space-y-1">
                  <p>{t("importPage.step1")}</p>
                  <p>{t("importPage.step2")}</p>
                  <p>{t("importPage.step3")}</p>
                  <p><strong>{t("importPage.stepNote")}</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("importPage.downloadTemplate")}</CardTitle>
              <CardDescription>{t("importPage.downloadTemplateDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={() => downloadImportTemplate("csv")}>
                <Download className="h-4 w-4" /> {t("importPage.csvTemplate")}
              </Button>
              <Button variant="outline" onClick={() => downloadImportTemplate("xlsx")}>
                <FileSpreadsheet className="h-4 w-4" /> {t("importPage.excelTemplate")}
              </Button>
              <Button variant="ghost" onClick={() => setShowGuide((v) => !v)}>
                {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                {t("importPage.columnGuide")}
              </Button>
            </CardContent>
            {showGuide && (
              <CardContent className="pt-0">
                <div className="grid sm:grid-cols-2 gap-4 max-h-72 overflow-y-auto border rounded-lg p-3 bg-slate-50">
                  {FIELD_GROUPS.map((g) => (
                    <div key={g.title}>
                      <p className="text-xs font-semibold text-slate-700 mb-1">{g.title}</p>
                      <ul className="text-xs text-slate-600 space-y-0.5">
                        {g.fields.map((f) => (
                          <li key={f}>
                            <span className="font-medium">{CSV_HEADER_LABELS[f]}</span>
                            {REQUIRED_IMPORT_FIELDS.includes(f) && (
                              <span className="text-red-500 ml-1">*</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {/* Upload */}
      {(step === "upload" || (step === "map" && file)) && (
        <Card>
          <CardHeader>
            <CardTitle>{t("importPage.uploadFile")}</CardTitle>
            <CardDescription>{t("importPage.supportedFormats")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handleFile(f);
              }}
              className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
            >
              <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-700 font-medium">
                {file ? file.name : t("importPage.dragDropFile")}
              </p>
              <p className="text-sm text-slate-500 mt-1">{t("importPage.formatHint")}</p>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls,.tsv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            {parsed && parsed.sheetNames.length > 1 && step === "map" && (
              <div className="mt-4 max-w-xs">
                <Select
                  label={t("importPage.selectSheet")}
                  value={parsed.selectedSheet}
                  onChange={(e) => reloadSheet(e.target.value)}
                  options={parsed.sheetNames.map((n) => ({ value: n, label: n }))}
                  emptyLabel={t("importPage.selectSheet")}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Column mapping */}
      {step === "map" && parsed && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Columns3 className="h-5 w-5 text-blue-600" />
              {t("importPage.columnMapping")}
            </CardTitle>
            <CardDescription>
              {t("importPage.columnMappingDesc", { mapped: mappedCount, total: CSV_HEADERS.length, rows: parsed.rawRows.length })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingRequired.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <FileWarning className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">{t("importPage.missingRequired")}</p>
                  <p className="text-xs mt-1">{missingRequired.map((f) => CSV_HEADER_LABELS[f]).join(", ")}</p>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border rounded-lg max-h-80 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="p-2 text-left font-medium text-slate-600">{t("importPage.fileColumn")}</th>
                    <th className="p-2 text-left font-medium text-slate-600">{t("importPage.mapsTo")}</th>
                    <th className="p-2 text-left font-medium text-slate-600">{t("importPage.sampleValue")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.fileHeaders.map((header) => {
                    const sample = String(parsed.rawRows[0]?.[header] ?? "");
                    const mapped = columnMap[header];
                    return (
                      <tr key={header} className="border-t border-slate-100">
                        <td className="p-2 font-mono text-xs text-slate-800">{header}</td>
                        <td className="p-2 min-w-[200px]">
                          <select
                            value={mapped || ""}
                            onChange={(e) => updateColumnMap(header, e.target.value)}
                            className="w-full h-9 rounded-md border border-slate-300 px-2 text-xs"
                          >
                            <option value="">{t("importPage.skipColumn")}</option>
                            {fieldOptions.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2 text-xs text-slate-500 truncate max-w-[160px]" title={sample}>
                          {sample || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={() => setColumnMap(autoMapColumns(parsed.fileHeaders))}>
                <RefreshCw className="h-4 w-4" /> {t("importPage.autoMap")}
              </Button>
              <Button onClick={applyMapping} disabled={mappedCount < 3}>
                {t("importPage.continueValidate")} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation */}
      {(step === "validate" || step === "importing") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              {t("importPage.validationTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <button type="button" onClick={() => setPreviewFilter("all")} className={cn("rounded-lg p-3 text-center border transition-colors", previewFilter === "all" ? "border-blue-300 bg-blue-50" : "border-slate-200 bg-slate-50")}>
                <p className="text-xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">{t("importPage.total")}</p>
              </button>
              <button type="button" onClick={() => setPreviewFilter("valid")} className={cn("rounded-lg p-3 text-center border transition-colors", previewFilter === "valid" ? "border-emerald-300 bg-emerald-50" : "border-emerald-100 bg-emerald-50/50")}>
                <p className="text-xl font-bold text-emerald-700">{stats.valid}</p>
                <p className="text-xs text-emerald-600">{t("importPage.readyRows")}</p>
              </button>
              <button type="button" onClick={() => setPreviewFilter("warning")} className={cn("rounded-lg p-3 text-center border transition-colors", previewFilter === "warning" ? "border-amber-300 bg-amber-50" : "border-amber-100 bg-amber-50/50")}>
                <p className="text-xl font-bold text-amber-700">{stats.warning}</p>
                <p className="text-xs text-amber-600">{t("importPage.draftRows")}</p>
              </button>
              <button type="button" onClick={() => setPreviewFilter("error")} className={cn("rounded-lg p-3 text-center border transition-colors", previewFilter === "error" ? "border-red-300 bg-red-50" : "border-red-100 bg-red-50/50")}>
                <p className="text-xl font-bold text-red-700">{stats.error}</p>
                <p className="text-xs text-red-600">{t("importPage.errorRows")}</p>
              </button>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={skipInvalid}
                onChange={(e) => setSkipInvalid(e.target.checked)}
                className="rounded border-slate-300"
              />
              {t("importPage.skipInvalid")}
            </label>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">{t("importPage.colName")}</th>
                    <th className="p-2 text-left">Aadhaar</th>
                    <th className="p-2 text-left">{t("importPage.colStatus")}</th>
                    <th className="p-2 text-left">{t("importPage.colIssues")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPreview.map((v) => (
                    <tr key={v.rowIndex} className="border-t border-slate-100">
                      <td className="p-2">{v.rowIndex}</td>
                      <td className="p-2 font-medium">{v.name}</td>
                      <td className="p-2 font-mono">{v.aadhaarNumber || "—"}</td>
                      <td className="p-2">
                        <span className={cn(
                          "inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium",
                          v.status === "valid" && "bg-emerald-100 text-emerald-700",
                          v.status === "warning" && "bg-amber-100 text-amber-700",
                          v.status === "error" && "bg-red-100 text-red-700"
                        )}>
                          {v.status === "valid" ? t("importPage.statusReady") : v.status === "warning" ? t("importPage.statusDraft") : t("importPage.statusError")}
                        </span>
                      </td>
                      <td className="p-2 text-slate-500 max-w-[200px] truncate" title={v.errors.map((e) => e.message).join("; ")}>
                        {v.errors.length ? v.errors.slice(0, 2).map((e) => e.message).join("; ") : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {step === "importing" ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t("importPage.importing")} {importProgress}%
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600 transition-all" style={{ width: `${importProgress}%` }} />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap justify-between gap-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setStep("map")}>
                    {t("importPage.backToMap")}
                  </Button>
                  {(stats.warning > 0 || stats.error > 0) && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => downloadFailedRows(validations, "csv")}>
                        <Download className="h-4 w-4" /> CSV
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => downloadFailedRows(validations, "xlsx")}>
                        <FileSpreadsheet className="h-4 w-4" /> Excel
                      </Button>
                    </>
                  )}
                </div>
                <Button onClick={handleImport} size="lg" disabled={stats.valid + stats.warning === 0}>
                  {t("importPage.importAll")} ({skipInvalid ? stats.valid + stats.warning : stats.total})
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {step === "done" && result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              {t("importPage.results")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{result.total}</p>
                <p className="text-xs text-slate-500">{t("importPage.total")}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{result.created}</p>
                <p className="text-xs text-emerald-600">{t("importPage.created")}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                <p className="text-xs text-blue-600">{t("importPage.updated")}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600">{t("importPage.failed")}</p>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                {result.errors.map((err, i) => (
                  <div key={i} className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm">
                    <p className="font-medium text-red-800">
                      {t("importPage.rowError", { row: err.row, aadhaar: err.aadhaarNumber })}
                    </p>
                    <ul className="text-red-600 mt-1 list-disc list-inside">
                      {err.errors.map((e, j) => <li key={j}>{e}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            <Button onClick={reset}>{t("importPage.importAnother")}</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
