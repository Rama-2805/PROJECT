import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicRoutes = [
  "/",
  "/features",
  "/technology",
  "/pricing",
  "/contact",
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/login",
  "/login/teacher",
  "/login/admin",
];

const authRoutes = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

export interface VerifiedJwtPayload {
  id?: string;
  sub?: string;
  email?: string;
  institutionId?: string;
  roles?: string[];
  exp?: number;
}

/**
 * Cryptographically verifies an HMAC-SHA256 JWT using the Web Crypto API.
 * Enforces algorithm HS256, expiration claims, and signature authenticity.
 * Rejects forged, malformed, or algorithm-substituted tokens.
 * Returns the cryptographically verified payload or null.
 */
async function verifyAndDecodeJwt(
  token: string | undefined,
  secret: string | undefined,
): Promise<VerifiedJwtPayload | null> {
  if (!token || typeof token !== "string" || !secret) return null;
  if (token.startsWith("mock-") || token.includes("mock-token")) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;

  try {
    // 1. Enforce strict HS256 algorithm and JWT type
    const headerStr = atob(headerB64.replace(/-/g, "+").replace(/_/g, "/"));
    const header = JSON.parse(headerStr);
    if (header.alg !== "HS256") return null;

    // 2. Validate expiration claims
    const payloadStr = atob(payloadB64.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(payloadStr);
    if (!payload || typeof payload !== "object") return null;
    if (typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() - 5000) {
      return null;
    }

    // 3. Cryptographically verify signature using Web Crypto HMAC-SHA256
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const dataToVerify = encoder.encode(`${headerB64}.${payloadB64}`);

    let b64Sig = signatureB64.replace(/-/g, "+").replace(/_/g, "/");
    while (b64Sig.length % 4 !== 0) {
      b64Sig += "=";
    }
    const binarySig = atob(b64Sig);
    const sigBytes = new Uint8Array(binarySig.length);
    for (let i = 0; i < binarySig.length; i++) {
      sigBytes[i] = binarySig.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, sigBytes, dataToVerify);
    if (isValid) {
      return payload as VerifiedJwtPayload;
    }
    return null;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route)),
  );
  const isAuthRoute = authRoutes.some(
    (route) => pathname === route || (route !== "/" && pathname.startsWith(route)),
  );

  // Allow static public marketing pages to bypass crypto signature verification
  if (isPublicRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  // Check for auth tokens in cookies
  const accessToken = request.cookies.get("smartcampus_access_token")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  const accessSecrets = [
    process.env.JWT_ACCESS_SECRET,
    process.env.JWT_SECRET,
    "sc-ai-access-secret-change-in-production",
    "sc-ai-access-secret-dev-only",
    "dev-jwt-secret-do-not-use-in-production-123",
  ].filter(Boolean) as string[];

  const refreshSecrets = [
    process.env.JWT_REFRESH_SECRET,
    "sc-ai-refresh-secret-change-in-production",
    "refresh-secret-dev-only",
    "dev-refresh-secret-do-not-use-in-production-456",
  ].filter(Boolean) as string[];

  let verifiedPayload: VerifiedJwtPayload | null = null;

  for (const secret of accessSecrets) {
    const payload = await verifyAndDecodeJwt(accessToken, secret);
    if (payload) {
      verifiedPayload = payload;
      break;
    }
  }

  if (!verifiedPayload) {
    for (const secret of refreshSecrets) {
      const payload = await verifyAndDecodeJwt(refreshToken, secret);
      if (payload) {
        verifiedPayload = payload;
        break;
      }
    }
  }

  const isAuthenticated = Boolean(verifiedPayload);
  const userRoles = verifiedPayload?.roles || [];

  const isStudent = userRoles.includes("STUDENT");
  const isTeacher = userRoles.includes("TEACHER");
  const isHod = userRoles.includes("HOD");
  const isAdmin = userRoles.some((r) =>
    [
      "SUPER_ADMIN",
      "COLLEGE_SUPER_ADMIN",
      "INSTITUTION_ADMIN",
      "COLLEGE_ADMIN",
      "DEVICE_MANAGER",
      "RESEARCH_ANALYST",
    ].includes(r),
  );

  // Helper for determining the user's home dashboard
  const getDefaultHome = () => {
    if (isStudent && !isAdmin && !isTeacher) return "/student/dashboard";
    if (isTeacher && !isAdmin) return "/teacher/dashboard";
    if (isHod && !isAdmin) return "/dashboard/hod";
    return "/dashboard";
  };

  // Redirect authenticated users away from auth/login pages to their role-appropriate home
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL(getDefaultHome(), request.url));
  }

  // ── Biometric Storage & Asset Protection (SEC-10 & SEC-11) ─────────────────
  if (pathname.startsWith("/storage")) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { error: "Unauthorized: Active authenticated session required to access biometric assets" },
        { status: 401 },
      );
    }
    return NextResponse.next();
  }

  // ── Unauthenticated Redirections ───────────────────────────────────────────
  if (!isAuthenticated) {
    if (pathname.startsWith("/teacher")) {
      const loginUrl = new URL("/login/teacher", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/dashboard")) {
      const loginUrl = new URL("/login/admin", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname.startsWith("/student")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
  }

  // ── Role-Aware Authorization Guards (Authenticated) ────────────────────────
  // Student Portal Guard: Only students (or platform admins) may enter
  if (pathname.startsWith("/student")) {
    if (!isStudent && !isAdmin) {
      return NextResponse.redirect(new URL(getDefaultHome(), request.url));
    }
    return NextResponse.next();
  }

  // Teacher Portal Guard: Teachers, HODs, or Admins
  if (pathname.startsWith("/teacher")) {
    if (!isTeacher && !isHod && !isAdmin) {
      // Unauthorized user (e.g. Student) trying to enter Teacher portal
      return NextResponse.redirect(new URL(getDefaultHome(), request.url));
    }
    return NextResponse.next();
  }

  // HOD Dashboard Guard: HODs or Admins
  if (pathname.startsWith("/dashboard/hod")) {
    if (!isHod && !isAdmin) {
      return NextResponse.redirect(new URL(getDefaultHome(), request.url));
    }
    return NextResponse.next();
  }

  // General Admin Dashboard Guard: Administrators or HODs
  if (pathname.startsWith("/dashboard")) {
    if (!isAdmin && !isHod) {
      // Unauthorized user (e.g. Student or pure Teacher) trying to access Admin dashboard
      return NextResponse.redirect(new URL(getDefaultHome(), request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
