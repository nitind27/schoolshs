"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, X, Send, ExternalLink, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { sanitizeHelpHref } from "@/lib/help/engine";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-client";

type HelpLang = "en" | "hi" | "gu";

type ChatMsg = {
  id: string;
  role: "user" | "bot";
  text: string;
  title?: string;
  href?: string;
  links?: { href: string; label: string }[];
};

type Suggestion = { id: string; label: string; query: string };

function mapApiMessages(
  rows: Array<{
    id: string;
    senderRole: string;
    content: string;
    meta?: Record<string, unknown> | null;
  }>,
  role: string | null,
): ChatMsg[] {
  return rows
    .filter((m) => m.senderRole === "user" || m.senderRole === "bot")
    .map((m) => {
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
        role: m.senderRole === "user" ? "user" : "bot",
        text: m.content,
        title: typeof meta.title === "string" ? meta.title : undefined,
        href,
        links,
      };
    });
}

/** Simple system help guide — auto answers only (not a staff chat app). */
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
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setReplyLang(locale === "en" ? "en" : "gu");
  }, [locale]);

  const preferredLang: HelpLang = replyLang;

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const resetPanel = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setInput("");
    setConversationId(null);
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
            if ((prev && role && prev !== role) || (!role && prev)) {
              resetPanel();
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
  }, [pathname, resetPanel]);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/help/chat?lang=${preferredLang}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.role && sessionRole && data.role !== sessionRole) {
        resetPanel();
        return;
      }
      if (data.role) setSessionRole(data.role);
      if (data.conversationId) setConversationId(data.conversationId);
      setSuggestions(data.suggestions || []);
      if (Array.isArray(data.messages) && data.messages.length) {
        setMessages(mapApiMessages(data.messages, data.role || sessionRole));
      } else if (data.text) {
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
  }, [preferredLang, sessionRole, resetPanel]);

  useEffect(() => {
    if (open && messages.length === 0) void bootstrap();
  }, [open, messages.length, bootstrap]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 180);
      scrollBottom();
    }
  }, [open, messages, loading]);

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
        resetPanel();
        return;
      }
      if (data.role) setSessionRole(data.role);
      if (data.conversationId) setConversationId(String(data.conversationId));
      if (data.lang === "en" || data.lang === "hi" || data.lang === "gu") {
        setReplyLang(data.lang);
      }
      setSuggestions((data.suggestions as Suggestion[]) || []);
      const role = String(data.role || sessionRole || "");
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
          role: "bot",
          text: String(data.text || ""),
          title: typeof data.title === "string" ? data.title : undefined,
          href: sanitizeHelpHref(
            typeof data.href === "string" ? data.href : undefined,
            role,
          ),
          links,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: `e-${Date.now()}`, role: "bot", text: t("helpBot.error") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearAsk = async () => {
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
      resetPanel();
      setConversationId(data.conversationId || null);
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

  const lastBotId = [...messages].reverse().find((m) => m.role === "bot")?.id;

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
            "fixed bottom-5 right-5 z-[95] flex w-[min(100vw-1.25rem,400px)] flex-col overflow-hidden",
            "h-[min(78dvh,620px)] rounded-xl border border-slate-200 bg-white shadow-xl",
            "help-bot-panel",
          )}
          role="dialog"
          aria-label={t("helpBot.title")}
        >
          <header className="shrink-0 border-b border-slate-200 bg-slate-900 px-4 py-3 text-white">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10">
                  <Bot className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold leading-tight">{t("helpBot.title")}</p>
                  <p className="mt-0.5 text-[11px] text-slate-300">{t("helpBot.subtitle")}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void clearAsk()}
                  className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  title={t("helpBot.newChat")}
                  aria-label={t("helpBot.newChat")}
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
                  aria-label={t("common.cancel")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mt-2.5 flex gap-1 rounded-lg bg-black/25 p-1">
              {(["en", "hi", "gu"] as HelpLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setReplyLang(l);
                    resetPanel();
                  }}
                  className={cn(
                    "flex-1 rounded-md py-1 text-[11px] font-semibold transition-colors",
                    preferredLang === l
                      ? "bg-white text-slate-900"
                      : "text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {l === "en" ? "EN" : l === "hi" ? "हिंदी" : "ગુજ"}
                </button>
              ))}
            </div>
          </header>

          <div
            ref={listRef}
            className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-slate-50 px-3 py-3"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                    m.role === "user" && "bg-slate-800 text-white",
                    m.role === "bot" &&
                      "border border-slate-200 bg-white text-slate-700",
                  )}
                >
                  {m.role === "bot" && m.title && (
                    <p className="mb-1 text-xs font-semibold text-slate-900">{m.title}</p>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.role === "bot" && (m.href || (m.links && m.links.length > 0)) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.href && (
                        <Link
                          href={m.href}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-800"
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
                          className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700"
                          onClick={() => setOpen(false)}
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                  {m.role === "bot" && m.id === lastBotId && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          void ask(
                            preferredLang === "gu"
                              ? "વધુ સરળ રીતે સમજાવો"
                              : preferredLang === "hi"
                                ? "और आसान भाषा में समझाओ"
                                : "Explain more simply",
                          )
                        }
                        className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
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
                                : "Show steps",
                          )
                        }
                        className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200"
                      >
                        {t("helpBot.showSteps")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <Spinner size="sm" />
                </div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="flex gap-1.5 overflow-x-auto border-t border-slate-100 bg-white px-3 py-2">
              {suggestions.slice(0, 5).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => void ask(s.query)}
                  className="shrink-0 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-800"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

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
              placeholder={t("helpBot.placeholder")}
              className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-slate-500"
              disabled={loading}
              maxLength={2000}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white disabled:opacity-40"
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
