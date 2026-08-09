"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Headphones,
  ThumbsUp,
  ThumbsDown,
  Plus,
  LifeBuoy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { sanitizeHelpHref } from "@/lib/help/engine";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-client";

type HelpLang = "en" | "hi" | "gu";

type ChatMsg = {
  id: string;
  role: "user" | "bot" | "staff" | "system";
  text: string;
  title?: string;
  href?: string;
  links?: { href: string; label: string }[];
  senderName?: string | null;
  canEscalate?: boolean;
};

type Suggestion = { id: string; label: string; query: string };

function mapApiMessages(
  rows: Array<{
    id: string;
    senderRole: string;
    content: string;
    senderName?: string | null;
    meta?: Record<string, unknown> | null;
  }>,
  role: string | null,
): ChatMsg[] {
  return rows.map((m) => {
    const meta = m.meta || {};
    const href = sanitizeHelpHref(
      typeof meta.href === "string" ? meta.href : undefined,
      role,
    );
    const links = Array.isArray(meta.links)
      ? (meta.links as { href: string; label: string }[])
          .map((l) => {
            const h = sanitizeHelpHref(l.href, role);
            return h ? { href: h, label: l.label } : null;
          })
          .filter(Boolean) as { href: string; label: string }[]
      : undefined;
    return {
      id: m.id,
      role: (m.senderRole as ChatMsg["role"]) || "bot",
      text: m.content,
      title: typeof meta.title === "string" ? meta.title : undefined,
      href,
      links,
      senderName: m.senderName,
      canEscalate: Boolean(meta.canEscalate),
    };
  });
}

export function HelpChatbot() {
  const t = useT();
  const { locale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [replyLang, setReplyLang] = useState<HelpLang>(locale === "en" ? "en" : "gu");
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("bot");
  const [rated, setRated] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReplyLang(locale === "en" ? "en" : "gu");
  }, [locale]);

  const preferredLang: HelpLang = replyLang;
  const liveStaff = status === "waiting" || status === "active";

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const resetChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setInput("");
    setConversationId(null);
    setStatus("bot");
    setRated(false);
  }, []);

  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch("/api/auth/me", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!alive) return;
          const role = d.user?.role ? String(d.user.role) : null;
          setSessionRole((prev) => {
            if (prev && role && prev !== role) {
              resetChat();
              setOpen(false);
            }
            if (!role && prev) {
              resetChat();
              setOpen(false);
            }
            return role;
          });
        })
        .catch(() => {
          if (alive) setSessionRole(null);
        });
    };
    load();
    const onAuth = () => load();
    window.addEventListener(AUTH_CHANGED_EVENT, onAuth);
    return () => {
      alive = false;
      window.removeEventListener(AUTH_CHANGED_EVENT, onAuth);
    };
  }, [pathname, resetChat]);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/help/chat?lang=${preferredLang}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.role && sessionRole && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
      if (data.conversationId) setConversationId(data.conversationId);
      if (data.status) setStatus(data.status);
      if (data.rating) setRated(true);
      setSuggestions(data.suggestions || []);
      if (Array.isArray(data.messages) && data.messages.length) {
        setMessages(mapApiMessages(data.messages, data.role || sessionRole));
      } else {
        setMessages([
          {
            id: "welcome",
            role: "bot",
            text: data.text,
            title: data.title,
            href: sanitizeHelpHref(data.href, data.role || sessionRole),
          },
        ]);
      }
    } catch {
      /* ignore */
    }
  }, [preferredLang, sessionRole, resetChat]);

  useEffect(() => {
    if (open && messages.length === 0) void bootstrap();
  }, [open, messages.length, bootstrap]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 180);
      scrollBottom();
    }
  }, [open, messages, loading]);

  // Poll when waiting for staff
  useEffect(() => {
    if (!open || !conversationId || !liveStaff) return;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/help/chat?conversationId=${conversationId}&lang=${preferredLang}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data.status) setStatus(data.status);
        if (Array.isArray(data.messages)) {
          setMessages(mapApiMessages(data.messages, data.role || sessionRole));
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(tick, 6000);
    return () => window.clearInterval(id);
  }, [open, conversationId, liveStaff, preferredLang, sessionRole]);

  if (
    pathname === "/login" ||
    pathname === "/" ||
    pathname === "/chat" ||
    pathname === "/help-desk" ||
    pathname.startsWith("/help-desk/") ||
    pathname === "/letterhead" ||
    pathname.startsWith("/m/")
  ) {
    return null;
  }

  const pushBotFromReply = (data: Record<string, unknown>) => {
    const role = String(data.role || sessionRole || "");
    if (data.conversationId) setConversationId(String(data.conversationId));
    if (typeof data.status === "string") setStatus(data.status);
    if (data.lang === "en" || data.lang === "hi" || data.lang === "gu") {
      setReplyLang(data.lang);
    }
    setSuggestions((data.suggestions as Suggestion[]) || []);
    const links = Array.isArray(data.links)
      ? (data.links as { href: string; label: string }[])
          .map((l) => {
            const h = sanitizeHelpHref(l.href, role);
            return h ? { href: h, label: l.label } : null;
          })
          .filter(Boolean) as { href: string; label: string }[]
      : undefined;
    setMessages((prev) => [
      ...prev,
      {
        id: `b-${Date.now()}`,
        role: data.escalated || data.waitingForStaff ? "system" : "bot",
        text: String(data.text || ""),
        title: typeof data.title === "string" ? data.title : undefined,
        href: sanitizeHelpHref(
          typeof data.href === "string" ? data.href : undefined,
          role,
        ),
        links,
        canEscalate: Boolean(data.canEscalate),
      },
    ]);
  };

  const ask = async (raw: string) => {
    const message = raw.trim();
    if (!message || loading) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: "user", text: message },
    ]);
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          lang: preferredLang,
          conversationId,
        }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { id: `e-${Date.now()}`, role: "bot", text: data.error || t("helpBot.error") },
        ]);
        return;
      }
      if (sessionRole && data.role && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
      pushBotFromReply(data);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "bot", text: t("helpBot.error") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const escalate = async () => {
    if (loading || liveStaff) return;
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "escalate",
          lang: preferredLang,
          conversationId,
          subject: t("helpBot.escalateSubject"),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "system",
            text: data.error || t("helpBot.error"),
          },
        ]);
        return;
      }
      pushBotFromReply(data);
    } finally {
      setLoading(false);
    }
  };

  const sendFeedback = async (up: boolean) => {
    if (!conversationId || rated) return;
    setRated(true);
    await fetch("/api/help/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "feedback",
        conversationId,
        rating: up ? 5 : 2,
      }),
    }).catch(() => null);
  };

  const startNew = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "new",
          lang: preferredLang,
          conversationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) return;
      resetChat();
      setConversationId(data.conversationId || null);
      setStatus(data.status || "bot");
      setSuggestions(data.suggestions || []);
      setMessages([
        {
          id: "welcome",
          role: "bot",
          text: data.text,
          title: data.title,
          href: sanitizeHelpHref(data.href, data.role || sessionRole),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const showStaffLink =
    sessionRole === "school_admin" || sessionRole === "clerk";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "help-side-tab fixed right-0 top-1/2 z-[90] -translate-y-1/2 touch-manipulation",
          "flex min-h-[5.5rem] min-w-[2.25rem] flex-col items-center justify-center",
          "rounded-l-md border border-r-0 border-neutral-700 bg-neutral-900",
          "px-2 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
          "max-sm:bottom-4 max-sm:right-4 max-sm:top-auto max-sm:min-h-11 max-sm:min-w-11 max-sm:translate-y-0",
          "max-sm:rounded-full max-sm:border-r max-sm:px-2 max-sm:py-2",
          "transition-colors duration-200 hover:bg-black active:bg-neutral-950",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
          open && "pointer-events-none translate-x-full opacity-0",
        )}
        aria-label={t("helpBot.open")}
        title={t("helpBot.open")}
      >
        <span
          className="select-none font-bold uppercase text-amber-400 max-sm:hidden"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            letterSpacing: "0.2em",
            fontSize: "11px",
          }}
        >
          HELP
        </span>
        <span className="hidden select-none text-lg font-bold leading-none text-amber-400 max-sm:inline">
          ?
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[95] flex w-[min(100vw-1.25rem,420px)] flex-col overflow-hidden",
            "h-[min(82dvh,680px)] rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20",
            "help-bot-panel",
          )}
          role="dialog"
          aria-label={t("helpBot.title")}
        >
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-900 to-sky-800 px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  {liveStaff ? (
                    <Headphones className="h-5 w-5" />
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">{t("helpBot.title")}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-cyan-100/90">
                    <Sparkles className="h-3 w-3" />
                    {liveStaff
                      ? t("helpBot.liveStaffMode")
                      : t("helpBot.advancedMode")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void startNew()}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                  title={t("helpBot.newChat")}
                  aria-label={t("helpBot.newChat")}
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                  aria-label={t("common.cancel")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative mt-3 flex gap-1 rounded-xl bg-black/20 p-1">
              {(["en", "hi", "gu"] as HelpLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setReplyLang(l);
                    resetChat();
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors",
                    preferredLang === l
                      ? "bg-white text-slate-900 shadow"
                      : "text-white/75 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {l === "en" ? "English" : l === "hi" ? "हिंदी" : "ગુજરાતી"}
                </button>
              ))}
            </div>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-3 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "flex",
                  m.role === "user" || m.role === "staff"
                    ? "justify-end"
                    : "justify-start",
                  m.role === "system" && "justify-center",
                )}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                    m.role === "user" && "rounded-br-md bg-cyan-700 text-white",
                    m.role === "staff" &&
                      "rounded-br-md border border-emerald-200 bg-emerald-50 text-emerald-950",
                    m.role === "bot" &&
                      "rounded-bl-md border border-slate-200/80 bg-white text-slate-700",
                    m.role === "system" &&
                      "max-w-full border border-dashed border-slate-300 bg-transparent text-center text-xs text-slate-500 shadow-none",
                  )}
                >
                  {m.role === "staff" && (
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                      {m.senderName || t("helpBot.staffLabel")}
                    </p>
                  )}
                  {m.role === "bot" && m.title && (
                    <p className="mb-1 text-xs font-bold text-cyan-800">{m.title}</p>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.role === "bot" && (m.href || (m.links && m.links.length > 0)) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.href && (
                        <Link
                          href={m.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2 py-1 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-200"
                          onClick={() => setOpen(false)}
                        >
                          <ExternalLink className="h-3 w-3" />
                          {t("helpBot.openPage")}
                        </Link>
                      )}
                      {m.links?.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200"
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.canEscalate && !liveStaff && (
                    <button
                      type="button"
                      onClick={() => void escalate()}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-amber-200"
                    >
                      <LifeBuoy className="h-3 w-3" />
                      {t("helpBot.talkToStaff")}
                    </button>
                  )}
                  {m.role === "bot" &&
                    !liveStaff &&
                    m.id === messages[messages.length - 1]?.id && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            void ask(
                              preferredLang === "gu"
                                ? "મને સમજાયું નહીં, વધુ સરળ રીતે સમજાવો"
                                : preferredLang === "hi"
                                  ? "मुझे समझ नहीं आया, और आसान भाषा में समझाओ"
                                  : "I don’t understand, explain more simply",
                            )
                          }
                          className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          {t("helpBot.dontUnderstand")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void ask(
                              preferredLang === "gu"
                                ? "પગલાંવાર કેવી રીતે કરું?"
                                : preferredLang === "hi"
                                  ? "चरण-दर-चरण कैसे करें?"
                                  : "Show me step by step",
                            )
                          }
                          className="rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 ring-1 ring-slate-200"
                        >
                          {t("helpBot.showSteps")}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void ask(
                              preferredLang === "gu"
                                ? "આ કામ નથી થતું, સમસ્યા તપાસો"
                                : preferredLang === "hi"
                                  ? "यह काम नहीं हो रहा, समस्या जाँचो"
                                  : "This is not working, please troubleshoot",
                            )
                          }
                          className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900 ring-1 ring-amber-200"
                        >
                          {t("helpBot.notWorking")}
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
          </div>

          {!liveStaff && suggestions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
              {suggestions.slice(0, 6).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void ask(s.query)}
                  className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-900"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-white px-3 py-1.5">
            <div className="flex items-center gap-1">
              {!rated && messages.length > 2 && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600"
                    title={t("helpBot.feedbackUp")}
                    onClick={() => void sendFeedback(true)}
                  >
                    <ThumbsUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    title={t("helpBot.feedbackDown")}
                    onClick={() => void sendFeedback(false)}
                  >
                    <ThumbsDown className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {!liveStaff && (
                <button
                  type="button"
                  onClick={() => void escalate()}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-amber-800 hover:bg-amber-50"
                >
                  <Headphones className="h-3.5 w-3.5" />
                  {t("helpBot.talkToStaff")}
                </button>
              )}
            </div>
            {showStaffLink && (
              <Link
                href="/help-desk"
                className="text-[11px] font-bold text-cyan-800 hover:underline"
                onClick={() => setOpen(false)}
              >
                {t("helpBot.openDesk")}
              </Link>
            )}
          </div>

          <form
            className="flex items-center gap-2 border-t border-slate-200 bg-white p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                liveStaff
                  ? t("helpBot.placeholderStaff")
                  : t("helpBot.placeholder")
              }
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
              disabled={loading}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-700 text-white disabled:opacity-40"
              aria-label={t("helpBot.send")}
            >
              {loading ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
