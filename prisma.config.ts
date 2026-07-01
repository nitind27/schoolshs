import "dotenv/config";
import { defineConfig } from "prisma/config";
import { applyDatabaseUrlFromEnv } from "./src/lib/env";

applyDatabaseUrlFromEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
