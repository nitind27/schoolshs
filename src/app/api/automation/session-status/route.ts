import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { getDgPortalConfig } from "@/lib/dg-portal";
import { getDgProfileDir, readSessionMeta, profileHasBrowserData } from "@/lib/dg-session";

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });

    const sjedProfile = getDgProfileDir("sjed", `school-${session.schoolId}`);
    const citizenProfile = getDgProfileDir("citizen", `school-${session.schoolId}`);

    const sjedMeta = readSessionMeta(sjedProfile);
    const citizenMeta = readSessionMeta(citizenProfile);

    const profileExists = profileHasBrowserData;

    return NextResponse.json({
      sjed: {
        configured: Boolean(settings?.dgSjedUsername?.trim()),
        username: settings?.dgSjedUsername ? `${settings.dgSjedUsername.slice(0, 3)}***` : null,
        sessionSaved: Boolean(sjedMeta?.lastLoginAt),
        lastLoginAt: sjedMeta?.lastLoginAt || null,
        profileReady: profileExists(sjedProfile),
      },
      citizen: {
        configured: Boolean(settings?.dgCitizenLoginId?.trim()),
        loginId: settings?.dgCitizenLoginId ? `${settings.dgCitizenLoginId.slice(0, 3)}***` : null,
        sessionSaved: Boolean(citizenMeta?.lastLoginAt),
        lastLoginAt: citizenMeta?.lastLoginAt || null,
        profileReady: profileExists(citizenProfile),
      },
      portals: {
        sjed: getDgPortalConfig("Pre Matric Scholarship - SC").loginUrl,
        citizen: getDgPortalConfig("Post Matric Scholarship - SC").loginUrl,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
