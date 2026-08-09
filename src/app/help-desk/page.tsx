"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Headphones,
  MessageSquare,
  RefreshCw,
  Send,
  UserCheck,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { PageLoader, Spinner } from "@/components/ui/loader";
import { useT } from "@/i18n/locale-provider";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/toast";

type ConvRow = {
  id: string;
  status: string;
  role: string;
  lang: string;
  subject: string | null;
  rating: number | null;
  updatedAt: string;
  user: { id: string; name: string; email: string; role: string };
  assignedTo: { id: string; name: string } | null;
  messageCount: number;
  lastMessage: {
    content: string;
    senderRole: string;
    createdAt: string;
  } | null;
};

type Msg = {
  id: string;
  senderRole: string;
  content: string;
  createdAt: string;
  senderName?: string | null;
};

export default function HelpDeskPage() {
  const t = useT();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConvRow[]>([]);
  const [waitingCount, setWaitingCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState("waiting");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [selectedMeta, setSelectedMeta] = useState<ConvRow | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/help/desk?status=${encodeURIComponent(statusFilter)}`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setRows(data.conversations || []);
      setWaitingCount(data.waitingCount || 0);
      const urlId =
        typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("id")
          : null;
      if (urlId && !selectedId) setSelectedId(urlId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("helpDesk.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedId, t]);

  const loadDetail = useCallback(
    async (id: string) => {
      setDetailLoading(true);
      try {
        const res = await fetch(`/api/help/desk/${id}`, { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed");
        setMessages(data.messages || []);
        const c = data.conversation;
        setSelectedMeta({
          id: c.id,
          status: c.status,
          role: c.role,
          lang: c.lang,
          subject: c.subject,
          rating: c.rating,
          updatedAt: c.updatedAt,
          user: c.user,
          assignedTo: c.assignedTo,
          messageCount: (data.messages || []).length,
          lastMessage: null,
        });
        requestAnimationFrame(() => {
          if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
          }
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : t("helpDesk.loadFailed"));
      } finally {
        setDetailLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (selectedId) void loadDetail(selectedId);
  }, [selectedId, loadDetail]);

  // Poll open thread for new user messages
  useEffect(() => {
    if (!selectedId) return;
    const id = window.setInterval(() => void loadDetail(selectedId), 8000);
    return () => window.clearInterval(id);
  }, [selectedId, loadDetail]);

  const postAction = async (action: string, message?: string) => {
    if (!selectedId) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/help/desk/${selectedId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (action === "reply") setReply("");
      await loadDetail(selectedId);
      await loadList();
      toast.push({
        title:
          action === "reply"
            ? t("helpDesk.replySent")
            : action === "claim"
              ? t("helpDesk.claimed")
              : action === "close"
                ? t("helpDesk.closed")
                : t("helpDesk.reopened"),
        variant: "success",
        duration: 2500,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("helpDesk.saveFailed"));
    } finally {
      setBusy(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      waiting: "bg-amber-100 text-amber-900 border-amber-200",
      active: "bg-emerald-100 text-emerald-900 border-emerald-200",
      bot: "bg-sky-100 text-sky-900 border-sky-200",
      closed: "bg-slate-100 text-slate-600 border-slate-200",
    };
    return map[status] || map.bot;
  };

  return (
    <PageShell
      title={t("helpDesk.title")}
      subtitle={t("helpDesk.subtitle")}
      icon={<Headphones className="h-5 w-5" />}
      breadcrumbs={[
        { label: t("nav.dashboard"), href: "/dashboard" },
        { label: t("helpDesk.title") },
      ]}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {waitingCount > 0 ? (
            <span className="inline-flex items-center rounded-full bg-amber-500 px-2.5 py-1 text-xs font-bold text-white">
              {t("helpDesk.waitingBadge", { count: waitingCount })}
            </span>
          ) : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadList()}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t("common.refresh")}
          </Button>
        </div>
      }
    >
      <div className="help-desk">
        <div className="help-desk__filters">
          {(["waiting", "active", "all", "closed"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className={cn(
                "help-desk__chip",
                statusFilter === s && "is-active",
              )}
              onClick={() => setStatusFilter(s)}
            >
              {t(`helpDesk.filter_${s}`)}
            </button>
          ))}
        </div>

        <div className="help-desk__layout">
          <aside className="help-desk__list">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : rows.length === 0 ? (
              <p className="help-desk__empty">{t("helpDesk.empty")}</p>
            ) : (
              rows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={cn(
                    "help-desk__item",
                    selectedId === row.id && "is-selected",
                  )}
                  onClick={() => setSelectedId(row.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <strong className="truncate">{row.user.name}</strong>
                    <span
                      className={cn(
                        "rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase",
                        statusBadge(row.status),
                      )}
                    >
                      {row.status}
                    </span>
                  </div>
                  <p className="truncate text-xs text-slate-500">
                    {row.subject || row.lastMessage?.content || "—"}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {row.role} · {row.messageCount} msg
                    {row.assignedTo ? ` · ${row.assignedTo.name}` : ""}
                  </p>
                </button>
              ))
            )}
          </aside>

          <section className="help-desk__thread">
            {!selectedId ? (
              <div className="help-desk__placeholder">
                <MessageSquare className="h-10 w-10 opacity-30" />
                <p>{t("helpDesk.pickThread")}</p>
              </div>
            ) : detailLoading && !messages.length ? (
              <div className="flex flex-1 items-center justify-center">
                <PageLoader card />
              </div>
            ) : (
              <>
                <header className="help-desk__thread-head">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-bold">
                      {selectedMeta?.user.name}
                    </h2>
                    <p className="truncate text-xs text-slate-500">
                      {selectedMeta?.user.email} · {selectedMeta?.role} ·{" "}
                      {selectedMeta?.lang?.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedMeta?.status !== "closed" ? (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void postAction("claim")}
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          {t("helpDesk.claim")}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => void postAction("close")}
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          {t("helpDesk.close")}
                        </Button>
                      </>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        onClick={() => void postAction("reopen")}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        {t("helpDesk.reopen")}
                      </Button>
                    )}
                  </div>
                </header>

                <div ref={listRef} className="help-desk__messages">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "help-desk__bubble",
                        m.senderRole === "user" && "is-user",
                        m.senderRole === "staff" && "is-staff",
                        m.senderRole === "bot" && "is-bot",
                        m.senderRole === "system" && "is-system",
                      )}
                    >
                      <span className="help-desk__who">
                        {m.senderRole === "staff"
                          ? m.senderName || "Staff"
                          : m.senderRole}
                      </span>
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    </div>
                  ))}
                </div>

                {selectedMeta?.status !== "closed" ? (
                  <form
                    className="help-desk__composer"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!reply.trim()) return;
                      void postAction("reply", reply.trim());
                    }}
                  >
                    <textarea
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      placeholder={t("helpDesk.replyPlaceholder")}
                      rows={2}
                      disabled={busy}
                    />
                    <Button type="submit" disabled={busy || !reply.trim()}>
                      {busy ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
                      {t("helpDesk.sendReply")}
                    </Button>
                  </form>
                ) : (
                  <p className="help-desk__closed-note">{t("helpDesk.closedNote")}</p>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <style jsx global>{`
        .help-desk {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .help-desk__filters {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .help-desk__chip {
          height: 2rem;
          padding: 0 0.8rem;
          border-radius: 999px;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
        }
        .help-desk__chip.is-active {
          background: #0c1929;
          border-color: #0c1929;
          color: #fff;
        }
        .help-desk__layout {
          display: grid;
          gap: 0.75rem;
          min-height: min(70vh, 640px);
        }
        @media (min-width: 900px) {
          .help-desk__layout {
            grid-template-columns: minmax(16rem, 22rem) minmax(0, 1fr);
          }
        }
        .help-desk__list {
          overflow: auto;
          max-height: min(70vh, 640px);
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          background: #fff;
        }
        .help-desk__item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 0.85rem 1rem;
          border: 0;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
          cursor: pointer;
        }
        .help-desk__item:hover {
          background: #f8fafc;
        }
        .help-desk__item.is-selected {
          background: #ecfeff;
          box-shadow: inset 3px 0 0 #0d7377;
        }
        .help-desk__empty,
        .help-desk__placeholder {
          padding: 2rem 1rem;
          text-align: center;
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .help-desk__placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
          min-height: 20rem;
        }
        .help-desk__thread {
          display: flex;
          flex-direction: column;
          min-height: min(70vh, 640px);
          border: 1px solid #e2e8f0;
          border-radius: 1rem;
          background: #fff;
          overflow: hidden;
        }
        .help-desk__thread-head {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          padding: 0.85rem 1rem;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
        }
        .help-desk__messages {
          flex: 1;
          overflow: auto;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          background: #f8fafc;
        }
        .help-desk__bubble {
          max-width: min(92%, 34rem);
          padding: 0.65rem 0.85rem;
          border-radius: 0.9rem;
          border: 1px solid #e2e8f0;
          background: #fff;
          font-size: 0.85rem;
          line-height: 1.45;
        }
        .help-desk__bubble.is-user {
          align-self: flex-start;
          border-color: #bae6fd;
          background: #f0f9ff;
        }
        .help-desk__bubble.is-staff {
          align-self: flex-end;
          border-color: #99f6e4;
          background: #f0fdfa;
        }
        .help-desk__bubble.is-bot {
          align-self: flex-start;
          background: #fff;
        }
        .help-desk__bubble.is-system {
          align-self: center;
          max-width: 100%;
          background: transparent;
          border-style: dashed;
          color: #64748b;
          font-size: 0.78rem;
          text-align: center;
        }
        .help-desk__who {
          display: block;
          margin-bottom: 0.2rem;
          font-size: 0.65rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }
        .help-desk__composer {
          display: grid;
          gap: 0.55rem;
          padding: 0.85rem;
          border-top: 1px solid #e2e8f0;
          background: #fff;
        }
        @media (min-width: 640px) {
          .help-desk__composer {
            grid-template-columns: 1fr auto;
            align-items: end;
          }
        }
        .help-desk__composer textarea {
          width: 100%;
          resize: vertical;
          min-height: 2.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 0.75rem;
          padding: 0.65rem 0.75rem;
          font-size: 0.9rem;
        }
        .help-desk__closed-note {
          margin: 0;
          padding: 0.85rem 1rem;
          border-top: 1px solid #e2e8f0;
          font-size: 0.8rem;
          color: #64748b;
          text-align: center;
        }
      `}</style>
    </PageShell>
  );
}
