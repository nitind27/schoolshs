/**
 * Prisma CLI datasource URL — prisma generate needs no real DB connection.
 * Runtime app uses getMysqlConfig() in src/lib/env.ts (strict).
 */

export const PRISMA_PLACEHOLDER_URL =
  "mysql://prisma_generate:prisma_generate@127.0.0.1:3306/prisma_generate";

export interface MysqlParts {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

export function parseMysqlPartsFromUrl(url: string): MysqlParts | null {
  if (!url.startsWith("mysql://")) return null;
  try {
    const u = new URL(url);
    const database = u.pathname.replace(/^\//, "");
    if (!u.hostname || !u.username || !database) return null;
    return {
      host: u.hostname,
      port: Number(u.port || "3306"),
      user: decodeURIComponent(u.username),
      password: decodeURIComponent(u.password),
      database,
    };
  } catch {
    return null;
  }
}

export function readMysqlPartsFromEnv(): MysqlParts | null {
  const host = read("DB_HOST");
  const user = read("DB_USER");
  const database = read("DB_NAME");
  if (!host || !user || !database) return null;
  return {
    host,
    port: Number(read("DB_PORT") || "3306"),
    user,
    password: read("DB_PASSWORD") ?? "",
    database,
  };
}

/** Real URL from env, or placeholder for `prisma generate` when env not set yet */
export function resolveDatabaseUrlForPrismaCli(): string {
  const direct = read("DATABASE_URL");
  if (direct?.startsWith("mysql://")) return direct;

  const parts = readMysqlPartsFromEnv();
  if (parts) {
    return `mysql://${enc(parts.user)}:${enc(parts.password)}@${parts.host}:${parts.port}/${parts.database}`;
  }

  return PRISMA_PLACEHOLDER_URL;
}

/** Runtime — null if credentials missing */
export function resolveMysqlPartsFromEnv(): MysqlParts | null {
  const parts = readMysqlPartsFromEnv();
  if (parts) return parts;
  const direct = read("DATABASE_URL");
  if (direct) return parseMysqlPartsFromUrl(direct);
  return null;
}

export function buildDatabaseUrlFromParts(parts: MysqlParts): string {
  return `mysql://${enc(parts.user)}:${enc(parts.password)}@${parts.host}:${parts.port}/${parts.database}`;
}
