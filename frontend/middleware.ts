import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Presence-only gate for the admin area.
 *
 * The backend JwtAuthGuard is the real authority (it validates signature,
 * expiry, and tokenVersion). This middleware only avoids rendering admin
 * screens when no auth cookie exists at all; an expired or forged cookie still
 * reaches the page and is caught by the 401 handling in `lib/api.ts`.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login must stay reachable or the redirect below loops forever.
  if (pathname === "/admin/login") return NextResponse.next();

  if (!request.cookies.get("raccoon_auth_token")) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
