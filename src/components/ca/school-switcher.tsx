"use client";

import { useEffect, useState } from "react";
import { Building2, ChevronDown, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/locale-provider";

interface CaSchool {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  isActive?: boolean;
  isPrimary?: boolean;
  pendingVouchers?: number;
  financialYear?: {
    label: string;
    auditStatus: string;
    submittedAt?: string | null;
    _count?: { vouchers: number };
  } | null;
}

export function CaSchoolSwitcher({ className }: { className?: string }) {
  const t = useT();
  const router = useRouter();
  const [schools, setSchools] = useState<CaSchool[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [open, setOpen] = useState(false);

  const load = () => {
    fetch("/api/ca/schools")
      .then((r) => r.json())
      .then((d) => {
        setSchools(d.schools || []);
        setActiveId(d.activeSchoolId || null);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activeSchool = schools.find((s) => s.id === activeId) || schools[0];

  const switchSchool = async (schoolId: string) => {
    if (schoolId === activeId) {
      setOpen(false);
      return;
    }
    setSwitching(true);
    try {
      const res = await fetch("/api/ca/schools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolId }),
      });
      if (!res.ok) return;
      setActiveId(schoolId);
      setOpen(false);
      router.refresh();
      window.location.reload();
    } finally {
      setSwitching(false);
    }
  };

  if (loading) {
    return (
      <div className={cn("rounded-xl border border-amber-900/40 bg-amber-950/40 px-3 py-2.5", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-amber-200" />
      </div>
    );
  }

  if (schools.length <= 1) {
    if (!activeSchool) return null;
    return (
      <div className={cn("rounded-xl border border-amber-900/40 bg-amber-950/40 px-3 py-2.5", className)}>
        <p className="text-[10px] uppercase tracking-wider text-amber-200/70">{t("caPortal.activeSchool")}</p>
        <p className="truncate text-sm font-semibold text-white">{activeSchool.name}</p>
        <p className="text-[11px] text-amber-200/80">{activeSchool.code}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="w-full rounded-xl border border-amber-900/40 bg-amber-950/40 px-3 py-2.5 text-left transition-colors hover:bg-amber-900/35"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-amber-200/70">{t("caPortal.activeSchool")}</p>
            <p className="truncate text-sm font-semibold text-white">{activeSchool?.name}</p>
            <p className="text-[11px] text-amber-200/80">{activeSchool?.code}</p>
          </div>
          {switching ? (
            <Loader2 className="mt-1 h-4 w-4 shrink-0 animate-spin text-amber-200" />
          ) : (
            <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-amber-200 transition-transform", open && "rotate-180")} />
          )}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-amber-900/50 bg-stone-950 shadow-xl">
          {schools.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => switchSchool(school.id)}
              className={cn(
                "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-amber-900/35",
                school.id === activeId && "bg-amber-900/45"
              )}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-800/55">
                <Building2 className="h-4 w-4 text-amber-100" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{school.name}</p>
                <p className="text-[11px] text-amber-200/80">
                  {school.code}
                  {school.financialYear ? ` · FY ${school.financialYear.label}` : ""}
                  {(school.pendingVouchers || 0) > 0 ? ` · ${school.pendingVouchers} pending` : ""}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
