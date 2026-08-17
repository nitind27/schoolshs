import { join, resolve } from "path";

/**
 * Paths from the app root. The turbopackIgnore comment stops Turbopack from
 * NFT-tracing the entire repo (which then fails client chunks on node:module).
 */
export function projectCwd(): string {
  return /* turbopackIgnore: true */ process.cwd();
}

export function projectPath(...segments: string[]): string {
  return join(/* turbopackIgnore: true */ process.cwd(), ...segments);
}

export function projectResolve(...segments: string[]): string {
  return resolve(/* turbopackIgnore: true */ process.cwd(), ...segments);
}
