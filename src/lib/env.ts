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

/** DB mode — DB_PROVIDER wins over a stale DATABASE_URL on Vercel */
export function getDbProvider(): DbProvider {
  const explicit = read("DB_PROVIDER")?.toLowerCase();
  if (explicit === "mysql" || explicit === "sqlite") {
    return explicit;
  }

  if (read("DB_HOST") && read("DB_USER") && read("DB_NAME")) {
    return "mysql";
  }

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("mysql://")) return "mysql";
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) return "sqlite";

  return "sqlite";
}

/** Build DB URL from DB_* parts or use DATABASE_URL if compatible */
export function buildDatabaseUrl(): string {
  const provider = getDbProvider();

  if (provider === "mysql") {
    const direct = read("DATABASE_URL");
    if (direct?.startsWith("mysql://")) return direct;

    const host = read("DB_HOST");
    const user = read("DB_USER");
    const database = read("DB_NAME");
    const password = read("DB_PASSWORD") ?? "";
    const port = read("DB_PORT") || "3306";

    if (!host || !user || !database) {
      throw new Error(
        "MySQL config missing: set DB_PROVIDER=mysql and DB_HOST, DB_USER, DB_NAME, DB_PASSWORD"
      );
    }

    return `mysql://${enc(user)}:${enc(password)}@${host}:${port}/${database}`;
  }

  const direct = read("DATABASE_URL");
  if (direct?.startsWith("file:") || direct?.startsWith("libsql:")) {
    return direct;
  }

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
