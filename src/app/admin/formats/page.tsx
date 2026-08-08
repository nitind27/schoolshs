"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageLoader } from "@/components/ui/loader";
import { FolderKanban, School, FileText, RefreshCw, ExternalLink } from "lucide-react";

type AssignedSchool = {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
};

type PackRow = {
  id: string;
  label: string;
  description: string;
  schoolCode: string | null;
  folder: string;
  typeCount: number;
  assignedCount: number;
  assignedSchools: AssignedSchool[];
};

export default function AdminFormatsPage() {
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [howToAdd, setHowToAdd] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetch("/api/admin/formats", { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Failed to load formats");
        setPacks(d.packs || []);
        setHowToAdd(d.howToAdd || []);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <PageLoader label="Loading formats…" />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Super Admin
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-violet-600" />
            Certificate formats
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Har school ka certificate layout alag ho sakta hai. Pack folder school code se banta hai —
            yahan se dekho kaunsa pack kis school ko assigned hai, aur Panel Access se assign karo.
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {packs.map((pack) => (
          <Card key={pack.id} className="overflow-hidden">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-lg">{pack.label}</CardTitle>
                  <p className="text-xs font-mono text-violet-700 mt-1">
                    format id · {pack.id}
                  </p>
                </div>
                <span className="text-[11px] font-semibold rounded-full bg-slate-100 text-slate-700 px-2.5 py-1">
                  {pack.typeCount} certificates
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
                    School code {pack.schoolCode}
                  </span>
                ) : (
                  <span className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1">
                    Shared pack
                  </span>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <School className="h-3.5 w-3.5" />
                  Assigned schools ({pack.assignedCount})
                </p>
                {pack.assignedSchools.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Abhi kisi school ko assign nahi — school → Panel Access se set karo.
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
