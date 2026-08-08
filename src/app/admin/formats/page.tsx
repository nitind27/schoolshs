"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageLoader } from "@/components/ui/loader";
import {
  FolderKanban,
  School,
  FileText,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  LayoutList,
  IdCard,
  ClipboardList,
} from "lucide-react";
import { cn } from "@/lib/utils";

type AssignedSchool = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type ReportRow = {
  id: string;
  labelEn: string;
  labelGu: string;
  landscape: boolean;
  note?: string;
};

type PackRow = {
  id: string;
  label: string;
  description: string;
  schoolCode: string | null;
  folder: string;
  recommendedFor: string;
  lcLayout: string;
  reports: ReportRow[];
  typeCount: number;
  assignedCount: number;
  assignedSchools: AssignedSchool[];
};

type ModuleOption = {
  id: string;
  label: string;
  description: string;
  recommendedSchoolCode: string | null;
};

type ModuleCatalog = {
  key: string;
  label: string;
  options: ModuleOption[];
};

type SchoolDirRow = {
  id: string;
  name: string;
  code: string;
  udiseCode: string | null;
  isActive: boolean;
  features: {
    certificates: boolean;
    id_cards: boolean;
    results: boolean;
    board_records: boolean;
  };
  formats: {
    certificates: string;
    id_cards: string;
    results: string;
    board_records: string;
  };
  certificatesPackLabel: string;
  lcLayout: string;
  packMatchesSchoolCode: boolean;
  suggestedCertificatePack: string;
};

type TabId = "schools" | "packs" | "modules";

export default function AdminFormatsPage() {
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [moduleCatalog, setModuleCatalog] = useState<ModuleCatalog[]>([]);
  const [schoolDirectory, setSchoolDirectory] = useState<SchoolDirRow[]>([]);
  const [howToAdd, setHowToAdd] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("schools");
  const [q, setQ] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/formats", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load formats");
        setPacks(d.packs || []);
        setModuleCatalog(d.moduleCatalog || []);
        setSchoolDirectory(d.schoolDirectory || []);
        setHowToAdd(d.howToAdd || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredSchools = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return schoolDirectory;
    return schoolDirectory.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.code.toLowerCase().includes(needle) ||
        (s.udiseCode || "").toLowerCase().includes(needle) ||
        s.formats.certificates.toLowerCase().includes(needle) ||
        s.certificatesPackLabel.toLowerCase().includes(needle),
    );
  }, [schoolDirectory, q]);

  if (loading) return <PageLoader label="Loading formats…" />;

  const tabs: { id: TabId; label: string; icon: typeof School }[] = [
    { id: "schools", label: "School-wise list", icon: School },
    { id: "packs", label: "Certificate packs + reports", icon: FileText },
    { id: "modules", label: "ID / Results / Board", icon: IdCard },
  ];

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Super Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-violet-600" />
            Formats & reports
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            School code wise dekho — kis school pe kaunsa certificate / ID / result pack lagaya hai,
            aur kaunsa pack kis code ke liye bana hai. Kisi bhi pack ko kisi bhi school pe assign kar
            sakte ho.
          </p>
        </div>
        <Button variant="outline" onClick={load} className="shrink-0">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-violet-300 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "schools" ? (
        <Card>
          <CardHeader className="pb-3 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <LayoutList className="h-4 w-4 text-violet-600" />
                Schools · assigned formats ({filteredSchools.length})
              </CardTitle>
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search school / code / pack…"
                className="sm:max-w-xs"
              />
            </div>
            <p className="text-xs text-slate-500">
              Green = pack school-code se match. Amber = dusra pack assign hai (allowed, but check
              LC layout). Panel Access se change karo.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {filteredSchools.length === 0 ? (
              <p className="px-5 py-8 text-sm text-slate-500 text-center">
                Koi school nahi mila. Pehle Super Admin → Schools me school create karo.
              </p>
            ) : (
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="border-y border-slate-200 bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 font-semibold">School code</th>
                    <th className="px-4 py-3 font-semibold">School</th>
                    <th className="px-4 py-3 font-semibold">Certificate pack</th>
                    <th className="px-4 py-3 font-semibold">LC layout</th>
                    <th className="px-4 py-3 font-semibold">ID card</th>
                    <th className="px-4 py-3 font-semibold">Results</th>
                    <th className="px-4 py-3 font-semibold">Board</th>
                    <th className="px-4 py-3 font-semibold">Modules ON</th>
                    <th className="px-4 py-3 font-semibold">Suggest</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSchools.map((s) => {
                    const mismatch =
                      s.suggestedCertificatePack !== "default" &&
                      s.formats.certificates !== s.suggestedCertificatePack;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 align-top">
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-violet-800">
                          {s.code}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-900">{s.name}</div>
                          {!s.isActive ? (
                            <span className="text-[11px] text-amber-700">Inactive</span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{s.certificatesPackLabel}</div>
                          <div className="font-mono text-[11px] text-slate-500">
                            {s.formats.certificates}
                          </div>
                          {s.packMatchesSchoolCode ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-700">
                              <CheckCircle2 className="h-3 w-3" /> code match
                            </span>
                          ) : mismatch ? (
                            <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-700">
                              <AlertTriangle className="h-3 w-3" /> other pack
                            </span>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-700 max-w-[200px]">
                          {s.lcLayout}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{s.formats.id_cards}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.formats.results}</td>
                        <td className="px-4 py-3 font-mono text-xs">{s.formats.board_records}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {(
                              [
                                ["certificates", s.features.certificates],
                                ["id_cards", s.features.id_cards],
                                ["results", s.features.results],
                                ["board", s.features.board_records],
                              ] as const
                            ).map(([label, on]) => (
                              <span
                                key={label}
                                className={cn(
                                  "rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                                  on
                                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                    : "bg-slate-50 text-slate-400 border border-slate-200",
                                )}
                              >
                                {label}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {s.suggestedCertificatePack}
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/admin/schools/${s.id}?tab=features`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 hover:underline"
                          >
                            Assign
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "packs" ? (
        <div className="space-y-4">
          <Card className="border-violet-100 bg-violet-50/40">
            <CardContent className="py-4 text-sm text-slate-700">
              Har pack me ye reports milte hain. LC layout pack ke hisaab se alag hai (403/404 =
              Upper Primary scan, 405 = Secondary).
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {packs.map((pack) => (
              <Card key={pack.id} className="overflow-hidden">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">{pack.label}</CardTitle>
                      <p className="text-xs font-mono text-violet-700 mt-1">
                        pack id · {pack.id}
                      </p>
                    </div>
                    <span className="text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2.5 py-1">
                      {pack.typeCount} reports
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600">{pack.description}</p>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-md bg-slate-50 border border-slate-200 px-2 py-1 font-mono">
                      packs/{pack.folder}/
                    </span>
                    {pack.schoolCode ? (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-1">
                        Prefer code {pack.schoolCode}
                      </span>
                    ) : (
                      <span className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1">
                        Shared / any school
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{pack.recommendedFor}</p>
                  <p className="text-xs font-semibold text-slate-800">
                    LC: <span className="font-normal text-slate-600">{pack.lcLayout}</span>
                  </p>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />
                      Reports in this pack
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {pack.reports.map((r) => (
                        <li
                          key={r.id}
                          className="px-3 py-2 flex items-start justify-between gap-3 text-sm"
                        >
                          <div>
                            <p className="font-medium text-slate-800">{r.labelEn}</p>
                            <p className="text-[11px] text-slate-500">{r.labelGu}</p>
                            {r.note ? (
                              <p className="text-[11px] text-violet-700 mt-0.5">{r.note}</p>
                            ) : null}
                          </div>
                          <span className="text-[10px] shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600">
                            {r.landscape ? "landscape" : "portrait"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <School className="h-3.5 w-3.5" />
                      Assigned schools ({pack.assignedCount})
                    </p>
                    {pack.assignedSchools.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        Abhi kisi school ko assign nahi.
                      </p>
                    ) : (
                      <ul className="space-y-1.5">
                        {pack.assignedSchools.map((s) => (
                          <li key={s.id}>
                            <Link
                              href={`/admin/schools/${s.id}?tab=features`}
                              className="flex items-center justify-between gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 text-sm hover:border-violet-300 hover:bg-violet-50/40"
                            >
                              <span className="font-medium text-slate-800 truncate">{s.name}</span>
                              <span className="flex items-center gap-1 text-xs text-violet-700 shrink-0">
                                {s.code}
                                <ExternalLink className="h-3 w-3" />
                              </span>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {tab === "modules" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {moduleCatalog
            .filter((m) => m.key !== "certificates")
            .map((mod) => (
              <Card key={mod.key}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{mod.label}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {mod.options.map((o) => (
                    <div
                      key={o.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                    >
                      <p className="text-sm font-semibold text-slate-900">{o.label}</p>
                      <p className="font-mono text-[11px] text-violet-700 mt-0.5">{o.id}</p>
                      {o.description ? (
                        <p className="text-xs text-slate-500 mt-1">{o.description}</p>
                      ) : null}
                      {o.recommendedSchoolCode ? (
                        <p className="text-[11px] text-emerald-700 mt-1">
                          Prefer school code {o.recommendedSchoolCode}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 mt-1">Any school</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-violet-600" />
            Naya certificate format kaise add kare
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal pl-5 space-y-2 text-sm text-slate-700">
            {howToAdd.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="text-xs text-slate-500 mt-4">
            Detail: <code className="text-[11px]">src/components/certificates/packs/README.md</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
