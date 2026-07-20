export const SCANNER_BRIDGE_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SCANNER_BRIDGE_URL
    ? process.env.NEXT_PUBLIC_SCANNER_BRIDGE_URL
    : "http://127.0.0.1:9847";

export type ScanMode = "camera" | "hardware";

export interface HardwareScannerDevice {
  id: string;
  name: string;
}

export interface ScannerBridgeHealth {
  ok: boolean;
  platform?: string;
  wia?: boolean;
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
  return data.devices || [];
}

export async function scanFromHardware(deviceId: string): Promise<File> {
  const data = await bridgeFetch<{ imageBase64: string; mimeType: string }>("/scan", {
    method: "POST",
    body: JSON.stringify({ deviceId }),
  });
  const binary = atob(data.imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: data.mimeType || "image/jpeg" });
  return new File([blob], `hardware_scan_${Date.now()}.jpg`, { type: data.mimeType || "image/jpeg" });
}
