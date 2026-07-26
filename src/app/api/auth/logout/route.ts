import { NextRequest } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { parseSessionToken } from "@/lib/session-token";
import { mobileJson, mobileOptions } from "@/lib/mobile-api";
import { revokeSessionByKey } from "@/lib/user-sessions";
import { cookies } from "next/headers";

export async function OPTIONS(request: NextRequest) {
  return mobileOptions(request.headers.get("origin"));
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  try {
    // Prefer full getSession; fall back to raw cookie parse so we can still revoke sid
    let sid: string | null | undefined = (await getSession())?.sid;
    if (!sid) {
      const cookieStore = await cookies();
      const token = cookieStore.get("shs_session")?.value;
      if (token) {
        const parsed = await parseSessionToken(token);
        sid = parsed?.sid;
      }
    }
    if (sid) {
      await revokeSessionByKey(sid, "logout");
    }
  } catch {
    /* still clear cookie */
  }
  const res = mobileJson({ success: true }, undefined, origin);
  clearSessionCookie(res);
  return res;
}
