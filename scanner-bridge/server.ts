/**
 * Local USB scanner bridge (Windows WIA).
 * Run once on school PC: npm run scanner-bridge
 * Browser portal connects via http://127.0.0.1:9847
 */
import http from "http";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { randomUUID } from "crypto";
import { fileURLToPath } from "url";

const PORT = parseInt(process.env.SCANNER_BRIDGE_PORT || "9847", 10);
const HOST = "127.0.0.1";
const BRIDGE_DIR = path.dirname(fileURLToPath(import.meta.url));
const LIST_SCRIPT = path.join(BRIDGE_DIR, "list-devices.ps1");
const SCAN_SCRIPT = path.join(BRIDGE_DIR, "scan.ps1");

function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed =
    !origin ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  return {
    "Access-Control-Allow-Origin": allowed && origin ? origin : "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

function runPowerShell(file: string, args: string[] = []): Promise<string> {
  return new Promise((resolve, reject) => {
    const ps = spawn(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", file, ...args],
      { windowsHide: true }
    );
    let stdout = "";
    let stderr = "";
    ps.stdout.on("data", (d) => (stdout += d.toString()));
    ps.stderr.on("data", (d) => (stderr += d.toString()));
    ps.on("error", reject);
    ps.on("close", (code) => {
      if (code === 0) resolve(stdout.trim());
      else reject(new Error(stderr.trim() || stdout.trim() || `PowerShell exit ${code}`));
    });
  });
}

async function listDevices(): Promise<{ id: string; name: string }[]> {
  const out = await runPowerShell(LIST_SCRIPT);
  if (!out) return [];
  const parsed = JSON.parse(out) as { devices?: { id: string; name: string }[] | { id: string; name: string } };
  const raw = parsed.devices;
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

async function scanDevice(deviceIndex: number): Promise<Buffer> {
  const tmpDir = path.join(os.tmpdir(), "shs-scanner-bridge");
  await fs.mkdir(tmpDir, { recursive: true });
  const outPath = path.join(tmpDir, `scan-${randomUUID()}.jpg`);
  await runPowerShell(SCAN_SCRIPT, ["-DeviceIndex", String(deviceIndex), "-OutputPath", outPath]);
  const buf = await fs.readFile(outPath);
  await fs.unlink(outPath).catch(() => {});
  return buf;
}

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, body: unknown, headers: Record<string, string>) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...headers });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const url = req.url || "/";

  try {
    if (req.method === "GET" && url === "/health") {
      sendJson(
        res,
        200,
        {
          ok: true,
          platform: process.platform,
          wia: process.platform === "win32",
          port: PORT,
        },
        headers
      );
      return;
    }

    if (process.platform !== "win32") {
      sendJson(
        res,
        501,
        { error: "USB scanner bridge works only on Windows with WIA drivers installed." },
        headers
      );
      return;
    }

    if (req.method === "GET" && url === "/devices") {
      const devices = await listDevices();
      sendJson(res, 200, { devices }, headers);
      return;
    }

    if (req.method === "POST" && url === "/scan") {
      const raw = await readBody(req);
      let deviceIndex = 0;
      if (raw) {
        try {
          const body = JSON.parse(raw) as { deviceId?: string };
          deviceIndex = parseInt(body.deviceId || "0", 10) || 0;
        } catch {
          /* default 0 */
        }
      }
      const buffer = await scanDevice(deviceIndex);
      sendJson(
        res,
        200,
        {
          mimeType: "image/jpeg",
          size: buffer.length,
          imageBase64: buffer.toString("base64"),
        },
        headers
      );
      return;
    }

    sendJson(res, 404, { error: "Not found" }, headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scanner bridge error";
    console.error("[scanner-bridge]", message);
    sendJson(res, 500, { error: message }, headers);
  }
});

if (process.platform !== "win32") {
  console.warn("Warning: USB scanner bridge is designed for Windows (WIA). Camera mode still works in browser.");
}

server.listen(PORT, HOST, () => {
  console.log(`Scanner bridge running at http://${HOST}:${PORT}`);
  console.log("Keep this window open while using USB Scanner in the portal.");
  console.log("Endpoints: GET /health  GET /devices  POST /scan");
});
