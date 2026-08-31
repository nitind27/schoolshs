export const SCANNER_BRIDGE_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SCANNER_BRIDGE_URL
    ? process.env.NEXT_PUBLIC_SCANNER_BRIDGE_URL
    : "http://127.0.0.1:9847";

export type ScanMode = "camera" | "hardware";

export type ScannerConnection = "usb" | "wifi" | "unknown";

export interface HardwareScannerDevice {
  id: string;
  name: string;
  connection?: ScannerConnection;
  port?: string | null;
  server?: string | null;
  manufacturer?: string | null;
  provider?: string | null;
}

export interface ScannerBridgeHealth {
  ok: boolean;
  platform?: string;
  wia?: boolean;
  supportsWifi?: boolean;
}

function normalizeConnection(raw?: string | null): ScannerConnection {
  const v = String(raw || "").toLowerCase();
  if (v === "usb") return "usb";
  if (v === "wifi" || v === "network" || v === "wsd") return "wifi";
  return "unknown";
}

async function bridgeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${SCANNER_BRIDGE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || `Scanner bridge error (${res.status})`);
  }
  return data;
}

export async function checkScannerBridge(): Promise<ScannerBridgeHealth | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const data = await bridgeFetch<ScannerBridgeHealth>("/health", { signal: controller.signal });
    clearTimeout(timer);
    return data;
  } catch {
    return null;
  }
}

export async function listHardwareScanners(): Promise<HardwareScannerDevice[]> {
  const data = await bridgeFetch<{ devices: HardwareScannerDevice[] }>("/devices");
  return (data.devices || []).map((d) => ({
    ...d,
    connection: normalizeConnection(d.connection),
  }));
}

export async function scanFromHardware(deviceId: string): Promise<File> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120000);
  try {
    const data = await bridgeFetch<{ imageBase64: string; mimeType: string }>("/scan", {
      method: "POST",
      body: JSON.stringify({ deviceId }),
      signal: controller.signal,
    });
    const binary = atob(data.imageBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: data.mimeType || "image/jpeg" });
    return new File([blob], `hardware_scan_${Date.now()}.jpg`, { type: data.mimeType || "image/jpeg" });
  } finally {
    clearTimeout(timer);
  }
}

export function scannerConnectionLabel(
  connection: ScannerConnection | undefined,
  t: (key: string) => string,
): string {
  if (connection === "usb") return t("documents.scannerConnUsb");
  if (connection === "wifi") return t("documents.scannerConnWifi");
  return t("documents.scannerConnUnknown");
}
