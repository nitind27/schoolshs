import fs from "fs";
import { chromium, type Browser } from "playwright";
import { SSG_MSG } from "./message-codes";

const LINUX_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
];

function linuxLaunchArgs() {
  if (process.platform !== "linux") return [];
  return [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
  ];
}

export function isPlaywrightLaunchFailure(err: unknown): boolean {
  const msg = err instanceof Error ? `${err.message}\n${err.stack || ""}` : String(err);
  return (
    msg.includes("libatk") ||
    msg.includes("shared libraries") ||
    msg.includes("Host system is missing dependencies") ||
    msg.includes("browserType.launch") ||
    msg.includes("Target page, context or browser has been closed") ||
    msg.includes("Executable doesn't exist") ||
    msg.includes("Call log:")
  );
}

export function toSsgujaratFetchError(err: unknown): string {
  if (err instanceof Error && err.message === SSG_MSG.BROWSER_UNAVAILABLE) {
    return SSG_MSG.BROWSER_UNAVAILABLE;
  }
  if (isPlaywrightLaunchFailure(err)) return SSG_MSG.BROWSER_UNAVAILABLE;
  if (err instanceof Error) {
    const msg = err.message.trim();
    if (msg.startsWith("SSG_")) return msg;
    if (msg.includes("\n") || msg.length > 180) return SSG_MSG.BROWSER_UNAVAILABLE;
    return msg;
  }
  return SSG_MSG.BROWSER_UNAVAILABLE;
}

async function tryLaunch(executablePath?: string): Promise<Browser> {
  return chromium.launch({
    headless: true,
    args: linuxLaunchArgs(),
    ...(executablePath ? { executablePath } : {}),
  });
}

/** Headless Chromium for SSGujarat fetch — Linux VPS safe args + system Chrome fallback. */
export async function launchSsgujaratBrowser(): Promise<Browser> {
  let bundledPath = "";
  try {
    bundledPath = chromium.executablePath();
  } catch {
    bundledPath = "";
  }

  const attempts: (string | undefined)[] = [];
  if (bundledPath && fs.existsSync(bundledPath)) attempts.push(bundledPath);
  attempts.push(undefined);
  if (process.platform === "linux") {
    for (const p of LINUX_CHROME_CANDIDATES) {
      if (fs.existsSync(p)) attempts.push(p);
    }
  }

  let lastError: unknown;
  const seen = new Set<string>();
  for (const exec of attempts) {
    const key = exec || "__default__";
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      return await tryLaunch(exec);
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(toSsgujaratFetchError(lastError));
}
