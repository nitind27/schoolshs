import path from "path";

export { getAppUrl } from "./env-auth";

/** Must match prisma/schema.prisma datasource provider */
export const PRISMA_DATASOURCE: "mysql" = "mysql";

export type DbProvider = "mysql" | "sqlite";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

function enc(value: string): string {
  return encodeURIComponent(value);
}

function parseMysqlUrl(url: string): MysqlConnectionConfig | null {
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
      connectionLimit: Number(read("DB_CONNECTION_LIMIT") || "5"),
    };
  } catch {
    return null;
  }
}

/** MySQL always on Vercel — schema is mysql, sqlite adapter would crash */
export function getDbProvider(): DbProvider {
  if (process.env.VERCEL === "1" || PRISMA_DATASOURCE === "mysql") {
    const explicit = read("DB_PROVIDER")?.toLowerCase();
    if (explicit === "sqlite") {
      console.warn("[db] DB_PROVIDER=sqlite ignored — Prisma schema uses mysql");
    }
    return "mysql";
  }

  const explicit = read("DB_PROVIDER")?.toLowerCase();
  if (explicit === "mysql" || explicit === "sqlite") return explicit;

  if (read("DB_HOST") && read("DB_USER") && read("DB_NAME")) return "mysql";

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("mysql://")) return "mysql";
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) return "sqlite";

  return "mysql";
}

export function buildDatabaseUrl(): string {
  const provider = getDbProvider();

  if (provider === "mysql") {
    const direct = read("DATABASE_URL");
    if (direct?.startsWith("mysql://")) return direct;

    const cfg = getMysqlConfig();
    return `mysql://${enc(cfg.user)}:${enc(cfg.password)}@${cfg.host}:${cfg.port}/${cfg.database}`;
  }

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) return direct;

  const file = read("DB_FILE") || "./dev.db";
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  return `file:${absolute}`;
}

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

export function getMysqlConfig(): MysqlConnectionConfig {
  const fromParts = (): MysqlConnectionConfig | null => {
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
      connectionLimit: Number(read("DB_CONNECTION_LIMIT") || "5"),
    };
  };

  const parts = fromParts();
  if (parts) return parts;

  const fromUrl = parseMysqlUrl(read("DATABASE_URL") || "");
  if (fromUrl) return fromUrl;

  throw new Error(
    "MySQL env missing. Set DB_HOST, DB_USER, DB_NAME, DB_PASSWORD on Vercel (or DATABASE_URL=mysql://...)"
  );
}

export function applyDatabaseUrlFromEnv(): string {
  const url = buildDatabaseUrl();
  process.env.DATABASE_URL = url;
  return url;
}
