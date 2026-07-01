import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolveDatabaseUrlForPrismaCli } from "./prisma/datasource-url";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: resolveDatabaseUrlForPrismaCli(),
  },
});
