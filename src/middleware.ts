import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/session-token";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/health",
  "/api/automation/sms/webhook",
  "/api/automation/sms/relay",
  "/m/sms-bridge",
  "/m/forwarder-setup",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("shs_session")?.value;
  const session = token ? await parseSessionToken(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (session && pathname === "/login") {
      const dest = session.role === "super_admin" ? "/admin" : "/";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return NextResponse.next();
  }

  if (!token || !session) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    return NextResponse.redirect(login);
  }

  const isAdminRoute = pathname.startsWith("/admin") || pathname.startsWith("/api/admin");
  const isSchoolRoute =
    !isAdminRoute &&
    !pathname.startsWith("/api/auth") &&
    (pathname.startsWith("/api/") || !pathname.startsWith("/_next"));

  if (isAdminRoute && session.role !== "super_admin") {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Super admin access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isSchoolRoute && session.role === "super_admin" && !pathname.startsWith("/api/uploads")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "School admin access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
