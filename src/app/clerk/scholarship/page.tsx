"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, Send } from "lucide-react";
import { useT } from "@/i18n/locale-provider";
import { TablePagination } from "@/components/ui/table-pagination";
import { PAGE_SIZE } from "@/lib/pagination";
import { cn } from "@/lib/utils";

const STATUS_FILTERS = ["draft", "ready", "pending", "submitted", "approved", "rejected"] as const;

function ClerkScholarshipContent() {
  const t = useT();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") || "ready";
  const [students, setStudents] = useState<Record<string, unknown>[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
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
    fetch(`/api/students?status=${status}&page=${page}&limit=${PAGE_SIZE}`)
      .then((r) => r.json())
      .then((d) => {
        setStudents(d.students || []);
        setTotal(d.total ?? 0);
      });
  }, [status, page]);

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
        <div className="px-4 py-3">
          {students.length === 0 ? (
            <p className="py-10 text-center text-sm text-slate-500">{t("common.noData")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="pb-2.5 pr-3">Name</th>
                    <th className="pb-2.5 pr-3">Class</th>
                    <th className="pb-2.5 pr-3">Category</th>
                    <th className="pb-2.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((st) => (
                    <tr key={String(st.id)} className="border-b border-slate-50 transition-colors hover:bg-cyan-50/40">
                      <td className="py-2.5 pr-3 font-medium">
                        <Link href={`/students/${st.id}`} className="text-slate-800 hover:text-cyan-700">
                          {[st.firstName, st.middleName, st.surname].filter(Boolean).join(" ")}
                        </Link>
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">
                        {String(st.standard || "")}-{String(st.section || "")}
                      </td>
                      <td className="py-2.5 pr-3 text-slate-600">{String(st.category || "—")}</td>
                      <td className="py-2.5">
                        <Badge status={String(st.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <TablePagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                onPageChange={setPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ClerkScholarshipPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-100 border-t-cyan-600" />
        </div>
      }
    >
      <ClerkScholarshipContent />
    </Suspense>
  );
}
