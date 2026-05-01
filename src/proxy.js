/**
 * Next.js 16 Proxy (formerly Middleware) — runs at the edge before the route.
 *
 * Responsibility: layered CSRF protection on mutating `/api/*` requests.
 *
 * - Cookies are already `SameSite=Lax` + `httpOnly`, which blocks most
 *   cross-site cookie attacks. We belt-and-suspender by also rejecting
 *   POST/PATCH/PUT/DELETE whose `Origin` (or `Referer`, as fallback) doesn't
 *   match this server's origin.
 * - Same-origin requests from the SPA always send a matching Origin header.
 * - GET/HEAD/OPTIONS pass through unchanged.
 */

import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function sameOrigin(headerValue, expected) {
  if (!headerValue) return false;
  try {
    const u = new URL(headerValue);
    return `${u.protocol}//${u.host}` === expected;
  } catch {
    return false;
  }
}

export function proxy(request) {
  const { method } = request;
  if (SAFE_METHODS.has(method)) return NextResponse.next();

  const url = new URL(request.url);
  const expected = `${url.protocol}//${url.host}`;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  /** Accept if Origin matches; otherwise fall back to Referer for clients that
   *  omit Origin on same-origin requests (rare, but spec-permitted). */
  const ok = origin
    ? origin === expected
    : sameOrigin(referer, expected);

  if (!ok) {
    return NextResponse.json(
      { error: "cross_site_request_blocked" },
      { status: 403 },
    );
  }

  return NextResponse.next();
}

export const config = {
  /** Only guard mutating API surface; HTML routes and static assets are unaffected. */
  matcher: ["/api/:path*"],
};
