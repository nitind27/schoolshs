"use client";

import { PageLoader } from "@/components/ui/loader";
import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import { Send, CheckCircle, AlertCircle, Square, CheckSquare } from "lucide-react";
import type { Student } from "@/generated/prisma/client";
import { useT } from "@/i18n/locale-provider";
import { useConfirm } from "@/hooks/use-confirm";
import { PAGE_SIZE } from "@/lib/pagination";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

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
  const { confirm, ConfirmDialog } = useConfirm();
  const searchParams = useSearchParams();
  const idsParam = searchParams.get("ids") || "";
  const preSelectedIds = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam],
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set(preSelectedIds));
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);

  useEffect(() => {
    setLoading(true);
    if (preSelectedIds.length > 0) {
      fetch(`/api/students?limit=${PAGE_SIZE}&page=${page}&ids=${preSelectedIds.join(",")}`)
        .then((r) => r.json())
        .then((data) => {
          setStudents(data.students || []);
          setTotal(data.total ?? data.students?.length ?? 0);
        })
        .finally(() => setLoading(false));
      return;
    }
    fetch(`/api/students?limit=${PAGE_SIZE}&page=${page}&status=ready`)
      .then((r) => r.json())
      .then((data) => {
        setStudents(data.students || []);
        setTotal(data.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, preSelectedIds]);

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

    await confirm({
      title: t("common.confirm"),
      message: t("bulkSubmitPage.confirmContinue", { count: selected.size }),
      confirmLabel: t("common.submit"),
      variant: "default",
      onConfirm: async () => {
        setSubmitting(true);
        const res = await fetch("/api/students/bulk-submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ studentIds: Array.from(selected) }),
        });

        const data = await res.json();
        setResult(data);
        setSubmitting(false);
      },
    });
  };

  const columns = useMemo<ColumnDef<Student>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: "",
        cell: ({ row }) => (
          <button type="button" onClick={() => toggleSelect(row.original.id)}>
            {selected.has(row.original.id) ? (
              <CheckSquare className="h-4 w-4 text-blue-600" />
            ) : (
              <Square className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ),
      },
      {
        header: t("common.name"),
        accessorFn: (s) => `${s.firstName || ""} ${s.surname || ""}`.trim(),
        cell: ({ row }) => (
          <span className="font-medium">
            {row.original.firstName} {row.original.surname}
          </span>
        ),
      },
      {
        header: t("fields.aadhaar"),
        accessorKey: "aadhaarNumber",
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.aadhaarNumber}</span>
        ),
      },
      {
        header: t("fields.category"),
        accessorKey: "category",
        cell: ({ row }) => <CategoryBadge category={row.original.category} />,
      },
      {
        header: t("fields.scheme"),
        accessorKey: "scholarshipScheme",
        cell: ({ row }) => (
          <span className="text-slate-700">{row.original.scholarshipScheme}</span>
        ),
      },
      {
        header: t("common.status"),
        accessorKey: "status",
        cell: ({ row }) => <Badge status={row.original.status} />,
      },
    ],
    [selected, t],
  );

  if (loading && students.length === 0) {
    return (
      <PageLoader />
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
            <CardTitle>{t("bulkSubmitPage.readyStudents", { count: total })}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <GlobalDataTable
              data={students}
              columns={columns}
              loading={loading}
              emptyText={t("bulkSubmitPage.noReadyHint")}
              manualPagination
              totalRows={total}
              pageSize={PAGE_SIZE}
              pageIndex={Math.max(page - 1, 0)}
              onPageChange={(idx) => setPage(idx + 1)}
              getRowClassName={(row) =>
                selected.has(row.id) ? "bg-blue-50/50" : undefined
              }
              className="rounded-none border-0 shadow-none"
            />
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
            <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
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
      <ConfirmDialog />
    </div>
  );
}

export default function BulkSubmitPage() {
  return (
    <Suspense fallback={
      <PageLoader />
    }>
      <BulkSubmitContent />
    </Suspense>
  );
}
