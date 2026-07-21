"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatINR, StatusBadge } from "@/components/admin/admin-ui";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { InfoModal } from "@/components/ui/info-modal";
import {
  School,
  Plus,
  Search,
  MapPin,
  Users,
  GraduationCap,
  ExternalLink,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
} from "lucide-react";

interface SchoolRow {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  taluka?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive: boolean;
  _count: { students: number; users: number; classes: number };
  subscription?: {
    planName: string;
    paymentStatus: string;
    totalAmount?: string | null;
    paidAmount?: string | null;
  } | null;
  settings?: { logoPath?: string | null } | null;
}

export default function SchoolsListPage() {
  const [schools, setSchools] = useState<SchoolRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<SchoolRow | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SchoolRow | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/schools")
      .then((r) => r.json())
      .then((d) => setSchools(d.schools || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (filter === "active" && !s.isActive) return false;
      if (filter === "inactive" && s.isActive) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.district?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
      );
    });
  }, [schools, search, filter]);

  const toggleActive = async (school: SchoolRow) => {
    setBusyId(school.id);
    setConfirmToggle(null);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !school.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Failed to update status");
        return;
      }
      setSchools((list) =>
        list.map((s) => (s.id === school.id ? { ...s, isActive: !school.isActive } : s)),
      );
      setMsg(school.isActive ? `${school.name} deactivated.` : `${school.name} activated.`);
    } finally {
      setBusyId(null);
    }
  };

  const deleteSchool = async (school: SchoolRow) => {
    setBusyId(school.id);
    try {
      const res = await fetch(`/api/admin/schools/${school.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setConfirmDelete(null);
        setErr(data.error || "Failed to delete school");
        return;
      }
      setConfirmDelete(null);
      setSchools((list) => list.filter((s) => s.id !== school.id));
      setMsg(`${school.name} deleted.`);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Schools</h1>
          <p className="text-sm text-slate-500">{schools.length} schools registered on platform</p>
        </div>
        <Link href="/admin/schools/new">
          <Button className="bg-violet-600 hover:bg-violet-700">
            <Plus className="h-4 w-4" /> Register School
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400"
              placeholder="Search by name, code, district, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold capitalize border transition-colors ${
                  filter === f
                    ? "bg-violet-600 text-white border-violet-600"
                    : "bg-white text-slate-600 border-slate-200 hover:border-violet-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-violet-200 border-t-violet-600" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            <School className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p>No schools found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow border-slate-200 overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-start gap-3">
                  {s.settings?.logoPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/uploads/${s.settings.logoPath}`}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover border border-slate-200"
                    />
                  ) : (
                    <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center">
                      <School className="h-6 w-6 text-violet-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-base truncate">{s.name}</CardTitle>
                        <p className="font-mono text-xs text-violet-600 font-bold mt-0.5">{s.code}</p>
                      </div>
                      <StatusBadge active={s.isActive} />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                  {(s.district || s.taluka) && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {[s.taluka, s.district].filter(Boolean).join(", ")}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <GraduationCap className="h-3 w-3" /> {s._count.students} students
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {s._count.users} admins
                  </span>
                </div>
                {s.subscription && (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium capitalize">
                      {s.subscription.planName}
                    </span>
                    <StatusBadge status={s.subscription.paymentStatus} />
                    {s.subscription.totalAmount && (
                      <span className="text-slate-500">
                        {formatINR(s.subscription.paidAmount)} / {formatINR(s.subscription.totalAmount)}
                      </span>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <Link href={`/admin/schools/${s.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </Button>
                  </Link>
                  <Link href={`/admin/schools/${s.id}?tab=edit`}>
                    <Button variant="outline" size="sm" className="w-full">
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    disabled={busyId === s.id}
                    onClick={() => {
                      if (s.isActive) setConfirmToggle(s);
                      else void toggleActive(s);
                    }}
                  >
                    {busyId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : s.isActive ? (
                      <>
                        <ToggleRight className="h-3.5 w-3.5 text-emerald-600" /> Off
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="h-3.5 w-3.5" /> On
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-red-600 border-red-200 hover:bg-red-50"
                    disabled={busyId === s.id}
                    onClick={() => setConfirmDelete(s)}
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={!!confirmToggle}
        onClose={() => setConfirmToggle(null)}
        onConfirm={() => {
          if (confirmToggle) void toggleActive(confirmToggle);
        }}
        title="Deactivate school?"
        message={
          confirmToggle
            ? `${confirmToggle.name} (${confirmToggle.code}) will be deactivated. Staff cannot sign in until activated again.`
            : ""
        }
        confirmLabel="Deactivate"
        variant="warning"
        loading={!!busyId}
      />

      <ConfirmModal
        isOpen={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          if (confirmDelete) void deleteSchool(confirmDelete);
        }}
        title="Delete school permanently?"
        message={
          confirmDelete
            ? `This permanently deletes ${confirmDelete.name} (${confirmDelete.code}) and all related school data. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete forever"
        variant="destructive"
        loading={!!busyId}
      />

      <InfoModal isOpen={!!msg} onClose={() => setMsg(null)} title="Done">
        <p className="text-sm text-slate-600">{msg}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setMsg(null)}>OK</Button>
        </div>
      </InfoModal>

      <InfoModal isOpen={!!err} onClose={() => setErr(null)} title="Error">
        <p className="text-sm text-slate-600">{err}</p>
        <div className="mt-5 flex justify-end">
          <Button onClick={() => setErr(null)}>OK</Button>
        </div>
      </InfoModal>
    </div>
  );
}
