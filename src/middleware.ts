import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/session-token";
import { getRoleHome, type UserRole } from "@/lib/roles";

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

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["super_admin"],
  "/api/admin": ["super_admin"],
  "/auto-apply": ["school_admin"],
  "/api/automation": ["school_admin"],
  "/teacher": ["teacher", "school_admin"],
  "/api/teacher": ["teacher", "school_admin"],
  "/clerk": ["clerk", "school_admin"],
  "/api/clerk": ["clerk", "school_admin"],
  "/ca": ["ca", "school_admin"],
  "/api/ca": ["ca", "school_admin"],
  "/student": ["student"],
  "/api/student-portal": ["student"],
  "/accounting": ["school_admin", "clerk", "ca"],
  "/api/accounting": ["school_admin", "clerk", "ca"],
  "/admissions": ["school_admin", "clerk"],
  "/api/admissions": ["school_admin", "clerk"],
  "/results": ["school_admin", "teacher"],
  "/api/results": ["school_admin", "teacher"],
};

function getRouteRoles(pathname: string): UserRole[] | null {
  for (const [prefix, roles] of Object.entries(ROLE_ROUTES)) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return roles;
  }
  return null;
}

function isSchoolAdminRoute(pathname: string): boolean {
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) return false;
  if (pathname.startsWith("/teacher") || pathname.startsWith("/api/teacher")) return false;
  if (pathname.startsWith("/clerk") || pathname.startsWith("/api/clerk")) return false;
  if (pathname.startsWith("/ca") || pathname.startsWith("/api/ca")) return false;
  if (pathname.startsWith("/student") || pathname.startsWith("/api/student-portal")) return false;
  if (pathname.startsWith("/login") || pathname.startsWith("/m/")) return false;
  if (pathname.startsWith("/api/auth")) return false;
  if (pathname.startsWith("/api/automation/sms")) return false;
  if (pathname.startsWith("/api/health")) return false;
  return pathname.startsWith("/api/") || !pathname.startsWith("/_next");
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("shs_session")?.value;
  const session = token ? await parseSessionToken(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
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

  const routeRoles = getRouteRoles(pathname);
  if (routeRoles && !routeRoles.includes(session.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
  }

  if (session.role === "super_admin" && isSchoolAdminRoute(pathname) && !pathname.startsWith("/api/uploads")) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "School access required" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (session.role === "student" && isSchoolAdminRoute(pathname)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/student", request.url));
  }

  if (["teacher", "clerk", "ca"].includes(session.role) && isSchoolAdminRoute(pathname)) {
    const clerkRoutes = [
      "/students", "/api/students", "/admissions", "/api/admissions",
      "/accounting", "/api/accounting", "/import", "/api/students/bulk-import",
      "/bulk-submit", "/api/students/bulk-submit",
      "/export", "/api/students/export", "/categories",
      "/certificates", "/api/certificates",
    ];
    const allowed =
      (session.role === "teacher" && (pathname.startsWith("/results") || pathname.startsWith("/api/results") || pathname.startsWith("/classes") || pathname.startsWith("/api/classes") || pathname.startsWith("/api/board-records") || pathname.startsWith("/api/teacher"))) ||
      (session.role === "clerk" && clerkRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))) ||
      (session.role === "ca" && (pathname.startsWith("/accounting") || pathname.startsWith("/api/accounting") || pathname.startsWith("/ca") || pathname.startsWith("/api/ca")));

    if (!allowed) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
