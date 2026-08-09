"use client";

import { Spinner } from "@/components/ui/loader";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { captureVideoFrame, canvasToJpegFile } from "@/lib/scan-enhance.client";
import { sortScannerDevices } from "@/lib/student-documents";
import type { DocType } from "@/lib/student-documents";
import {
  checkScannerBridge,
  listHardwareScanners,
  scanFromHardware,
  scannerConnectionLabel,
  type HardwareScannerDevice,
  type ScanMode,
  type ScannerConnection,
} from "@/lib/scanner-bridge.client";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  ScanLine,
  X,
  Camera,
  RotateCcw,
  Check,
  SwitchCamera,
  AlertCircle,
  Printer,
  RefreshCw,
  Plug,
  Wifi,
  Usb,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Translator = (key: string, params?: Record<string, string | number>) => string;

function translateBridgeError(t: Translator, message: string, locale: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("no wia scanner") || lower.includes("no scanner found")) {
    return t("documents.scannerNoHardware");
  }
  if (lower.includes("failed to fetch") || lower.includes("networkerror") || lower.includes("aborted")) {
    return t("documents.scannerBridgeOffline");
  }
  if (lower.includes("invalid device")) {
    return t("documents.scannerHardwareFailed");
  }
  if (locale === "gu") {
    return t("documents.scannerBridgeErrorGeneric");
  }
  if (message.length > 120) {
    return t("documents.scannerBridgeErrorGeneric");
  }
  return message;
}

function ConnectionBadge({
  connection,
  label,
}: {
  connection?: ScannerConnection;
  label: string;
}) {
  const isWifi = connection === "wifi";
  const isUsb = connection === "usb";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        isWifi && "border-sky-200 bg-sky-50 text-sky-800",
        isUsb && "border-violet-200 bg-violet-50 text-violet-800",
        !isWifi && !isUsb && "border-slate-200 bg-slate-50 text-slate-600",
      )}
    >
      {isWifi ? <Wifi className="h-3 w-3" /> : isUsb ? <Usb className="h-3 w-3" /> : <Printer className="h-3 w-3" />}
      {label}
    </span>
  );
}

interface DocumentScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (file: File) => void;
  docLabel: string;
  docType: DocType;
}

interface MediaDevice {
  deviceId: string;
  label: string;
}

export function DocumentScanner({
  open,
  onClose,
  onScan,
  docLabel,
  docType,
}: DocumentScannerProps) {
  const t = useT();
  const { locale } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  const [scanMode, setScanMode] = useState<ScanMode>("camera");
  const [bridgeOnline, setBridgeOnline] = useState<boolean | null>(null);

  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [hardwareDevices, setHardwareDevices] = useState<HardwareScannerDevice[]>([]);
  const [selectedHardwareDevice, setSelectedHardwareDevice] = useState("0");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = useCallback(
    async (deviceId?: string) => {
      stopStream();
      setLoading(true);
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
            : { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t("documents.scannerNoAccess"));
      } finally {
        setLoading(false);
      }
    },
    [stopStream, t]
  );

  const loadCameraDevices = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      temp.getTracks().forEach((track) => track.stop());

      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = sortScannerDevices(
        all
          .filter((d) => d.kind === "videoinput")
          .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || t("documents.scannerDevice", { n: i + 1 }),
          }))
      );

      setDevices(videoInputs);
      if (videoInputs.length > 0) {
        const pick = videoInputs[0].deviceId;
        setSelectedDevice(pick);
        await startCamera(pick);
      } else {
        await startCamera();
      }
    } catch {
      setError(t("documents.scannerPermissionDenied"));
      setLoading(false);
    }
  }, [startCamera, t]);

  const loadHardwareScanners = useCallback(async () => {
    setLoading(true);
    setError(null);
    stopStream();
    try {
      const health = await checkScannerBridge();
      setBridgeOnline(!!health?.ok);
      if (!health?.ok) {
        setError(t("documents.scannerBridgeOffline"));
        setHardwareDevices([]);
        return;
      }
      const list = await listHardwareScanners();
      setHardwareDevices(list);
      if (list.length > 0) {
        setSelectedHardwareDevice(list[0].id);
      } else {
        setError(t("documents.scannerNoHardware"));
      }
    } catch (err) {
      setBridgeOnline(false);
      const msg = err instanceof Error ? err.message : t("documents.scannerBridgeOffline");
      setError(translateBridgeError(t, msg, locale));
    } finally {
      setLoading(false);
    }
  }, [stopStream, t]);

  const refreshBridgeStatus = useCallback(async () => {
    const health = await checkScannerBridge();
    setBridgeOnline(!!health?.ok);
    return !!health?.ok;
  }, []);

  useEffect(() => {
    if (!open) {
      stopStream();
      return;
    }
    setCaptured(null);
    setCapturedCanvas(null);
    setCapturedFile(null);
    setError(null);

    void refreshBridgeStatus().then((online) => {
      if (online) {
        setScanMode("hardware");
        void loadHardwareScanners();
      } else {
        setScanMode("camera");
        void loadCameraDevices();
      }
    });

    return () => stopStream();
  }, [open, loadCameraDevices, loadHardwareScanners, refreshBridgeStatus, stopStream]);

  const switchMode = async (mode: ScanMode) => {
    if (mode === scanMode) return;
    setScanMode(mode);
    setCaptured(null);
    setCapturedCanvas(null);
    setCapturedFile(null);
    setError(null);
    if (mode === "camera") {
      await loadCameraDevices();
    } else {
      await loadHardwareScanners();
    }
  };

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setCaptured(null);
    setCapturedCanvas(null);
    setCapturedFile(null);
    await startCamera(deviceId);
  };

  const handleCapture = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;
    const canvas = captureVideoFrame(videoRef.current, docType);
    setCapturedCanvas(canvas);
    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
    setCapturedFile(null);
    stopStream();
  };

  const handleHardwareScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const file = await scanFromHardware(selectedHardwareDevice);
      const url = URL.createObjectURL(file);
      setCaptured(url);
      setCapturedFile(file);
      setCapturedCanvas(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("documents.scannerHardwareFailed");
      setError(translateBridgeError(t, msg, locale));
    } finally {
      setLoading(false);
    }
  };

  const handleRetake = async () => {
    if (captured?.startsWith("blob:")) URL.revokeObjectURL(captured);
    setCaptured(null);
    setCapturedCanvas(null);
    setCapturedFile(null);
    if (scanMode === "camera") {
      await startCamera(selectedDevice || undefined);
    }
  };

  const handleUseScan = async () => {
    setProcessing(true);
    try {
      if (capturedFile) {
        onScan(capturedFile);
        onClose();
        return;
      }
      if (!capturedCanvas) return;
      const fileName = `${docType}_scan_${Date.now()}.jpg`;
      const file = await canvasToJpegFile(capturedCanvas, fileName);
      onScan(file);
      onClose();
    } catch {
      setError(t("documents.scannerSaveFailed"));
    } finally {
      setProcessing(false);
    }
  };

  if (!open || !mounted) return null;

  const isPhoto = docType === "photo";
  const showCameraPreview = scanMode === "camera" && !captured;
  const showHardwareIdle = scanMode === "hardware" && !captured;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${t("documents.scannerTitle")} — ${docLabel}`}
        className={cn(
          "flex h-[100dvh] max-h-[100dvh] w-full max-w-2xl flex-col overflow-x-hidden overflow-y-auto bg-white shadow-2xl sm:h-auto sm:max-h-[95dvh] sm:rounded-2xl",
          locale === "gu" && "font-gujarati"
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 px-3 py-3 text-white sm:px-5 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{t("documents.scannerTitle")}</p>
              <p className="text-xs text-slate-300">{docLabel}</p>
            </div>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl transition-colors hover:bg-white/10"
            aria-label={t("common.cancel")}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!captured && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200/80 rounded-xl">
              <button
                type="button"
                onClick={() => void switchMode("camera")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                  scanMode === "camera"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Camera className="h-4 w-4" />
                {t("documents.scannerModeCamera")}
              </button>
              <button
                type="button"
                onClick={() => void switchMode("hardware")}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-all",
                  scanMode === "hardware"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                )}
              >
                <Printer className="h-4 w-4" />
                <span className="flex flex-col items-start leading-tight sm:flex-row sm:items-center sm:gap-1.5">
                  <span>{t("documents.scannerModeHardware")}</span>
                  <span className="text-[10px] font-medium text-slate-500 sm:text-xs">
                    {t("documents.scannerModeHardwareSub")}
                  </span>
                </span>
                {bridgeOnline && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" title={t("documents.scannerBridgeOnline")} />
                )}
              </button>
            </div>
          </div>
        )}

        {!captured && scanMode === "camera" && devices.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-white">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              {t("documents.scannerSelectCamera")}
            </label>
            <div className="flex gap-2">
              <select
                value={selectedDevice}
                onChange={(e) => void handleDeviceChange(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-sm bg-white"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleDeviceChange(selectedDevice)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-slate-50"
                title={t("documents.scannerRefresh")}
                aria-label={t("documents.scannerRefresh")}
              >
                <SwitchCamera className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}

        {!captured && scanMode === "hardware" && hardwareDevices.length > 0 && (
          <div className="space-y-3 border-b border-slate-100 bg-white px-5 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-600">
                {t("documents.scannerSelectHardware")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {hardwareDevices.some((d) => d.connection === "usb") ? (
                  <ConnectionBadge connection="usb" label={t("documents.scannerConnUsb")} />
                ) : null}
                {hardwareDevices.some((d) => d.connection === "wifi") ? (
                  <ConnectionBadge connection="wifi" label={t("documents.scannerConnWifi")} />
                ) : null}
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={selectedHardwareDevice}
                onChange={(e) => setSelectedHardwareDevice(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm"
              >
                {hardwareDevices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                    {d.connection === "wifi"
                      ? ` · ${t("documents.scannerConnWifi")}`
                      : d.connection === "usb"
                        ? ` · ${t("documents.scannerConnUsb")}`
                        : ""}
                    {d.port ? ` (${d.port})` : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void loadHardwareScanners()}
                className="rounded-lg border border-slate-300 p-2 hover:bg-slate-50"
                title={t("documents.scannerRefresh")}
                aria-label={t("documents.scannerRefresh")}
              >
                <RefreshCw className="h-4 w-4 text-slate-600" />
              </button>
            </div>
            <ul className="grid gap-1.5 sm:grid-cols-2">
              {hardwareDevices.map((d) => {
                const active = d.id === selectedHardwareDevice;
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedHardwareDevice(d.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-xl border px-3 py-2.5 text-left transition",
                        active
                          ? "border-blue-300 bg-blue-50/80 ring-1 ring-blue-200"
                          : "border-slate-200 bg-slate-50/60 hover:border-slate-300",
                      )}
                    >
                      <div
                        className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          d.connection === "wifi"
                            ? "bg-sky-100 text-sky-700"
                            : d.connection === "usb"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-slate-200 text-slate-600",
                        )}
                      >
                        {d.connection === "wifi" ? (
                          <Wifi className="h-4 w-4" />
                        ) : d.connection === "usb" ? (
                          <Usb className="h-4 w-4" />
                        ) : (
                          <Printer className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{d.name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                          <ConnectionBadge
                            connection={d.connection}
                            label={scannerConnectionLabel(d.connection, t)}
                          />
                          {d.port ? (
                            <span className="truncate font-mono text-[10px] text-slate-500">{d.port}</span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <div className="relative flex min-h-[140px] flex-1 items-center justify-center overflow-hidden bg-black min-[480px]:min-h-[180px] sm:min-h-[240px]">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
              <Spinner size="sm" />
              <p className="text-sm">
                {scanMode === "hardware" ? t("documents.scannerHardwareWaiting") : t("documents.scannerConnecting")}
              </p>
            </div>
          )}

          {error && !captured && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10 max-w-md mx-auto">
              <AlertCircle className="h-10 w-10 text-amber-400 shrink-0" />
              <p className="text-sm text-amber-100">{error}</p>
              {scanMode === "hardware" && !bridgeOnline && (
                <div className="text-left w-full rounded-xl bg-white/10 p-4 text-xs text-slate-200 space-y-2">
                  <p className="font-semibold text-white flex items-center gap-2">
                    <Plug className="h-4 w-4" />
                    {t("documents.scannerBridgeSetupTitle")}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-slate-300">
                    <li>{t("documents.scannerBridgeStep1")}</li>
                    <li>{t("documents.scannerBridgeStep1Wifi")}</li>
                    <li>{t("documents.scannerBridgeStep2")}</li>
                    <li>{t("documents.scannerBridgeStep3")}</li>
                  </ol>
                </div>
              )}
              {scanMode === "hardware" && bridgeOnline && hardwareDevices.length === 0 && (
                <div className="w-full max-w-sm space-y-2 rounded-xl bg-white/10 p-4 text-left text-xs text-slate-200">
                  <p className="font-semibold text-white">{t("documents.scannerNoHardwareHelpTitle")}</p>
                  <ul className="list-disc space-y-1 pl-4 text-slate-300">
                    <li>{t("documents.scannerNoHardwareHelpUsb")}</li>
                    <li>{t("documents.scannerNoHardwareHelpWifi")}</li>
                    <li>{t("documents.scannerNoHardwareHelpDriver")}</li>
                  </ul>
                </div>
              )}
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void (scanMode === "hardware" ? loadHardwareScanners() : loadCameraDevices())}
              >
                <RefreshCw className="h-4 w-4" />
                {t("documents.scannerRetry")}
              </Button>
            </div>
          )}

          {captured ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={captured} alt="Scanned preview" className="max-h-[50dvh] max-w-full object-contain" />
          ) : showCameraPreview ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn("max-h-[50dvh] max-w-full object-contain", loading && "opacity-0")}
              />
              {!loading && !error && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
                  <div
                    className={cn(
                      "border-2 border-dashed border-blue-400/80 rounded-lg relative",
                      isPhoto ? "w-48 h-60" : "w-full max-w-md aspect-[3/4]"
                    )}
                  >
                    <div className="absolute -top-6 left-0 right-0 text-center">
                      <span className="text-xs text-blue-300 bg-black/50 px-2 py-0.5 rounded">
                        {isPhoto ? t("documents.scannerGuidePhoto") : t("documents.scannerGuideDoc")}
                      </span>
                    </div>
                    {(["tl", "tr", "bl", "br"] as const).map((corner) => (
                      <div
                        key={corner}
                        className={cn(
                          "absolute w-5 h-5 border-blue-400",
                          corner === "tl" && "top-0 left-0 border-t-4 border-l-4",
                          corner === "tr" && "top-0 right-0 border-t-4 border-r-4",
                          corner === "bl" && "bottom-0 left-0 border-b-4 border-l-4",
                          corner === "br" && "bottom-0 right-0 border-b-4 border-r-4"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : showHardwareIdle && !loading && !error ? (
            <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-white">
              <div className="p-5 rounded-2xl bg-white/10">
                {hardwareDevices.find((d) => d.id === selectedHardwareDevice)?.connection === "wifi" ? (
                  <Wifi className="h-14 w-14 text-sky-300" />
                ) : (
                  <Printer className="h-14 w-14 text-blue-300" />
                )}
              </div>
              <div>
                <p className="font-semibold text-lg">{t("documents.scannerHardwareReady")}</p>
                <p className="mt-1 max-w-sm text-sm text-slate-300">{t("documents.scannerHardwareHint")}</p>
                {(() => {
                  const selected = hardwareDevices.find((d) => d.id === selectedHardwareDevice);
                  if (!selected) return null;
                  return (
                    <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                      <ConnectionBadge
                        connection={selected.connection}
                        label={scannerConnectionLabel(selected.connection, t)}
                      />
                      <span className="max-w-[16rem] truncate text-xs text-slate-300">{selected.name}</span>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-3 py-2 sm:px-5">
          <p className="text-xs text-slate-500 text-center">
            {captured
              ? t("documents.scannerPreviewHint")
              : scanMode === "hardware"
                ? t("documents.scannerHardwareLiveHint")
                : t("documents.scannerLiveHint")}
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-slate-100 px-3 py-3 min-[360px]:flex-row sm:gap-3 sm:px-5 sm:py-4">
          {captured ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => void handleRetake()} disabled={processing}>
                <RotateCcw className="h-4 w-4" />
                {t("documents.scannerRetake")}
              </Button>
              <Button className="flex-1" variant="success" onClick={() => void handleUseScan()} disabled={processing}>
                {processing ? <Spinner size="sm" /> : <Check className="h-4 w-4" />}
                {t("documents.scannerUse")}
              </Button>
            </>
          ) : scanMode === "hardware" ? (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => void handleHardwareScan()}
                disabled={loading || !!error || hardwareDevices.length === 0}
              >
                <ScanLine className="h-4 w-4" />
                {t("documents.scannerHardwareScan")}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                {t("common.cancel")}
              </Button>
              <Button className="flex-1" onClick={handleCapture} disabled={loading || !!error}>
                <Camera className="h-4 w-4" />
                {t("documents.scannerCapture")}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
