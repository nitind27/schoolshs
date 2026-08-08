import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { CERTIFICATE_PACKS, resolveCertificatePackId } from "@/lib/certificates/packs-registry";
import { normalizeModuleFormats } from "@/lib/school-features";
import { repairEmptySubscriptionJson } from "@/lib/repair-subscription-json";

export async function GET() {
  try {
    await requireAuth(["super_admin"]);

    let schools;
    try {
      schools = await prisma.school.findMany({
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          subscription: {
            select: {
              enabledFeatures: true,
              moduleFormats: true,
            },
          },
        },
      });
    } catch (queryErr) {
      const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
      if (msg.includes("JSON") || msg.includes("Unexpected end")) {
        await repairEmptySubscriptionJson();
        schools = await prisma.school.findMany({
          orderBy: { name: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            subscription: {
              select: {
                enabledFeatures: true,
                moduleFormats: true,
              },
            },
          },
        });
      } else {
        throw queryErr;
      }
    }

    const packs = CERTIFICATE_PACKS.map((pack) => {
      const assignedSchools = schools
        .filter((s) => {
          const formats = normalizeModuleFormats(s.subscription?.moduleFormats);
          const assigned = resolveCertificatePackId(formats.certificates);
          return assigned === pack.id;
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          isActive: s.isActive,
        }));

      return {
        ...pack,
        typeCount: pack.certificateTypes.length,
        assignedSchools,
        assignedCount: assignedSchools.length,
      };
    });

    return NextResponse.json({
      packs,
      howToAdd: [
        "Create folder: src/components/certificates/packs/<SCHOOL_CODE>/",
        "Export certificate views from that folder index.ts",
        "Register pack in src/lib/certificates/packs-registry.ts (id = school code)",
        "Map runtime in src/lib/certificates/resolve-pack.ts",
        "Assign pack to school in Panel Access or this Formats page",
      ],
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("GET /api/admin/formats failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
