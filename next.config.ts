import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@prisma/adapter-mariadb",
    "@libsql/client",
    "mariadb",
    "sharp",
  ],
};

export default nextConfig;
