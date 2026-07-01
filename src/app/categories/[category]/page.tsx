"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Badge, CategoryBadge } from "@/components/ui/badge";
import {
  SCHOOL_STANDARDS,
  CLASS_SECTIONS,
  STUDENT_STATUSES,
} from "@/lib/constants";
import { getCategoryMeta, type DgCategory } from "@/lib/category-inference";
import { genderShort } from "@/lib/gender-utils";
import { useT } from "@/i18n/locale-provider";
import {
  ArrowLeft,
  Search,
  Edit,
  Eye,
  Users,
  Filter,
  X,
} from "lucide-react";

interface CategoryStudent {
  id: string;
  firstName: string;
  middleName?: string | null;
  surname: string;
  gender: string;
  normalizedGender: string;
  category: string;
  effectiveCategory: string;
  mobileNumber: string;
  rollNumber?: string | null;
  grNumber?: string | null;
  standard?: string | null;
  section?: string | null;
  status: string;
  dateOfBirth: string;
  aadhaarNumber: string;
  institutionName: string;
}

function CategoryReportContent() {
  const t = useT();
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const rawCategory = (params.category as string) || "all";
  const isAll = rawCategory.toLowerCase() === "all";
  const category = isAll ? "ALL" : (rawCategory.toUpperCase() as DgCategory);
  const meta = isAll ? null : getCategoryMeta(category as DgCategory);
  const categoryLabel = isAll
    ? t("categoryPage.allCategories")
    : t(`category.${category}` as "category.SC");

  const [students, setStudents] = useState<CategoryStudent[]>([]);
  const [total, setTotal] = useState(0);
  const [genderSummary, setGenderSummary] = useState({ male: 0, female: 0, other: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  const [genderFilter, setGenderFilter] = useState(searchParams.get("gender") || "all");
  const [standardFilter, setStandardFilter] = useState(searchParams.get("standard") || "");
  const [sectionFilter, setSectionFilter] = useState(searchParams.get("section") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const syncUrl = useCallback(
    (updates: Record<string, string>) => {
      const p = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v) p.set(k, v);
        else p.delete(k);
      }
      router.replace(`/categories/${rawCategory.toLowerCase()}?${p.toString()}`, { scroll: false });
    },
    [rawCategory, router, searchParams]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    const qp = new URLSearchParams({
      category: isAll ? "all" : category,
      list: "true",
      gender: genderFilter,
    });
    if (standardFilter) qp.set("standard", standardFilter);
    if (sectionFilter) qp.set("section", sectionFilter);
    if (statusFilter) qp.set("status", statusFilter);
    if (search) qp.set("search", search);

    const res = await fetch(`/api/categories?${qp}`);
    const data = await res.json();
    setStudents(data.students || []);
    setTotal(data.total || 0);
    setGenderSummary(data.genderSummary || { male: 0, female: 0, other: 0, total: 0 });
    setLoading(false);
  }, [isAll, category, genderFilter, standardFilter, sectionFilter, statusFilter, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setGender = (g: string) => {
    setGenderFilter(g);
    syncUrl({ gender: g === "all" ? "" : g, standard: standardFilter, section: sectionFilter, status: statusFilter, search });
  };

  const genderTabs = [
    { key: "all", label: t("common.total"), count: genderSummary.total, color: "bg-slate-800 text-white" },
    { key: "Male", label: t("category.boys"), count: genderSummary.male, color: "bg-blue-600 text-white" },
    { key: "Female", label: t("category.girls"), count: genderSummary.female, color: "bg-pink-600 text-white" },
    ...(genderSummary.other > 0
      ? [{ key: "Other", label: t("categoryPage.genderOther"), count: genderSummary.other, color: "bg-gray-500 text-white" }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Link href="/">
            <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {!isAll && <CategoryBadge category={category as DgCategory} />}
              <h1 className="text-2xl font-bold text-slate-900">{categoryLabel}</h1>
            </div>
            <p className="text-slate-500 mt-1 text-sm">
              {t("students.totalCount", { count: total })}
              {!isAll && meta && ` ${t("categoryPage.incomeMeta", { income: meta.incomeLimit, portal: meta.portal })}`}
            </p>
          </div>
        </div>
        <Link href={`/students/new`}>
          <Button><Users className="h-4 w-4" /> {t("students.addStudent")}</Button>
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {genderTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setGender(tab.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border-2 ${
              genderFilter === tab.key || (tab.key === "all" && (!genderFilter || genderFilter === "all"))
                ? `${tab.color} border-transparent shadow-md scale-105`
                : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
            }`}
          >
            {tab.label}
            <span className="ml-2 font-black">{tab.count}</span>
          </button>
        ))}
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <Filter className="h-4 w-4" /> {t("common.filter")}
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                placeholder={t("categoryPage.searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-lg border border-slate-300 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <Select
              options={["", ...SCHOOL_STANDARDS]}
              value={standardFilter}
              onChange={(e) => setStandardFilter(e.target.value)}
              className="w-32"
            />
            <Select
              options={["", ...CLASS_SECTIONS]}
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              className="w-28"
            />
            <Select
              options={STUDENT_STATUSES.map((s) => s.value)}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-36"
            />
            {(standardFilter || sectionFilter || statusFilter || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStandardFilter("");
                  setSectionFilter("");
                  setStatusFilter("");
                  setSearch("");
                }}
              >
                <X className="h-4 w-4" /> {t("students.clear")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center h-48 items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : students.length === 0 ? (
            <p className="text-center py-16 text-slate-500">{t("categoryPage.noStudentsFilter")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.roll")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("categoryPage.genderMF")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.name")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("categoryPage.surname")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.class")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.dob")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.mobile")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("fields.category")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.status")}</th>
                    <th className="p-3 text-left font-medium text-slate-600">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="p-3 font-mono text-xs">{s.rollNumber || "—"}</td>
                      <td className="p-3">
                        <span
                          className={`inline-flex w-7 h-7 items-center justify-center rounded-full text-xs font-bold ${
                            s.normalizedGender === "Female"
                              ? "bg-pink-100 text-pink-700"
                              : s.normalizedGender === "Male"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {genderShort(s.normalizedGender)}
                        </span>
                      </td>
                      <td className="p-3 font-medium">{s.firstName} {s.middleName || ""}</td>
                      <td className="p-3 font-semibold text-slate-800">{s.surname}</td>
                      <td className="p-3">{s.standard ? `${s.standard}-${s.section || ""}` : "—"}</td>
                      <td className="p-3 text-xs">{s.dateOfBirth}</td>
                      <td className="p-3">{s.mobileNumber}</td>
                      <td className="p-3"><CategoryBadge category={s.category} /></td>
                      <td className="p-3"><Badge status={s.status} /></td>
                      <td className="p-3">
                        <div className="flex gap-1">
                          <Link href={`/students/${s.id}`}><Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button></Link>
                          <Link href={`/students/${s.id}/edit`}><Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button></Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function CategoryReportPage() {
  return (
    <Suspense fallback={<div className="flex justify-center h-48 items-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>}>
      <CategoryReportContent />
    </Suspense>
  );
}
