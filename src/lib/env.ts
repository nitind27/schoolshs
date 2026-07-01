import path from "path";

export { getAppUrl } from "./env-auth";

export type DbProvider = "sqlite" | "mysql";

function read(name: string): string | undefined {
  const v = process.env[name];
  return v?.trim() || undefined;
}

/** URL-encode password for connection string */
function enc(value: string): string {
  return encodeURIComponent(value);
}

/** Build DB URL from DB_* parts or use DATABASE_URL if set */
export function buildDatabaseUrl(): string {
  const direct = read("DATABASE_URL");
  if (direct) return direct;

  const provider = (read("DB_PROVIDER") || "sqlite").toLowerCase() as DbProvider;

  if (provider === "mysql") {
    const host = read("DB_HOST");
    const user = read("DB_USER");
    const database = read("DB_NAME");
    const password = read("DB_PASSWORD") ?? "";
    const port = read("DB_PORT") || "3306";

    if (!host || !user || !database) {
      throw new Error(
        "MySQL config missing: set DB_HOST, DB_USER, DB_NAME (and DB_PASSWORD) in .env, or set DATABASE_URL"
      );
    }

    return `mysql://${enc(user)}:${enc(password)}@${host}:${port}/${database}`;
  }

  const file = read("DB_FILE") || "./dev.db";
  const absolute = path.isAbsolute(file) ? file : path.resolve(process.cwd(), file);
  return `file:${absolute}`;
}

export function getDbProvider(): DbProvider {
  const url = buildDatabaseUrl();
  if (url.startsWith("mysql://")) return "mysql";
  return "sqlite";
}

export interface MysqlConnectionConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
}

/** Hostinger / MySQL — used by @prisma/adapter-mariadb */
export function getMysqlConfig(): MysqlConnectionConfig {
  const host = read("DB_HOST");
  const user = read("DB_USER");
  const database = read("DB_NAME");
  if (!host || !user || !database) {
    throw new Error("MySQL: set DB_HOST, DB_USER, DB_NAME in .env");
  }
  return {
    host,
    port: Number(read("DB_PORT") || "3306"),
    user,
    password: read("DB_PASSWORD") ?? "",
    database,
    connectionLimit: Number(read("DB_CONNECTION_LIMIT") || "5"),
  };
}

/** Sets process.env.DATABASE_URL — call before Prisma CLI / client */
export function applyDatabaseUrlFromEnv(): string {
  const url = buildDatabaseUrl();
  process.env.DATABASE_URL = url;
  return url;
}
