import path from "path";
import {
  buildDatabaseUrlFromParts,
  parseMysqlPartsFromUrl,
  readMysqlPartsFromEnv,
  resolveMysqlPartsFromEnv,
} from "../../prisma/datasource-url";

export { getAppUrl } from "./env-auth";

export const PRISMA_DATASOURCE: "mysql" = "mysql";

export type DbProvider = "mysql" | "sqlite";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

export function getDbProvider(): DbProvider {
  if (process.env.VERCEL === "1" || PRISMA_DATASOURCE === "mysql") {
    return "mysql";
  }

  const explicit = read("DB_PROVIDER")?.toLowerCase();
  if (explicit === "mysql" || explicit === "sqlite") return explicit;

  if (readMysqlPartsFromEnv()) return "mysql";

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("mysql://")) return "mysql";
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) return "sqlite";

  return "mysql";
}

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  connectTimeout?: number;
}

export function getMysqlConfig(): MysqlConnectionConfig {
  const parts = resolveMysqlPartsFromEnv();
  if (!parts) {
    throw new Error(
      "MySQL env missing. On Vercel set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD (or DATABASE_URL=mysql://...)"
    );
  }
  return {
    ...parts,
    connectionLimit: Number(read("DB_CONNECTION_LIMIT") || "3"),
    connectTimeout: Number(read("DB_CONNECT_TIMEOUT") || "15000"),
  };
}

export function buildDatabaseUrl(): string {
  const provider = getDbProvider();

  if (provider === "mysql") {
    const direct = read("DATABASE_URL");
    if (direct?.startsWith("mysql://")) return direct;

    const parts = resolveMysqlPartsFromEnv();
    if (parts) return buildDatabaseUrlFromParts(parts);

    throw new Error(
      "MySQL env missing. On Vercel set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD (or DATABASE_URL=mysql://...)"
    );
  }

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) return direct;

  const file = read("DB_FILE") || "./dev.db";
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  return `file:${absolute}`;
}

export function applyDatabaseUrlFromEnv(): string {
  const url = buildDatabaseUrl();
  process.env.DATABASE_URL = url;
  return url;
}

// re-export for tests
export { parseMysqlPartsFromUrl };
