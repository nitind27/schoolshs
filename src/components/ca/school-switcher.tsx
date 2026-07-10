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
      <div className={cn("rounded-xl border border-violet-900/50 bg-violet-950/40 px-3 py-2.5", className)}>
        <Loader2 className="h-4 w-4 animate-spin text-violet-300" />
      </div>
    );
  }

  if (schools.length <= 1) {
    if (!activeSchool) return null;
    return (
      <div className={cn("rounded-xl border border-violet-900/50 bg-violet-950/40 px-3 py-2.5", className)}>
        <p className="text-[10px] uppercase tracking-wider text-violet-300/70">{t("caPortal.activeSchool")}</p>
        <p className="text-sm font-semibold text-white truncate">{activeSchool.name}</p>
        <p className="text-[11px] text-violet-300/80">{activeSchool.code}</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={switching}
        className="w-full rounded-xl border border-violet-900/50 bg-violet-950/40 px-3 py-2.5 text-left hover:bg-violet-900/30 transition-colors"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-violet-300/70">{t("caPortal.activeSchool")}</p>
            <p className="text-sm font-semibold text-white truncate">{activeSchool?.name}</p>
            <p className="text-[11px] text-violet-300/80">{activeSchool?.code}</p>
          </div>
          {switching ? (
            <Loader2 className="h-4 w-4 animate-spin text-violet-300 shrink-0 mt-1" />
          ) : (
            <ChevronDown className={cn("h-4 w-4 text-violet-300 shrink-0 mt-1 transition-transform", open && "rotate-180")} />
          )}
        </div>
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-xl border border-violet-900/60 bg-slate-900 shadow-xl overflow-hidden">
          {schools.map((school) => (
            <button
              key={school.id}
              type="button"
              onClick={() => switchSchool(school.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-violet-900/40 transition-colors",
                school.id === activeId && "bg-violet-900/50"
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-violet-800/60 flex items-center justify-center shrink-0">
                <Building2 className="h-4 w-4 text-violet-200" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{school.name}</p>
                <p className="text-[11px] text-violet-300/80">
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
