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
    total: "bg-slate-800 text-white hover:bg-slate-900 shadow-sm",
    male: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20",
    female: "bg-pink-600 text-white hover:bg-pink-700 shadow-sm shadow-pink-600/20",
    other: "bg-gray-500 text-white hover:bg-gray-600",
  };

  return (
    <Link
      href={href}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition-all hover:scale-[1.02] ${styles[variant]}`}
    >
      {label}
      <span className="opacity-90 tabular-nums">{count}</span>
    </Link>
  );
}

export function CategoryDashboardPanel({ embedded = false }: { embedded?: boolean }) {
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
      <div className="flex h-32 items-center justify-center">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-blue-100 border-t-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!embedded && (
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Sparkles className="h-5 w-5 text-amber-500" />
              {t("category.title")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{t("category.subtitle")}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3 shadow-sm">
        <span className="mr-1 self-center text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t("category.allStudents")}
        </span>
        <GenderPill label={t("category.total")} count={overall.total} href="/categories/all?gender=all" variant="total" />
        <GenderPill label={t("category.boys")} count={overall.male} href="/categories/all?gender=Male" variant="male" />
        <GenderPill label={t("category.girls")} count={overall.female} href="/categories/all?gender=Female" variant="female" />
        {overall.other > 0 && (
          <GenderPill label={t("category.other")} count={overall.other} href="/categories/all?gender=Other" variant="other" />
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {breakdown.map((cat) => (
          <div
            key={cat.id}
            className={`group rounded-xl border-2 p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${cat.borderColor} ${cat.bgColor}`}
          >
            <div className="mb-2 flex items-center justify-between">
              <Link href={`/categories/${cat.id}`} className="group/link">
                <CategoryBadge category={cat.id} />
              </Link>
              <Link href={`/categories/${cat.id}`}>
                <span className="text-2xl font-black tabular-nums text-slate-900 transition-colors group-hover:text-blue-600">
                  {cat.count}
                </span>
              </Link>
            </div>
            <p className="mb-2.5 text-[10px] font-medium text-slate-500">
              {t("category.percentOfTotal", { percent: cat.percent })}
            </p>

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
