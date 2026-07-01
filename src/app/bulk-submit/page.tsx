"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Send, CheckCircle, AlertCircle, Square, CheckSquare } from "lucide-react";
import type { Student } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";

interface SubmitResult {
  total: number;
  submitted: number;
  failed: number;
  details: {
    id: string;
    name: string;
    aadhaarNumber: string;
    success: boolean;
    message: string;
  }[];
}

function BulkSubmitContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const preSelectedIds = searchParams.get("ids")?.split(",") || [];

  const [students, setStudents] = useState<Student[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set(preSelectedIds));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    fetch("/api/students?limit=500&status=ready")
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.students);
        if (preSelectedIds.length === 0) {
          setSelected(new Set(data.students.map((s: Student) => s.id)));
        }
      })
      .finally(() => setLoading(false));
  }, [preSelectedIds.length]);

  useEffect(() => {
    if (preSelectedIds.length > 0) {
      fetch("/api/students?limit=500")
        .then((r) => r.json())
        .then((data) => {
          const all = data.students as Student[];
          setStudents(all.filter((s) => preSelectedIds.includes(s.id) || s.status === "ready"));
        });
    }
  }, [preSelectedIds]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selected.size === 0) {
      alert(t("bulkSubmitPage.minOneStudent"));
      return;
    }

    if (!confirm(t("bulkSubmitPage.confirmContinue", { count: selected.size }))) return;

    setSubmitting(true);
    const res = await fetch("/api/students/bulk-submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentIds: Array.from(selected) }),
    });

    const data = await res.json();
    setResult(data);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t("bulkSubmitPage.title")}</h1>
          <p className="text-slate-500 mt-1">
            {t("bulkSubmitPage.selectedCount", { count: selected.size })}
          </p>
        </div>
        <Button
          variant="success"
          size="lg"
          onClick={handleSubmit}
          disabled={submitting || selected.size === 0}
        >
          <Send className="h-4 w-4" />
          {submitting ? t("bulkSubmitPage.submitting") : t("bulkSubmitPage.submitStudents", { count: selected.size })}
        </Button>
      </div>

      {!result && (
        <Card>
          <CardHeader>
            <CardTitle>{t("bulkSubmitPage.readyStudents", { count: students.length })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {students.length === 0 ? (
              <p className="text-center text-slate-500 py-12">
                {t("bulkSubmitPage.noReadyHint")}
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="p-3 w-10"></th>
                      <th className="p-3 text-left font-medium text-slate-600">{t("common.name")}</th>
                      <th className="p-3 text-left font-medium text-slate-600">{t("fields.aadhaar")}</th>
                      <th className="p-3 text-left font-medium text-slate-600">{t("fields.category")}</th>
                      <th className="p-3 text-left font-medium text-slate-600">{t("fields.scheme")}</th>
                      <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((student) => (
                      <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3">
                          <button onClick={() => toggleSelect(student.id)}>
                            {selected.has(student.id) ? (
                              <CheckSquare className="h-4 w-4 text-blue-600" />
                            ) : (
                              <Square className="h-4 w-4 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="p-3 font-medium">{student.firstName} {student.surname}</td>
                        <td className="p-3 font-mono text-xs">{student.aadhaarNumber}</td>
                        <td className="p-3"><CategoryBadge category={student.category} /></td>
                        <td className="p-3 text-slate-700">{student.scholarshipScheme}</td>
                        <td className="p-3"><Badge status={student.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.failed === 0 ? (
                <CheckCircle className="h-5 w-5 text-emerald-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-600" />
              )}
              {t("bulkSubmitPage.results")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-slate-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold">{result.total}</p>
                <p className="text-xs text-slate-500">{t("bulkSubmitPage.totalLabel")}</p>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-emerald-700">{result.submitted}</p>
                <p className="text-xs text-emerald-600">{t("bulkSubmitPage.submittedLabel")}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-700">{result.failed}</p>
                <p className="text-xs text-red-600">{t("bulkSubmitPage.failedLabel")}</p>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {result.details.map((detail) => (
                <div
                  key={detail.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    detail.success
                      ? "bg-emerald-50 border-emerald-100"
                      : "bg-red-50 border-red-100"
                  }`}
                >
                  <div>
                    <p className="text-sm font-medium">{detail.name}</p>
                    <p className="text-xs text-slate-500">{detail.aadhaarNumber}</p>
                  </div>
                  <div className="text-right">
                    {detail.success ? (
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <p className="text-xs text-red-600 max-w-xs">{detail.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-center">
              <Button onClick={() => { setResult(null); window.location.reload(); }}>
                {t("bulkSubmitPage.done")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function BulkSubmitPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    }>
      <BulkSubmitContent />
    </Suspense>
  );
}
