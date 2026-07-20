import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bhashaime/core"],
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
