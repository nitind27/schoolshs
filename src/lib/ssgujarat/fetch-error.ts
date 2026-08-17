import { SSG_MSG } from "./message-codes";

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
