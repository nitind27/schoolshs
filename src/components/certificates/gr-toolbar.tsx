"use client";

import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/locale-provider";
import { Search, Plus, Users, Pencil, X, CalendarDays } from "lucide-react";
import type { GeneralRegisterRow } from "@/lib/certificates/general-register";

export interface GrSearchFilters {
  query: string;
  dob: string;
}

export function GrToolbar({
  search,
  onSearchChange,
  onSearch,
  onAdd,
  onImportClass,
  onEdit,
  selectedRow,
  importing,
}: {
  search: GrSearchFilters;
  onSearchChange: (v: GrSearchFilters) => void;
  onSearch: (override?: GrSearchFilters) => void;
  onAdd: () => void;
  onImportClass: () => void;
  onEdit: () => void;
  selectedRow?: GeneralRegisterRow | null;
  importing?: boolean;
}) {
  const t = useT();
  const hasFilters = Boolean(search.query.trim() || search.dob);
  const set = (patch: Partial<GrSearchFilters>) => onSearchChange({ ...search, ...patch });

  const clearAll = () => {
    const cleared = { query: "", dob: "" };
    onSearchChange(cleared);
    onSearch(cleared);
  };

  const runSearch = () => onSearch(search);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") runSearch();
  };

  return (
    <div className="no-print mb-4 rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/40 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Search className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{t("certificates.grSearchTitle")}</p>
            <p className="text-[11px] text-white/75">{t("certificates.grSearchHint")}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search.query}
              onChange={(e) => set({ query: e.target.value })}
              onKeyDown={handleKeyDown}
              placeholder={t("certificates.grSearchPlaceholder")}
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-11 pr-10 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
            {search.query && (
              <button
                type="button"
                onClick={() => set({ query: "" })}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="w-full lg:w-52 shrink-0">
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
              <input
                type="date"
                value={search.dob}
                onChange={(e) => set({ dob: e.target.value })}
                onKeyDown={handleKeyDown}
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-900 shadow-sm focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                aria-label={t("certificates.grFilterDob")}
              />
            </div>
            <p className="mt-1 text-[10px] text-slate-400 px-1">{t("certificates.grFilterDob")}</p>
          </div>

          <div className="flex items-start gap-2 shrink-0">
            <Button onClick={runSearch} className="h-12 px-6 gap-1.5 shadow-sm">
              <Search className="h-4 w-4" />
              {t("certificates.grFind")}
            </Button>
            {hasFilters && (
              <Button variant="outline" onClick={clearAll} className="h-12 px-4">
                {t("certificates.grClearSearch")}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onAdd} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            {t("certificates.grAdd")}
          </Button>
          <Button variant="outline" size="sm" onClick={onImportClass} disabled={importing} className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {importing ? t("certificates.grImporting") : t("certificates.grImportClass")}
          </Button>
          {selectedRow && (
            <Button variant="outline" size="sm" onClick={onEdit} className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" />
              {t("certificates.grEdit")}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
