"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { captureVideoFrame, canvasToJpegFile } from "@/lib/scan-enhance.client";
import type { DocType } from "@/components/documents/document-uploader";
import {
  ScanLine,
  X,
  Camera,
  RotateCcw,
  Check,
  Loader2,
  SwitchCamera,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [devices, setDevices] = useState<MediaDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [capturedCanvas, setCapturedCanvas] = useState<HTMLCanvasElement | null>(null);
  const [processing, setProcessing] = useState(false);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
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
        setError(
          err instanceof Error
            ? err.message
            : "Camera/Scanner access nahi mila. Permission allow karein."
        );
      } finally {
        setLoading(false);
      }
    },
    [stopStream]
  );

  const loadDevices = useCallback(async () => {
    try {
      // Need permission first to get device labels
      const temp = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      temp.getTracks().forEach((t) => t.stop());

      const all = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = all
        .filter((d) => d.kind === "videoinput")
        .map((d, i) => ({
          deviceId: d.deviceId,
          label: d.label || `Camera / Scanner ${i + 1}`,
        }));

      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDevice) {
        setSelectedDevice(videoInputs[0].deviceId);
        await startCamera(videoInputs[0].deviceId);
      } else if (videoInputs.length === 0) {
        await startCamera();
      }
    } catch {
      setError("Camera/Scanner permission deny ho gayi. Browser settings me allow karein.");
      setLoading(false);
    }
  }, [selectedDevice, startCamera]);

  useEffect(() => {
    if (open) {
      setCaptured(null);
      setCapturedCanvas(null);
      setError(null);
      loadDevices();
    } else {
      stopStream();
    }
    return () => stopStream();
  }, [open, loadDevices, stopStream]);

  const handleDeviceChange = async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setCaptured(null);
    setCapturedCanvas(null);
    await startCamera(deviceId);
  };

  const handleCapture = () => {
    if (!videoRef.current || videoRef.current.videoWidth === 0) return;
    const canvas = captureVideoFrame(videoRef.current, docType);
    setCapturedCanvas(canvas);
    setCaptured(canvas.toDataURL("image/jpeg", 0.92));
    stopStream();
  };

  const handleRetake = async () => {
    setCaptured(null);
    setCapturedCanvas(null);
    await startCamera(selectedDevice || undefined);
  };

  const handleUseScan = async () => {
    if (!capturedCanvas) return;
    setProcessing(true);
    try {
      const fileName = `${docType}_scan_${Date.now()}.jpg`;
      const file = await canvasToJpegFile(capturedCanvas, fileName);
      onScan(file);
      onClose();
    } catch {
      setError("Scan save nahi ho paya");
    } finally {
      setProcessing(false);
    }
  };

  if (!open) return null;

  const isPhoto = docType === "photo";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ScanLine className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Document Scan</p>
              <p className="text-xs text-slate-300">{docLabel}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Device selector */}
        {!captured && devices.length > 1 && (
          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
            <label className="text-xs font-medium text-slate-600 mb-1.5 block">
              Scanner / Camera select karein
            </label>
            <div className="flex gap-2">
              <select
                value={selectedDevice}
                onChange={(e) => handleDeviceChange(e.target.value)}
                className="flex-1 h-9 rounded-lg border border-slate-300 px-3 text-sm bg-white"
              >
                {devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDeviceChange(selectedDevice)}
                className="p-2 rounded-lg border border-slate-300 hover:bg-white"
                title="Refresh"
              >
                <SwitchCamera className="h-4 w-4 text-slate-600" />
              </button>
            </div>
          </div>
        )}

        {/* Viewport */}
        <div className="relative bg-black flex-1 min-h-[280px] flex items-center justify-center overflow-hidden">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white z-10">
              <Loader2 className="h-10 w-10 animate-spin text-blue-400" />
              <p className="text-sm">Scanner connect ho raha hai...</p>
            </div>
          )}

          {error && !captured && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-10">
              <AlertCircle className="h-10 w-10 text-red-400" />
              <p className="text-sm text-red-300">{error}</p>
              <Button size="sm" variant="secondary" onClick={loadDevices}>
                Dobara Try karein
              </Button>
            </div>
          )}

          {captured ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={captured}
              alt="Scanned preview"
              className="max-w-full max-h-[50vh] object-contain"
            />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cn(
                  "max-w-full max-h-[50vh] object-contain",
                  loading && "opacity-0"
                )}
              />
              {/* Scan frame guide */}
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
                        {isPhoto ? "Face yahan rakhein" : "Document yahan rakhein"}
                      </span>
                    </div>
                    {/* Corner markers */}
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
          )}
        </div>

        {/* Tips */}
        <div className="px-5 py-2 bg-slate-50 border-t border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            {captured
              ? "Preview check karein — theek hai to 'Use Scan' dabayein"
              : "Document scanner ya webcam se scan karein · Auto 200 KB compress hoga"}
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 py-4 flex gap-3 border-t border-slate-100">
          {captured ? (
            <>
              <Button variant="outline" className="flex-1" onClick={handleRetake} disabled={processing}>
                <RotateCcw className="h-4 w-4" />
                Retake
              </Button>
              <Button className="flex-1" variant="success" onClick={handleUseScan} disabled={processing}>
                {processing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Use Scan
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCapture}
                disabled={loading || !!error}
              >
                <Camera className="h-4 w-4" />
                Capture Scan
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
