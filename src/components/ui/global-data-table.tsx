"use client";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type ColumnDef,
  type PaginationState,
  type SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

interface GlobalDataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData, unknown>[];
  loading?: boolean;
  emptyText?: string;
  className?: string;
  pageSize?: number;
  totalRows?: number;
  pageIndex?: number;
  onPageChange?: (pageIndex: number) => void;
  manualPagination?: boolean;
  /** Hide auto Sr. No column (default: show) */
  hideSrNo?: boolean;
  getRowClassName?: (row: TData) => string | undefined;
}

export function GlobalDataTable<TData>({
  data,
  columns,
  loading = false,
  emptyText,
  className,
  pageSize = 10,
  totalRows,
  pageIndex,
  onPageChange,
  manualPagination = false,
  hideSrNo = false,
  getRowClassName,
}: GlobalDataTableProps<TData>) {
  const t = useT();
  const [sorting, setSorting] = useState<SortingState>([]);

  const controlledPageIndex = pageIndex ?? 0;
  const [internalPagination, setInternalPagination] = useState<PaginationState>({
    pageIndex: controlledPageIndex,
    pageSize,
  });

  const paginationState = manualPagination
    ? { pageIndex: controlledPageIndex, pageSize }
    : { ...internalPagination, pageSize };

  const columnsWithSr = useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (hideSrNo) return columns;

    const srColumn: ColumnDef<TData, unknown> = {
      id: "__srNo",
      header: t("common.srNo"),
      enableSorting: false,
      size: 64,
      cell: ({ row, table: tbl }) => {
        const { pageIndex: pi, pageSize: ps } = tbl.getState().pagination;
        const sr = pi * ps + row.index + 1;
        return (
          <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-indigo-700 border border-indigo-100">
            {sr}
          </span>
        );
      },
    };

    return [srColumn, ...columns];
  }, [columns, hideSrNo, t]);

  const table = useReactTable({
    data,
    columns: columnsWithSr,
    state: {
      sorting,
      pagination: paginationState,
    },
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      if (manualPagination) {
        const next = typeof updater === "function" ? updater(paginationState) : updater;
        onPageChange?.(next.pageIndex);
      } else {
        setInternalPagination((prev) => {
          const base = { ...prev, pageSize };
          return typeof updater === "function" ? updater(base) : updater;
        });
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    ...(manualPagination ? {} : { getPaginationRowModel: getPaginationRowModel() }),
    manualPagination,
    pageCount:
      manualPagination && typeof totalRows === "number"
        ? Math.max(Math.ceil(totalRows / Math.max(pageSize, 1)), 1)
        : undefined,
  });

  const rows = table.getRowModel().rows;
  const colSpan = table.getVisibleFlatColumns().length || 1;

  const total = typeof totalRows === "number" ? totalRows : data.length;
  const currentIndex = table.getState().pagination.pageIndex;
  const currentSize = table.getState().pagination.pageSize;
  const from = total === 0 ? 0 : currentIndex * currentSize + 1;
  const to = total === 0 ? 0 : Math.min(total, (currentIndex + 1) * currentSize);
  const totalPages = Math.max(Math.ceil(total / Math.max(currentSize, 1)), 1);

  const resolvedEmptyText = emptyText || t("common.noData");

  const sortingIcon = (sort: false | "asc" | "desc") => {
    if (sort === "asc") return <ArrowUp className="h-3.5 w-3.5" />;
    if (sort === "desc") return <ArrowDown className="h-3.5 w-3.5" />;
    return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />;
  };

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm sm:min-w-[640px] lg:min-w-[760px]">
          <thead className="bg-gradient-to-r from-slate-50 via-sky-50/70 to-indigo-50/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-sky-100/80">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();
                  const isSr = header.column.id === "__srNo";
                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "px-4 py-3 text-left text-xs font-semibold leading-snug text-slate-600",
                        isSr && "w-16 whitespace-nowrap px-3",
                      )}
                    >
                      {header.isPlaceholder ? null : canSort ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex min-h-8 min-w-0 cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-left leading-snug whitespace-normal transition hover:bg-white/80 hover:text-blue-700 [&_svg]:shrink-0"
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sortingIcon(sorted)}
                        </button>
                      ) : (
                        <span className="break-words">{flexRender(header.column.columnDef.header, header.getContext())}</span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-14 text-center">
                  <div className="inline-flex items-center gap-2 text-slate-500">
                    <Spinner size="sm" />
                    <span className="text-sm">{t("common.loading")}</span>
                  </div>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-slate-500">
                  {resolvedEmptyText}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id}
                  className={cn(
                    "border-b border-slate-100 transition-colors hover:bg-sky-50/50 cursor-default",
                    idx % 2 === 1 && "bg-slate-50/30",
                    getRowClassName?.(row.original),
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn(
                        "px-4 py-3 align-middle text-slate-700",
                        cell.column.id === "__srNo" && "w-16 px-3",
                      )}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 0 && (
        <div className="flex flex-col gap-2 border-t border-sky-100 bg-gradient-to-r from-slate-50 via-sky-50/40 to-indigo-50/30 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">{t("common.showingRange", { from, to, total })}</p>
          <div className="flex items-center gap-1 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 cursor-pointer px-2"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="min-w-[4.5rem] text-center text-xs font-medium text-slate-600">
              {t("common.pageOf", { page: currentIndex + 1, total: totalPages })}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 cursor-pointer px-2"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
              aria-label={t("common.next")}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function useSimpleColumns<TData>(defs: ColumnDef<TData, unknown>[]) {
  return useMemo(() => defs, [defs]);
}
