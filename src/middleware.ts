import { NextRequest, NextResponse } from "next/server";
import { parseSessionToken } from "@/lib/session-token";
import { corsHeaders, extractBearerToken } from "@/lib/mobile-api";
import { getRoleHome, type UserRole } from "@/lib/roles";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/mobile/login",
  "/api/auth/captcha",
  "/api/auth/school-branding",
  "/api/auth/verify-email",
  "/api/auth/verify-otp",
  "/api/auth/resend-verification",
  "/verify-email",
  "/api/auth/logout",
  "/api/health",
  "/api/contact-support",
  "/api/automation/sms/webhook",
  "/api/automation/sms/relay",
  "/m/sms-bridge",
  "/m/forwarder-setup",
  "/m/id-cards",
  "/api/id-cards/share",
];

const ROLE_ROUTES: Record<string, UserRole[]> = {
  "/admin": ["super_admin"],
  "/api/admin": ["super_admin"],
  "/auto-apply": ["school_admin", "clerk"],
  "/api/automation": ["school_admin", "clerk"],
  // Teacher UI is teacher-only — school_admin must not open /teacher/* (help/chat isolation).
  // /api/teacher stays shared where admin tools (e.g. attendance export) need it.
  "/teacher": ["teacher"],
  "/api/teacher": ["teacher", "school_admin"],
  "/clerk": ["clerk"],
  "/api/clerk": ["clerk", "school_admin"],
  "/ca": ["ca"],
  "/api/ca": ["ca", "school_admin"],
  "/student": ["student"],
  "/api/student-portal": ["student"],
  "/accounting": ["school_admin", "clerk", "ca"],
  "/api/accounting": ["school_admin", "clerk", "ca"],
  "/admissions": ["school_admin", "clerk"],
  "/api/admissions": ["school_admin", "clerk"],
  "/results": ["school_admin", "teacher", "clerk"],
  "/api/results": ["school_admin", "teacher", "clerk"],
  "/api/results/print": ["school_admin", "teacher", "student", "clerk"],
  "/student/results/print": ["student"],
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
  if (pathname.startsWith("/api/help")) return false;
  if (pathname.startsWith("/api/notifications")) return false;
  return pathname.startsWith("/api/") || !pathname.startsWith("/_next");
}

function resolveSessionToken(request: NextRequest): string | null {
  const cookieToken = request.cookies.get("shs_session")?.value;
  if (cookieToken) return cookieToken;
  return extractBearerToken(request.headers.get("authorization"));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS" && pathname.startsWith("/api/")) {
    return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
  }

  const token = resolveSessionToken(request);
  const session = token ? await parseSessionToken(token) : null;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    if (session && pathname === "/login") {
      return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
    }
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/api/seed/")) {
    return NextResponse.next();
  }

  if (process.env.NODE_ENV !== "production" && pathname.startsWith("/api/dev/")) {
    return NextResponse.next();
  }

  if (pathname === "/" && !session) {
    return NextResponse.next();
  }

  if (pathname === "/" && session) {
    return NextResponse.redirect(new URL(getRoleHome(session.role), request.url));
  }

  if (!token || !session) {
    if (pathname.startsWith("/api/")) {
      const res = NextResponse.json({ error: "Login required" }, { status: 401 });
      for (const [key, value] of Object.entries(corsHeaders(origin))) {
        res.headers.set(key, value);
      }
      return res;
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", pathname);
    if (pathname === "/ca" || pathname.startsWith("/ca/")) {
      login.searchParams.set("portal", "ca");
    }
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

  if (session.role === "teacher" && (pathname === "/attendance" || pathname.startsWith("/attendance/"))) {
    const url = new URL("/teacher/attendance", request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }

  // Chat attachments — staff in same school may view/download (room check in API route)
  if (
    pathname.startsWith("/api/uploads/chat/") &&
    session.schoolId &&
    ["school_admin", "teacher", "clerk"].includes(session.role)
  ) {
    return NextResponse.next();
  }

  if (["teacher", "clerk", "ca"].includes(session.role) && isSchoolAdminRoute(pathname)) {
    const clerkRoutes = [
      "/dashboard",
      "/students", "/api/students",
      "/admissions", "/api/admissions",
      "/accounting", "/api/accounting",
      "/import", "/api/students/bulk-import",
      "/bulk-submit", "/api/students/bulk-submit",
      "/export", "/api/students/export", "/api/reports/export",
      "/api/stats", "/api/stats/export", "/categories",
      "/certificates", "/api/certificates", "/api/general-register",
      "/api/board-records", "/students/board-records",
      "/attendance", "/api/attendance",
      "/attendance/reports", "/api/attendance/reports",
      "/staff", "/api/staff",
      "/staff/attendance", "/staff/payroll", "/api/staff-hr",
      "/chat", "/api/chat",
      "/api/uploads/chat",
      "/api/notifications",
      "/api/help",
      "/id-cards", "/api/id-cards",
      "/classes", "/api/classes",
      "/timetable", "/api/timetable",
      "/results", "/api/results",
      "/auto-apply", "/api/automation",
      "/api/clerk", "/api/school",
      "/profile", "/api/account",
      "/letterhead",
    ];
    const allowed =
      (session.role === "teacher" && (
        pathname.startsWith("/results") ||
        pathname.startsWith("/api/results") ||
        pathname.startsWith("/classes") ||
        pathname.startsWith("/api/classes") ||
        pathname.startsWith("/students/board-records") ||
        pathname.startsWith("/api/board-records") ||
        pathname.startsWith("/api/teacher") ||
        pathname.startsWith("/teacher") ||
        pathname.startsWith("/api/attendance") ||
        pathname.startsWith("/api/timetable") ||
        pathname.startsWith("/timetable") ||
        pathname.startsWith("/certificates/class-register") ||
        pathname.startsWith("/api/certificates") ||
        pathname.startsWith("/chat") ||
        pathname.startsWith("/api/chat") ||
        pathname.startsWith("/api/uploads/chat") ||
        pathname.startsWith("/api/notifications") ||
        pathname.startsWith("/api/help") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/api/account")
      )) ||
      (session.role === "clerk" && clerkRoutes.some((r) => pathname === r || pathname.startsWith(r + "/"))) ||
      (session.role === "ca" && (
        pathname.startsWith("/accounting") ||
        pathname.startsWith("/api/accounting") ||
        pathname.startsWith("/ca") ||
        pathname.startsWith("/api/ca") ||
        pathname.startsWith("/api/notifications") ||
        pathname.startsWith("/api/help") ||
        pathname.startsWith("/profile") ||
        pathname.startsWith("/api/account")
      ));

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
  matcher: ["/((?!_next/static|_next/image|favicon.ico|shs/).*)"],
};
