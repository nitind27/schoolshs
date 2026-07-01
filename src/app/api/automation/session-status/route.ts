import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { AuthError, requireSchoolAuth } from "@/lib/auth";
import { getDgPortalConfig } from "@/lib/dg-portal";
import {
  resolveDgProfileDir,
  readSessionMeta,
  profileHasBrowserData,
} from "@/lib/dg-session";

export const dynamic = "force-dynamic";

const emptyPortal = () => ({
  configured: false,
  sessionSaved: false,
  lastLoginAt: null as string | null,
  profileReady: false,
});

export async function GET() {
  try {
    const session = await requireSchoolAuth();
    const settings = await prisma.schoolSettings.findUnique({ where: { schoolId: session.schoolId } });

    let sjedMeta = null;
    let citizenMeta = null;
    let sjedProfileReady = false;
    let citizenProfileReady = false;

    try {
      const sjedProfile = resolveDgProfileDir("sjed", `school-${session.schoolId}`);
      const citizenProfile = resolveDgProfileDir("citizen", `school-${session.schoolId}`);
      sjedMeta = readSessionMeta(sjedProfile);
      citizenMeta = readSessionMeta(citizenProfile);
      sjedProfileReady = profileHasBrowserData(sjedProfile);
      citizenProfileReady = profileHasBrowserData(citizenProfile);
    } catch {
      /* Vercel: no local browser profiles — DB credentials still work */
    }

    return NextResponse.json({
      sjed: {
        ...emptyPortal(),
        configured: Boolean(settings?.dgSjedUsername?.trim()),
        username: settings?.dgSjedUsername ? `${settings.dgSjedUsername.slice(0, 3)}***` : null,
        sessionSaved: Boolean(sjedMeta?.lastLoginAt),
        lastLoginAt: sjedMeta?.lastLoginAt || null,
        profileReady: sjedProfileReady,
      },
      citizen: {
        ...emptyPortal(),
        configured: Boolean(settings?.dgCitizenLoginId?.trim()),
        loginId: settings?.dgCitizenLoginId ? `${settings.dgCitizenLoginId.slice(0, 3)}***` : null,
        sessionSaved: Boolean(citizenMeta?.lastLoginAt),
        lastLoginAt: citizenMeta?.lastLoginAt || null,
        profileReady: citizenProfileReady,
      },
      portals: {
        sjed: getDgPortalConfig("Pre Matric Scholarship - SC").loginUrl,
        citizen: getDgPortalConfig("Post Matric Scholarship - SC").loginUrl,
      },
      runtime: process.env.VERCEL === "1" ? "vercel" : "local",
      note:
        process.env.VERCEL === "1"
          ? "Auto Apply browser local PC par chalega — Vercel par sirf dashboard"
          : undefined,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("session-status error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
