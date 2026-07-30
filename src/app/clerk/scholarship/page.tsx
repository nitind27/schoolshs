"use client";

import { PageLoader } from "@/components/ui/loader";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Send } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";
import type { ColumnDef } from "@tanstack/react-table";
import { GlobalDataTable } from "@/components/ui/global-data-table";

const STATUS_FILTERS = ["draft", "ready", "pending", "submitted", "approved", "rejected"] as const;

type ClerkStudent = {
  id: string;
  firstName?: string | null;
  middleName?: string | null;
  surname?: string | null;
  standard?: string | null;
  section?: string | null;
  category?: string | null;
  status?: string | null;
};

function ClerkScholarshipContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ready";
  const [students, setStudents] = useState<ClerkStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(
    STATUS_FILTERS.includes(initialStatus as (typeof STATUS_FILTERS)[number])
      ? initialStatus
      : "ready"
  );

  useEffect(() => {
    const fromUrl = searchParams.get("status");
    if (fromUrl && STATUS_FILTERS.includes(fromUrl as (typeof STATUS_FILTERS)[number])) {
      setStatus(fromUrl);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/students?status=${status}&page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students || []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [status, page]);

  const columns = useMemo<ColumnDef<ClerkStudent>[]>(
    () => [
      {
        header: "Name",
        accessorFn: (st) => [st.firstName, st.middleName, st.surname].filter(Boolean).join(" "),
        cell: ({ row }) => {
          const st = row.original;
          return (
            <Link href={`/students/${st.id}`} className="font-medium text-slate-800 hover:text-cyan-700">
              {[st.firstName, st.middleName, st.surname].filter(Boolean).join(" ")}
            </Link>
          );
        },
      },
      {
        header: "Class",
        accessorFn: (st) => `${st.standard || ""}-${st.section || ""}`,
        cell: ({ row }) => (
          <span className="text-slate-600">
            {String(row.original.standard || "")}-{String(row.original.section || "")}
          </span>
        ),
      },
      {
        header: "Category",
        accessorKey: "category",
        cell: ({ row }) => (
          <span className="text-slate-600">{String(row.original.category || "—")}</span>
        ),
      },
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ row }) => <Badge status={String(row.original.status || "")} />,
      },
    ],
    [],
  );

  return (
    <div className="space-y-5">
      <div className="clerk-page-hero flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="relative z-[1]">
          <span className="clerk-page-hero-kicker">
            <FileCheck className="h-3 w-3" />
            {t("clerkNav.groupScholarship")}
          </span>
          <h1>{t("clerkPortal.scholarshipMgmt")}</h1>
          <p>{t("clerkPortal.scholarshipSubtitle")}</p>
        </div>
        <Link href="/bulk-submit" className="relative z-[1]">
          <Button className="clerk-cta-btn gap-2 text-white">
            <Send className="h-4 w-4" /> {t("clerkNav.bulkSubmit")}
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((s) => (
          <Button
            key={s}
            size="sm"
            variant={status === s ? "default" : "outline"}
            className={cn("clerk-filter-chip", status === s && "is-active")}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
          >
            {t(`status.${s}`)}
          </Button>
        ))}
      </div>

      <div className="clerk-section-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            {t(`status.${status}`)}
            <span className="ml-2 rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-semibold text-cyan-800">
              {total}
            </span>
          </h2>
        </div>
        <div className="p-0">
          <GlobalDataTable
            data={students}
            columns={columns}
            loading={loading}
            emptyText={t("common.noData")}
            manualPagination
            totalRows={total}
            pageSize={PAGE_SIZE}
            pageIndex={Math.max(page - 1, 0)}
            onPageChange={(idx) => setPage(idx + 1)}
            className="rounded-none border-0 shadow-none"
          />
        </div>
      </div>
    </div>
  );
}

export default function ClerkScholarshipPage() {
  return (
    <Suspense
      fallback={
        <PageLoader />
      }
    >
      <ClerkScholarshipContent />
    </Suspense>
  );
}
