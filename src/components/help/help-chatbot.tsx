"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  X,
  Send,
  Sparkles,
  ExternalLink,
  Loader2,
  MessageCircleQuestion,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/i18n/locale-provider";
import { sanitizeHelpHref } from "@/lib/help/engine";

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

export function HelpChatbot() {
  const t = useT();
  const { locale } = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [replyLang, setReplyLang] = useState<HelpLang>(locale === "gu" ? "gu" : "en");
  const [sessionRole, setSessionRole] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const preferredLang: HelpLang = replyLang;

  const scrollBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  };

  const resetChat = useCallback(() => {
    setMessages([]);
    setSuggestions([]);
    setInput("");
  }, []);

  // Keep chatbot bound to current login role — never reuse another panel's chat
  useEffect(() => {
    let alive = true;
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
          return role;
        });
      })
      .catch(() => {
        if (alive) setSessionRole(null);
      });
    return () => {
      alive = false;
    };
  }, [pathname, resetChat]);

  const bootstrap = useCallback(async () => {
    try {
      const res = await fetch(`/api/help/chat?lang=${preferredLang}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data.role && sessionRole && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
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

  // Hide on public pages
  if (pathname === "/login" || pathname === "/" || pathname.startsWith("/m/")) {
    return null;
  }

  const ask = async (raw: string) => {
    const message = raw.trim();
    if (!message || loading) return;
    setInput("");
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: message };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    try {
      const res = await fetch("/api/help/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, lang: preferredLang }),
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: "bot",
            text: data.error || t("helpBot.error"),
          },
        ]);
        return;
      }
      const role = String(data.role || sessionRole || "");
      if (sessionRole && data.role && data.role !== sessionRole) {
        resetChat();
        return;
      }
      if (data.role) setSessionRole(data.role);
      if (data.lang === "en" || data.lang === "hi" || data.lang === "gu") {
        setReplyLang(data.lang);
      }
      setSuggestions(data.suggestions || []);
      const links = Array.isArray(data.links)
        ? data.links
            .map((l: { href: string; label: string }) => {
              const h = sanitizeHelpHref(l.href, role);
              return h ? { href: h, label: l.label } : null;
            })
            .filter((x: { href: string; label: string } | null): x is { href: string; label: string } => Boolean(x))
        : undefined;
      setMessages((prev) => [
        ...prev,
        {
          id: `b-${Date.now()}`,
          role: "bot",
          text: data.text,
          title: data.title,
          href: sanitizeHelpHref(data.href, role),
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-[90] flex h-14 w-14 items-center justify-center rounded-2xl",
          "bg-gradient-to-br from-cyan-600 via-sky-600 to-slate-800 text-white",
          "shadow-xl shadow-cyan-700/30 transition-transform hover:scale-105 active:scale-95",
          "ring-2 ring-white/30",
          open && "scale-95 opacity-0 pointer-events-none"
        )}
        aria-label={t("helpBot.open")}
      >
        <MessageCircleQuestion className="h-6 w-6" strokeWidth={2} />
        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold">
          ?
        </span>
      </button>

      {open && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[95] flex w-[min(100vw-1.25rem,400px)] flex-col overflow-hidden",
            "h-[min(78vh,620px)] rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20",
            "help-bot-panel"
          )}
          role="dialog"
          aria-label={t("helpBot.title")}
        >
          <header className="relative shrink-0 overflow-hidden bg-gradient-to-br from-slate-900 via-cyan-900 to-sky-800 px-4 py-3.5 text-white">
            <div className="pointer-events-none absolute -right-6 -top-8 h-28 w-28 rounded-full bg-cyan-400/20 blur-2xl" />
            <div className="relative flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Bot className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold leading-tight">{t("helpBot.title")}</p>
                  <p className="mt-0.5 flex items-center gap-1 text-[11px] text-cyan-100/90">
                    <Sparkles className="h-3 w-3" />
                    {t("helpBot.subtitle")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 hover:text-white"
                aria-label={t("common.cancel")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="relative mt-3 flex gap-1 rounded-xl bg-black/20 p-1">
              {(["en", "hi", "gu"] as HelpLang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => {
                    setReplyLang(l);
                    setMessages([]);
                  }}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-[11px] font-bold transition-colors",
                    preferredLang === l
                      ? "bg-white text-slate-900 shadow"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {l === "en" ? "English" : l === "hi" ? "हिंदी" : "ગુજરાતી"}
                </button>
              ))}
            </div>
          </header>

          <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/80 px-3 py-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[92%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                    m.role === "user"
                      ? "rounded-br-md bg-cyan-700 text-white"
                      : "rounded-bl-md border border-slate-200/80 bg-white text-slate-700"
                  )}
                >
                  {m.role === "bot" && m.title && (
                    <p className="mb-1 text-xs font-bold text-cyan-800">{m.title}</p>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.role === "bot" && (m.href || (m.links && m.links.length > 0)) && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {m.href && (
                        <Link
                          href={m.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 ring-1 ring-cyan-200 hover:bg-cyan-100"
                        >
                          {t("helpBot.openPage")}
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}
                      {m.links?.map((l) => (
                        <Link
                          key={l.href}
                          href={l.href}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200/80"
                        >
                          {l.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 shadow-sm">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-600" />
                  {t("helpBot.thinking")}
                </div>
              </div>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="shrink-0 border-t border-slate-100 bg-white px-3 py-2">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {t("helpBot.suggestions")}
              </p>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                {suggestions.slice(0, 6).map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    disabled={loading}
                    onClick={() => void ask(s.query)}
                    className="shrink-0 rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[11px] font-semibold text-cyan-800 hover:bg-cyan-100 disabled:opacity-50"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            className="shrink-0 border-t border-slate-200 bg-white p-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void ask(input);
            }}
          >
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 focus-within:border-cyan-400 focus-within:bg-white focus-within:ring-2 focus-within:ring-cyan-100">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("helpBot.placeholder")}
                className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
                disabled={loading}
                maxLength={500}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-40"
                aria-label={t("helpBot.send")}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1.5 px-1 text-[10px] text-slate-400">{t("helpBot.hint")}</p>
          </form>
        </div>
      )}
    </>
  );
}
