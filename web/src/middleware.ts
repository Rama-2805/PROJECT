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
];

const authRoutes = ["/auth/login", "/auth/register", "/auth/forgot-password"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check if the route is public
  const isPublic = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(route),
  );

  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Check for auth tokens in cookies (both custom refreshToken and NextAuth tokens)
  const refreshToken = request.cookies.get("refreshToken")?.value;
  const nextAuthToken = request.cookies.get("next-auth.session-token")?.value || 
                        request.cookies.get("__Secure-next-auth.session-token")?.value;

  const isAuthenticated = !!refreshToken || !!nextAuthToken;

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Protect dashboard routes
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)",
  ],
};
