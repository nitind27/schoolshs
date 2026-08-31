import { spawn } from "child_process";
import { projectCwd, projectPath } from "@/lib/project-path";

const BRIDGE_URL = "http://127.0.0.1:9847";

export async function pingScannerBridge(timeoutMs = 1500): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${BRIDGE_URL}/health`, { signal: controller.signal, cache: "no-store" });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

export async function spawnScannerBridge(): Promise<{ started: boolean; message: string }> {
  if (process.platform !== "win32") {
    return { started: false, message: "Scanner helper runs on Windows only." };
  }
  if (await pingScannerBridge()) {
    return { started: true, message: "Scanner helper is already running." };
  }

  const cwd = projectCwd();
  const vbs = projectPath("scanner-bridge", "silent-start.vbs");

  try {
    const child = spawn("wscript.exe", [vbs], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
  } catch {
    spawn("npx.cmd", ["tsx", "scanner-bridge/server.ts"], {
      cwd,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      shell: true,
    }).unref();
  }

  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 400));
    if (await pingScannerBridge()) {
      return { started: true, message: "Scanner helper started." };
    }
  }
  return { started: false, message: "Scanner helper did not start in time." };
}
