import "server-only";
import { toSsgujaratFetchError } from "./fetch-error";

const LINUX_CHROME_CANDIDATES = [
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium-browser",
  "/usr/bin/chromium",
] as const;

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

export { toSsgujaratFetchError, isPlaywrightLaunchFailure } from "./fetch-error";

/** Headless Chromium for SSGujarat fetch — try default, then known Linux binaries. */
export async function launchSsgujaratBrowser() {
  const { chromium } = await import(/* turbopackIgnore: true */ "playwright");

  const attempts: (string | undefined)[] = [undefined];
  if (process.platform === "linux") {
    attempts.push(...LINUX_CHROME_CANDIDATES);
  }

  let lastError: unknown;
  const seen = new Set<string>();
  for (const exec of attempts) {
    const key = exec || "__default__";
    if (seen.has(key)) continue;
    seen.add(key);
    try {
      return await chromium.launch({
        headless: true,
        args: linuxLaunchArgs(),
        ...(exec ? { executablePath: exec } : {}),
      });
    } catch (err) {
      lastError = err;
    }
  }

  throw new Error(toSsgujaratFetchError(lastError));
}

export type SsgujaratBrowser = Awaited<ReturnType<typeof launchSsgujaratBrowser>>;
export type SsgujaratPage = Awaited<ReturnType<SsgujaratBrowser["newPage"]>>;
