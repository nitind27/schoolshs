import fs from "fs";
import dotenv from "dotenv";
import { projectResolve } from "./project-path";

/**
 * Ensures we load the correct env file when running outside Next.js runtime
 * (e.g. automation worker / prisma CLI).
 */
export function loadEnv(): void {
  const nodeEnv = process.env.NODE_ENV;

  const prodPath = projectResolve(".env.production");
  const devPath = projectResolve(".env");

  const envPath = nodeEnv === "production" && fs.existsSync(prodPath) ? prodPath : devPath;
  dotenv.config({ path: envPath });
}

