"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CSV_HEADERS, CSV_HEADER_LABELS } from "@/lib/constants";
import { Upload, Download, FileSpreadsheet, CheckCircle, AlertCircle, Info } from "lucide-react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useT } from "@/i18n/locale-provider";

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  failed: number;
  errors: { row: number; aadhaarNumber: string; errors: string[] }[];
}

export default function ImportPage() {
  const t = useT();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);

    if (f.name.endsWith(".csv")) {
      Papa.parse(f, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setPreview(results.data.slice(0, 5) as Record<string, string>[]);
        },
      });
    } else if (f.name.endsWith(".xlsx") || f.name.endsWith(".xls")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        setPreview(json.slice(0, 5));
      };
      reader.readAsArrayBuffer(f);
    }
  };

  const parseFullFile = (): Promise<Record<string, unknown>[]> => {
    return new Promise((resolve) => {
      if (!file) return resolve([]);

      if (file.name.endsWith(".csv")) {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data as Record<string, unknown>[]),
        });
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(sheet));
        };
        reader.readAsArrayBuffer(file);
      }
    });
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);

    const rows = await parseFullFile();
    const res = await fetch("/api/students/bulk-import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });

    const data = await res.json();
    setResult(data);
    setImporting(false);
  };

  const downloadTemplate = (format: "csv" | "xlsx") => {
    const headers = CSV_HEADERS.map((h) => CSV_HEADER_LABELS[h] || h);

    if (format === "csv") {
      const csv = CSV_HEADERS.join(",") + "\n" + headers.join(",");
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "scholarship_import_template.csv";
      a.click();
    } else {
      const ws = XLSX.utils.aoa_to_sheet([CSV_HEADERS as unknown as string[], headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Students");
      XLSX.writeFile(wb, "scholarship_import_template.xlsx");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("importPage.title")}</h1>
        <p className="text-slate-500 mt-1">{t("importPage.subtitleLong")}</p>
      </div>

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
        <CardContent className="flex gap-3">
          <Button variant="outline" onClick={() => downloadTemplate("csv")}>
            <Download className="h-4 w-4" /> {t("importPage.csvTemplate")}
          </Button>
          <Button variant="outline" onClick={() => downloadTemplate("xlsx")}>
            <FileSpreadsheet className="h-4 w-4" /> {t("importPage.excelTemplate")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("importPage.uploadFile")}</CardTitle>
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
            className="border-2 border-dashed border-slate-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all"
          >
            <Upload className="h-10 w-10 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-700 font-medium">
              {file ? file.name : t("importPage.dragDropFile")}
            </p>
            <p className="text-sm text-slate-500 mt-1">{t("importPage.supportedFormats")}</p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
          </div>

          {preview.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-slate-700 mb-2">
                {t("importPage.previewRows", { count: preview.length })}
              </h4>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50">
                      {Object.keys(preview[0]).slice(0, 6).map((key) => (
                        <th key={key} className="p-2 text-left font-medium text-slate-600">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        {Object.values(row).slice(0, 6).map((val, j) => (
                          <td key={j} className="p-2 text-slate-700">{String(val)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {file && (
            <div className="mt-6 flex justify-end">
              <Button onClick={handleImport} disabled={importing} size="lg">
                {importing ? t("importPage.importing") : t("importPage.importAll")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
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
              <div className="space-y-2 max-h-60 overflow-y-auto">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
