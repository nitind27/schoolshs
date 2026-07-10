"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/locale-provider";
import type { SchoolClass } from "@/generated/prisma/client";
import { Copy, Link2, Loader2, Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react";

interface ShareLink {
  id: string;
  slug: string;
  username: string;
  label: string | null;
  classId: string | null;
  standard: string | null;
  section: string | null;
  academicYear: string;
  expiresAt: string | null;
  isActive: boolean;
  accessCount: number;
  lastAccessAt: string | null;
  createdAt: string;
}

interface Props {
  classId: string;
  standard: string;
  section: string;
  academicYear: string;
  classes: SchoolClass[];
}

export function IdCardShareLinkManager({ classId, standard, section, academicYear, classes }: Props) {
  const t = useT();
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ label: "", username: "", password: "" });
  const [lastUrl, setLastUrl] = useState("");
  const [error, setError] = useState("");

  const loadLinks = () => {
    fetch("/api/id-cards/share-links")
      .then((r) => r.json())
      .then((d) => setLinks(d.links || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadLinks(); }, []);

  const createLink = async () => {
    setCreating(true);
    setError("");
    const res = await fetch("/api/id-cards/share-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: form.label || t("idCardShare.defaultLabel"),
        username: form.username,
        password: form.password,
        classId: classId || null,
        standard: classId ? null : standard || null,
        section: classId ? null : section || null,
        academicYear,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed");
      setCreating(false);
      return;
    }
    setLastUrl(data.shareUrl);
    setForm({ label: "", username: "", password: "" });
    setShowForm(false);
    loadLinks();
    setCreating(false);
  };

  const toggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/id-cards/share-links/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    if (!confirm(t("idCardShare.deleteConfirm"))) return;
    await fetch(`/api/id-cards/share-links/${id}`, { method: "DELETE" });
    loadLinks();
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/m/id-cards/${slug}`;
    navigator.clipboard.writeText(url);
    setLastUrl(url);
  };

  const filterLabel = (link: ShareLink) => {
    if (link.classId) {
      const c = classes.find((x) => x.id === link.classId);
      return c ? `${c.name} (${c.academicYear})` : t("idCardShare.classFilter");
    }
    const parts = [link.standard, link.section].filter(Boolean).join("-");
    return parts || t("idCardShare.allStudentsFilter");
  };

  return (
    <Card className="print:hidden border-violet-200 bg-gradient-to-br from-violet-50/50 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-5 w-5 text-violet-600" />
          {t("idCardShare.managerTitle")}
        </CardTitle>
        <p className="text-xs text-slate-500 mt-1">{t("idCardShare.managerDesc")}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showForm ? (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="border-violet-300 text-violet-700 hover:bg-violet-50">
            <Plus className="h-4 w-4" />
            {t("idCardShare.createLink")}
          </Button>
        ) : (
          <div className="rounded-xl border border-violet-200 bg-white p-4 space-y-3">
            <p className="text-sm font-semibold text-slate-800">{t("idCardShare.createLink")}</p>
            <p className="text-xs text-slate-500">
              {t("idCardShare.currentFilter")}: {classId
                ? classes.find((c) => c.id === classId)?.name || "—"
                : [standard, section].filter(Boolean).join("-") || t("idCardShare.allStudentsFilter")}
              {" · "}{academicYear}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label={t("idCardShare.linkLabel")} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder={t("idCardShare.defaultLabel")} />
              <Input label={t("idCardShare.username")} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              <Input label={t("idCardShare.password")} type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-2">
              <Button size="sm" onClick={createLink} disabled={creating || !form.username || !form.password}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("idCardShare.generateLink")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>{t("common.cancel")}</Button>
            </div>
          </div>
        )}

        {lastUrl && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm">
            <span className="flex-1 truncate font-mono text-xs text-emerald-800">{lastUrl}</span>
            <Button size="sm" variant="ghost" className="shrink-0 text-emerald-700" onClick={() => navigator.clipboard.writeText(lastUrl)}>
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin text-violet-600" /></div>
        ) : links.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">{t("idCardShare.noLinks")}</p>
        ) : (
          <div className="space-y-2">
            {links.map((link) => (
              <div key={link.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{link.label || t("idCardShare.defaultLabel")}</p>
                  <p className="text-xs text-slate-500">
                    {t("idCardShare.username")}: <span className="font-mono">{link.username}</span>
                    {" · "}{filterLabel(link)}
                    {" · "}{t("idCardShare.accessCount", { count: link.accessCount })}
                  </p>
                  {!link.isActive && <span className="text-xs font-medium text-red-600">{t("idCardShare.disabled")}</span>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button size="sm" variant="outline" onClick={() => copyUrl(link.slug)} title={t("idCardShare.copyLink")}>
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(link.id, link.isActive)}>
                    {link.isActive ? <ToggleRight className="h-4 w-4 text-emerald-600" /> : <ToggleLeft className="h-4 w-4 text-slate-400" />}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => deleteLink(link.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
