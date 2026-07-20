"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Headphones,
  Mail,
  Phone,
  School,
  Trash2,
  CheckCircle2,
  Eye,
  Inbox,
} from "lucide-react";

type MsgStatus = "new" | "read" | "resolved";

interface SupportMsg {
  id: string;
  createdAt: string;
  name: string;
  email: string;
  phone?: string | null;
  schoolCode?: string | null;
  subject: string;
  message: string;
  status: MsgStatus;
  adminNote?: string | null;
}

const STATUS_STYLE: Record<MsgStatus, string> = {
  new: "bg-amber-100 text-amber-800 border-amber-200",
  read: "bg-sky-100 text-sky-800 border-sky-200",
  resolved: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export default function AdminContactSupportPage() {
  const [messages, setMessages] = useState<SupportMsg[]>([]);
  const [counts, setCounts] = useState({ new: 0, read: 0, resolved: 0, total: 0 });
  const [filter, setFilter] = useState<MsgStatus | "all">("all");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<SupportMsg | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = filter === "all" ? "" : `?status=${filter}`;
    const res = await fetch(`/api/admin/contact-support${q}`);
    const data = await res.json();
    setMessages(data.messages || []);
    setCounts(data.counts || { new: 0, read: 0, resolved: 0, total: 0 });
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (selected) setNote(selected.adminNote || "");
  }, [selected]);

  async function updateStatus(id: string, status: MsgStatus) {
    setBusy(true);
    await fetch("/api/admin/contact-support", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, adminNote: note }),
    });
    setBusy(false);
    await load();
    setSelected((prev) => (prev && prev.id === id ? { ...prev, status, adminNote: note } : prev));
  }

  async function remove(id: string) {
    if (!confirm("Delete this support message?")) return;
    setBusy(true);
    await fetch(`/api/admin/contact-support?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setBusy(false);
    if (selected?.id === id) setSelected(null);
    await load();
  }

  async function openMsg(m: SupportMsg) {
    setSelected(m);
    if (m.status === "new") {
      await fetch("/api/admin/contact-support", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: m.id, status: "read" }),
      });
      setSelected({ ...m, status: "read" });
      load();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contact Support</h1>
        <p className="text-sm text-slate-500">Messages submitted from the public website contact form</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total"
          value={counts.total}
          icon={<Inbox className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-slate-700 to-slate-900"
        />
        <StatCard
          label="New"
          value={counts.new}
          icon={<Headphones className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          label="Read"
          value={counts.read}
          icon={<Eye className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
        />
        <StatCard
          label="Resolved"
          value={counts.resolved}
          icon={<CheckCircle2 className="h-5 w-5 text-white" />}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "new", "read", "resolved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-semibold capitalize ${
              filter === f
                ? "border-violet-300 bg-violet-50 text-violet-800"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Inbox ({messages.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-violet-200 border-t-violet-600" />
              </div>
            ) : messages.length === 0 ? (
              <p className="px-5 py-12 text-center text-sm text-slate-500">No messages yet</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {messages.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMsg(m)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        selected?.id === m.id ? "bg-violet-50/70" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{m.subject}</p>
                          <p className="mt-0.5 truncate text-sm text-slate-600">
                            {m.name} · {m.email}
                          </p>
                          <p className="mt-1 text-xs text-slate-400">
                            {new Date(m.createdAt).toLocaleString("en-IN")}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${STATUS_STYLE[m.status]}`}
                        >
                          {m.status}
                        </span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{selected ? "Message detail" : "Select a message"}</CardTitle>
          </CardHeader>
          <CardContent>
            {!selected ? (
              <p className="py-10 text-center text-sm text-slate-500">
                Choose a message from the inbox to view and update status
              </p>
            ) : (
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{selected.subject}</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {new Date(selected.createdAt).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Name</p>
                    <p className="font-semibold text-slate-900">{selected.name}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" /> Email
                    </p>
                    <a href={`mailto:${selected.email}`} className="font-semibold text-violet-700 hover:underline">
                      {selected.email}
                    </a>
                  </div>
                  {selected.phone && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                        <Phone className="h-3 w-3" /> Phone
                      </p>
                      <a href={`tel:${selected.phone}`} className="font-semibold text-slate-900">
                        {selected.phone}
                      </a>
                    </div>
                  )}
                  {selected.schoolCode && (
                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 flex items-center gap-1">
                        <School className="h-3 w-3" /> School code
                      </p>
                      <p className="font-semibold text-slate-900">{selected.schoolCode}</p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Message</p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                    {selected.message}
                  </p>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Admin note
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
                    placeholder="Internal note…"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => updateStatus(selected.id, "read")}
                    className="bg-sky-600 hover:bg-sky-700"
                  >
                    Mark read
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    onClick={() => updateStatus(selected.id, "resolved")}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Resolve
                  </Button>
                  <Button
                    type="button"
                    disabled={busy}
                    variant="outline"
                    onClick={() => remove(selected.id)}
                    className="border-red-200 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
