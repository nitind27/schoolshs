"use client";

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
  type HardwareScannerDevice,
  type ScanMode,
} from "@/lib/scanner-bridge.client";
import { useLocale, useT } from "@/i18n/locale-provider";
import {
  ScanLine,
  X,
  Camera,
  RotateCcw,
  Check,
  Loader2,
  SwitchCamera,
  AlertCircle,
  Printer,
  RefreshCw,
  Plug,
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className={cn(
          "bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]",
          locale === "gu" && "font-gujarati"
        )}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{t("documents.scannerTitle")}</p>
              <p className="text-xs text-slate-300">{docLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
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
                {t("documents.scannerModeHardware")}
                {bridgeOnline && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" title={t("documents.scannerBridgeOnline")} />
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
              >
                <SwitchCamera className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}

        {!captured && scanMode === "hardware" && hardwareDevices.length > 0 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-white">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              {t("documents.scannerSelectHardware")}
            </label>
            <select
              value={selectedHardwareDevice}
              onChange={(e) => setSelectedHardwareDevice(e.target.value)}
              className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm bg-white"
            >
              {hardwareDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="relative bg-black flex-1 min-h-[280px] flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
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
                    <li>{t("documents.scannerBridgeStep2")}</li>
                    <li>{t("documents.scannerBridgeStep3")}</li>
                  </ol>
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
            <img src={captured} alt="Scanned preview" className="max-w-full max-h-[50vh] object-contain" />
          ) : showCameraPreview ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn("max-w-full max-h-[50vh] object-contain", loading && "opacity-0")}
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
                <Printer className="h-14 w-14 text-blue-300" />
              </div>
              <div>
                <p className="font-semibold text-lg">{t("documents.scannerHardwareReady")}</p>
                <p className="text-sm text-slate-300 mt-1 max-w-sm">{t("documents.scannerHardwareHint")}</p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            {captured
              ? t("documents.scannerPreviewHint")
              : scanMode === "hardware"
                ? t("documents.scannerHardwareLiveHint")
                : t("documents.scannerLiveHint")}
          </p>
        </div>

        <div className="px-5 py-4 flex gap-3 border-t border-slate-100">
          {captured ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => void handleRetake()} disabled={processing}>
                <RotateCcw className="h-4 w-4" />
                {t("documents.scannerRetake")}
              </Button>
              <Button className="flex-1" variant="success" onClick={() => void handleUseScan()} disabled={processing}>
                {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
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
