"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageCircle, QrCode, Unplug, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/loader";
import { InfoModal } from "@/components/ui/info-modal";

type WaStatus = "disconnected" | "connecting" | "qr" | "connected";

type WaSnapshot = {
  status: WaStatus;
  qrDataUrl: string | null;
  phone: string | null;
  pushName: string | null;
  lastError: string | null;
};

type Props = {
  onConnectionChange?: (connected: boolean) => void;
};

export function WhatsAppConnectPanel({ onConnectionChange }: Props) {
  const [snapshot, setSnapshot] = useState<WaSnapshot>({
    status: "disconnected",
    qrDataUrl: null,
    phone: null,
    pushName: null,
    lastError: null,
  });
  const [qrOpen, setQrOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [poll, setPoll] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/whatsapp/session", { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as WaSnapshot & { error?: string };
      if (res.ok) {
        setSnapshot({
          status: data.status || "disconnected",
          qrDataUrl: data.qrDataUrl ?? null,
          phone: data.phone ?? null,
          pushName: data.pushName ?? null,
          lastError: data.lastError ?? null,
        });
        onConnectionChange?.(data.status === "connected");
      }
    } catch {
      // ignore transient errors
    }
  }, [onConnectionChange]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!poll && !qrOpen) return;
    const id = setInterval(() => void refresh(), 2000);
    return () => clearInterval(id);
  }, [poll, qrOpen, refresh]);

  useEffect(() => {
    if (snapshot.status === "connected" && qrOpen) {
      setQrOpen(false);
      setPoll(false);
    }
  }, [snapshot.status, qrOpen]);

  const connect = async () => {
    setBusy(true);
    setQrOpen(true);
    setPoll(true);
    try {
      const res = await fetch("/api/admin/whatsapp/session", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as WaSnapshot & { error?: string };
      if (!res.ok) {
        setSnapshot((s) => ({ ...s, lastError: data.error || "Failed to connect" }));
        return;
      }
      setSnapshot({
        status: data.status || "connecting",
        qrDataUrl: data.qrDataUrl ?? null,
        phone: data.phone ?? null,
        pushName: data.pushName ?? null,
        lastError: data.lastError ?? null,
      });
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/whatsapp/session", { method: "DELETE" });
      const data = (await res.json().catch(() => ({}))) as WaSnapshot;
      if (res.ok) {
        setSnapshot({
          status: data.status || "disconnected",
          qrDataUrl: null,
          phone: null,
          pushName: null,
          lastError: null,
        });
        onConnectionChange?.(false);
      }
    } finally {
      setBusy(false);
      setPoll(false);
    }
  };

  const connected = snapshot.status === "connected";

  return (
    <>
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                connected ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
              }`}
            >
              <MessageCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">WhatsApp Web</p>
              <p className="mt-0.5 text-xs text-slate-600">
                QR scan karke connect karein — credentials PDF direct member ke mobile par bhejein.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {connected ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                    <Wifi className="h-3 w-3" />
                    Connected
                    {snapshot.pushName ? ` · ${snapshot.pushName}` : ""}
                    {snapshot.phone ? ` · +${snapshot.phone}` : ""}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold text-slate-600">
                    <WifiOff className="h-3 w-3" />
                    Not connected
                  </span>
                )}
                {snapshot.lastError && !connected && (
                  <span className="text-[11px] text-amber-700">{snapshot.lastError}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {connected ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-red-200 text-red-700 hover:bg-red-50"
                disabled={busy}
                onClick={() => void disconnect()}
              >
                {busy ? <Spinner size="sm" /> : <Unplug className="h-3.5 w-3.5" />}
                Disconnect
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={busy}
                onClick={() => void connect()}
              >
                {busy ? <Spinner size="sm" /> : <QrCode className="h-3.5 w-3.5" />}
                Connect WhatsApp
              </Button>
            )}
          </div>
        </div>
      </div>

      <InfoModal
        isOpen={qrOpen}
        onClose={() => {
          setQrOpen(false);
          if (snapshot.status !== "connecting" && snapshot.status !== "qr") {
            setPoll(false);
          }
        }}
        title="WhatsApp Web — QR Scan"
        size="default"
      >
        <div className="space-y-4 text-center">
          <p className="text-sm text-slate-600">
            Phone par WhatsApp kholen → <strong>Linked devices</strong> → <strong>Link a device</strong> →
            neeche QR scan karein.
          </p>
          {snapshot.qrDataUrl ? (
            <div className="mx-auto inline-block rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={snapshot.qrDataUrl}
                alt="WhatsApp QR code"
                width={280}
                height={280}
                className="mx-auto"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <Spinner />
              <p className="text-xs text-slate-500">QR code load ho raha hai…</p>
            </div>
          )}
          {snapshot.status === "connecting" && !snapshot.qrDataUrl && (
            <p className="text-xs text-slate-500">Connecting…</p>
          )}
        </div>
      </InfoModal>
    </>
  );
}

export function useWhatsAppConnected() {
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    void fetch("/api/admin/whatsapp/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setConnected(d.status === "connected"))
      .catch(() => setConnected(false));
  }, []);
  return connected;
}
