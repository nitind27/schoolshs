"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CategoryBadge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import type { DgCategory } from "@/lib/category-inference";
import type { GenderCounts } from "@/lib/gender-utils";
import { useT } from "@/i18n/locale-provider";

interface CategoryRow {
  id: DgCategory;
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  count: number;
  percent: number;
  gender: GenderCounts;
}

interface OverallGender extends GenderCounts {}

function GenderPill({
  label,
  count,
  href,
  variant,
}: {
  label: string;
  count: number;
  href: string;
  variant: "total" | "male" | "female" | "other";
}) {
  const styles = {
    total: "bg-slate-800/90 text-white hover:bg-slate-900",
    male: "bg-blue-600/90 text-white hover:bg-blue-700",
    female: "bg-pink-600/90 text-white hover:bg-pink-700",
    other: "bg-gray-500/90 text-white hover:bg-gray-600",
  };

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold transition-colors ${styles[variant]}`}
    >
      {label}
      <span className="opacity-90">{count}</span>
    </Link>
  );
}

export function CategoryDashboardPanel() {
  const t = useT();
  const [breakdown, setBreakdown] = useState<CategoryRow[]>([]);
  const [overall, setOverall] = useState<OverallGender>({ male: 0, female: 0, other: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        setBreakdown(d.categoryBreakdown || []);
        setOverall(d.overallGender || { male: 0, female: 0, other: 0, total: 0 });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center h-32 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            {t("category.title")}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t("category.subtitle")}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-white border border-slate-200">
        <span className="text-xs font-medium text-slate-500 self-center mr-1">{t("category.allStudents")}</span>
        <GenderPill label={t("category.total")} count={overall.total} href="/categories/all?gender=all" variant="total" />
        <GenderPill label={t("category.boys")} count={overall.male} href="/categories/all?gender=Male" variant="male" />
        <GenderPill label={t("category.girls")} count={overall.female} href="/categories/all?gender=Female" variant="female" />
        {overall.other > 0 && (
          <GenderPill label={t("category.other")} count={overall.other} href="/categories/all?gender=Other" variant="other" />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {breakdown.map((cat) => (
          <div
            key={cat.id}
            className={`rounded-xl border-2 p-3 ${cat.borderColor} ${cat.bgColor}`}
          >
            <div className="flex items-center justify-between mb-2">
              <Link href={`/categories/${cat.id}`} className="group">
                <p className={`text-sm font-black uppercase tracking-wide ${cat.color} group-hover:underline`}>
                  {cat.id}
                </p>
              </Link>
              <Link href={`/categories/${cat.id}`}>
                <span className="text-2xl font-black text-slate-900 hover:text-blue-600">{cat.count}</span>
              </Link>
            </div>
            <p className="text-[10px] text-slate-500 mb-2">{t("category.percentOfTotal", { percent: cat.percent })}</p>

            <div className="flex flex-wrap gap-1.5">
              <GenderPill
                label={t("category.total")}
                count={cat.gender.total}
                href={`/categories/${cat.id}?gender=all`}
                variant="total"
              />
              <GenderPill
                label={t("gender.M")}
                count={cat.gender.male}
                href={`/categories/${cat.id}?gender=Male`}
                variant="male"
              />
              <GenderPill
                label={t("gender.F")}
                count={cat.gender.female}
                href={`/categories/${cat.id}?gender=Female`}
                variant="female"
              />
              {cat.gender.other > 0 && (
                <GenderPill
                  label={t("gender.other")}
                  count={cat.gender.other}
                  href={`/categories/${cat.id}?gender=Other`}
                  variant="other"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
