import NextAuth from "next-auth";
import { NextResponse, type NextRequest } from "next/server";
import { authConfig } from "./auth.config";

const { auth } = NextAuth(authConfig);

/**
 * Strict, nonce-based CSP on every HTML response, plus staff-area gating.
 * Authorization proper lives server-side in lib/authz.ts — this is the
 * outer door, not the lock.
 */
function csp(nonce: string): string {
  const dev = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https://*.public.blob.vercel-storage.com",
    "font-src 'self' data:",
    "connect-src 'self' https://*.public.blob.vercel-storage.com",
    "media-src 'self' data:",
    "worker-src 'self'",
    "manifest-src 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const user = req.auth?.user;

  const isStaffArea = pathname.startsWith("/admin") || pathname.startsWith("/board") || pathname.startsWith("/me");
  if (isStaffArea && !user) {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && user && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/board", req.nextUrl));
  }
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL(user.role === "ADMIN" ? "/admin" : "/board", req.nextUrl));
  }

  const nonce = btoa(crypto.randomUUID());
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  const policy = csp(nonce);
  requestHeaders.set("content-security-policy", policy);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  res.headers.set("content-security-policy", policy);
  return res;
});

export const config = {
  matcher: [
    // everything except static assets and the print/pdf endpoints
    "/((?!_next/static|_next/image|icons/|sw.js|manifest.webmanifest|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|avif|svg|ico|woff2?|mp3)$).*)",
  ],
};
