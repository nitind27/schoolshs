import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import {
  CERTIFICATE_PACKS,
  resolveCertificatePackId,
  getCertificatePack,
} from "@/lib/certificates/packs-registry";
import { CERTIFICATE_TYPES } from "@/lib/certificates/config";
import {
  MODULE_FORMAT_KEYS,
  MODULE_FORMAT_OPTIONS,
  normalizeModuleFormats,
  resolveEnabledFeatures,
} from "@/lib/school-features";
import { repairEmptySubscriptionJson } from "@/lib/repair-subscription-json";

/** Human label for LC layout inside a pack */
const LC_LAYOUT_BY_PACK: Record<string, string> = {
  default: "Secondary / HSC-style Leaving Certificate",
  "24261004405": "Secondary Leaving Certificate (Songadh)",
  "24261004403": "Upper Primary Leaving Certificate (scan format)",
  "24261004404": "Upper Primary Leaving Certificate (scan format)",
};

const RECOMMENDED_FOR: Record<string, string> = {
  default: "Any school without a custom pack",
  "24261004405": "Prefer school code 24261004405 (Songadh secondary)",
  "24261004403": "Prefer school code 24261004403 — Super Admin can assign to any school",
  "24261004404": "Prefer school code 24261004404 — Super Admin can assign to any school",
};

export async function GET() {
  try {
    await requireAuth(["super_admin"]);

    let schools;
    try {
      schools = await prisma.school.findMany({
        orderBy: { code: "asc" },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          udiseCode: true,
          subscription: {
            select: {
              enabledFeatures: true,
              moduleFormats: true,
              planName: true,
            },
          },
        },
      });
    } catch (queryErr) {
      const msg = queryErr instanceof Error ? queryErr.message : String(queryErr);
      if (msg.includes("JSON") || msg.includes("Unexpected end")) {
        await repairEmptySubscriptionJson();
        schools = await prisma.school.findMany({
          orderBy: { code: "asc" },
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true,
            udiseCode: true,
            subscription: {
              select: {
                enabledFeatures: true,
                moduleFormats: true,
                planName: true,
              },
            },
          },
        });
      } else {
        throw queryErr;
      }
    }

    const certificateReports = CERTIFICATE_TYPES.map((t) => ({
      id: t.id,
      labelEn: t.labelEn,
      labelGu: t.labelGu,
      landscape: t.landscape,
    }));

    const packs = CERTIFICATE_PACKS.map((pack) => {
      const assignedSchools = schools
        .filter((s) => {
          const formats = normalizeModuleFormats(s.subscription?.moduleFormats);
          return resolveCertificatePackId(formats.certificates) === pack.id;
        })
        .map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          isActive: s.isActive,
        }));

      return {
        id: pack.id,
        label: pack.label,
        description: pack.description,
        schoolCode: pack.schoolCode,
        folder: pack.folder,
        recommendedFor: RECOMMENDED_FOR[pack.id] || pack.description,
        lcLayout: LC_LAYOUT_BY_PACK[pack.id] || "Leaving Certificate",
        reports: certificateReports.map((r) => ({
          ...r,
          note:
            r.id === "lc"
              ? LC_LAYOUT_BY_PACK[pack.id] || r.labelEn
              : undefined,
        })),
        typeCount: pack.certificateTypes.length,
        assignedSchools,
        assignedCount: assignedSchools.length,
      };
    });

    const moduleCatalog = MODULE_FORMAT_KEYS.map((key) => ({
      key,
      label:
        key === "certificates"
          ? "Certificates & registers"
          : key === "id_cards"
            ? "ID cards"
            : key === "results"
              ? "Results / report cards"
              : "Board exam panel",
      options: MODULE_FORMAT_OPTIONS[key].map((o) => ({
        id: o.id,
        label: o.label,
        description: o.description || "",
        recommendedSchoolCode:
          key === "certificates"
            ? getCertificatePack(o.id).schoolCode
            : /^\d{11}$/.test(o.id)
              ? o.id
              : null,
      })),
    }));

    const schoolDirectory = schools.map((s) => {
      const formats = normalizeModuleFormats(s.subscription?.moduleFormats);
      const features = resolveEnabledFeatures(
        s.subscription?.enabledFeatures,
        s.subscription?.planName,
      );
      const certPack = getCertificatePack(formats.certificates);
      const matchCode =
        certPack.schoolCode != null && certPack.schoolCode === s.code;

      return {
        id: s.id,
        name: s.name,
        code: s.code,
        udiseCode: s.udiseCode,
        isActive: s.isActive,
        features: {
          certificates: features.includes("certificates"),
          id_cards: features.includes("id_cards"),
          results: features.includes("results"),
          board_records: features.includes("board_records"),
        },
        formats: {
          certificates: formats.certificates,
          id_cards: formats.id_cards,
          results: formats.results,
          board_records: formats.board_records,
        },
        certificatesPackLabel: certPack.label,
        lcLayout: LC_LAYOUT_BY_PACK[certPack.id] || "Leaving Certificate",
        packMatchesSchoolCode: matchCode,
        suggestedCertificatePack:
          CERTIFICATE_PACKS.find((p) => p.schoolCode === s.code)?.id || "default",
      };
    });

    return NextResponse.json({
      packs,
      moduleCatalog,
      schoolDirectory,
      certificateReports,
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
