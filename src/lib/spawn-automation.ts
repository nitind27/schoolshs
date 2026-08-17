import { spawn, type ChildProcess, type SpawnOptions } from "node:child_process";

type NodeEnv = "development" | "production" | "test";

function resolveNodeEnv(value: string | undefined): NodeEnv {
  if (value === "development" || value === "test" || value === "production") return value;
  return "production";
}

function hasDisplay(): boolean {
  return Boolean(process.env.DISPLAY?.trim() || process.env.WAYLAND_DISPLAY?.trim());
}

/** Linux VPS: child worker ko xvfb-run se wrap karo taaki Chromium headed chale */
export function buildAutomationSpawn(
  command: string,
  scriptArgs: string[]
): { command: string; args: string[]; envExtra: Record<string, string> } {
  if (process.platform !== "linux" || hasDisplay()) {
    return { command, args: scriptArgs, envExtra: {} };
  }

  return {
    command: "xvfb-run",
    args: ["-a", command, ...scriptArgs],
    envExtra: {},
  };
}

export function spawnAutomationWorker(
  command: string,
  scriptArgs: string[],
  options: SpawnOptions
): ChildProcess {
  const wrapped = buildAutomationSpawn(command, scriptArgs);
  const baseEnv = (options.env || {}) as Record<string, string | undefined>;
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...baseEnv,
    ...wrapped.envExtra,
    NODE_ENV: resolveNodeEnv(baseEnv.NODE_ENV || process.env.NODE_ENV),
  };

  return spawn(wrapped.command, wrapped.args, {
    ...options,
    env,
  });
}
