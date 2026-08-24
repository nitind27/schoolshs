import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@bhashaime/core"],
  images: {
    // Next.js 16 defaults to qualities: [75] only — hero needs HD
    qualities: [60, 75, 90, 100],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 2560, 3840],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "100mb",
    },
  },
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-libsql",
    "@prisma/adapter-mariadb",
    "@libsql/client",
    "mariadb",
    "sharp",
    "@whiskeysockets/baileys",
    "pino",
    "playwright",
    "playwright-core",
  ],
};

export default nextConfig;
