import { prisma } from "@/lib/db";

/**
 * MariaDB maps Prisma Json to LONGTEXT. New columns can end up as "" which
 * breaks Prisma deserialization ("Unexpected end of JSON input").
 */
export async function repairEmptySubscriptionJson(): Promise<number> {
  try {
    const fixedFormats = await prisma.$executeRawUnsafe(
      `UPDATE schoolsubscription
       SET moduleFormats = '{}'
       WHERE moduleFormats IS NULL
          OR CAST(moduleFormats AS CHAR) = ''
          OR CAST(moduleFormats AS CHAR) = 'null'`,
    );
    const fixedFeatures = await prisma.$executeRawUnsafe(
      `UPDATE schoolsubscription
       SET enabledFeatures = '[]'
       WHERE enabledFeatures IS NULL
          OR CAST(enabledFeatures AS CHAR) = ''
          OR CAST(enabledFeatures AS CHAR) = 'null'`,
    );
    return Number(fixedFormats) + Number(fixedFeatures);
  } catch (e) {
    console.error("repairEmptySubscriptionJson failed", e);
    return 0;
  }
}
