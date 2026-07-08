import { loadEnv } from "./src/lib/load-env";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrlForPrismaCli } from "./prisma/datasource-url";

loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveDatabaseUrlForPrismaCli(),
  },
});
