import fs from "fs";
import path from "path";
import dotenv from "dotenv";

/**
 * Ensures we load the correct env file when running outside Next.js runtime
 * (e.g. automation worker / prisma CLI).
 */
export function loadEnv(): void {
  const cwd = process.cwd();
  const nodeEnv = process.env.NODE_ENV;

  const prodPath = path.resolve(cwd, ".env.production");
  const devPath = path.resolve(cwd, ".env");

  const envPath = nodeEnv === "production" && fs.existsSync(prodPath) ? prodPath : devPath;
  dotenv.config({ path: envPath });
}

