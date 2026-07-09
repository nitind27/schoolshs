import { spawn, type SpawnOptions } from "child_process";
import fs from "fs";

function hasDisplay(): boolean {
  return Boolean(process.env.DISPLAY?.trim() || process.env.WAYLAND_DISPLAY?.trim());
}

function findXvfbRun(): string | null {
  const candidates = ["/usr/bin/xvfb-run", "/bin/xvfb-run"];
  for (const bin of candidates) {
    if (fs.existsSync(bin)) return bin;
  }
  return null;
}

/** Linux VPS: child worker ko xvfb-run se wrap karo taaki Chromium headed chale */
export function buildAutomationSpawn(
  command: string,
  scriptArgs: string[]
): { command: string; args: string[]; envExtra: Record<string, string> } {
  if (process.platform !== "linux" || hasDisplay()) {
    return { command, args: scriptArgs, envExtra: {} };
  }

  const xvfb = findXvfbRun();
  if (xvfb) {
    return {
      command: xvfb,
      args: ["-a", command, ...scriptArgs],
      envExtra: {},
    };
  }

  return {
    command,
    args: scriptArgs,
    envExtra: { AUTOMATION_HEADLESS: "1" },
  };
}

export function spawnAutomationWorker(
  command: string,
  scriptArgs: string[],
  options: SpawnOptions
) {
  const wrapped = buildAutomationSpawn(command, scriptArgs);
  const baseEnv = (options.env || {}) as Record<string, string | undefined>;

  return spawn(wrapped.command, wrapped.args, {
    ...options,
    env: {
      ...baseEnv,
      ...wrapped.envExtra,
    },
  });
}
