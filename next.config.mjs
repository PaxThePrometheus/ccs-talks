/** @type {import('next').NextConfig} */

const isDev = process.env.NODE_ENV === "development";

/**
 * App-wide CSP without nonces (preserves static rendering).
 * - `'unsafe-inline'` is required for `style-src` because we author UI with
 *   inline `style={{ ... }}` props throughout the SPA.
 * - `'unsafe-eval'` is only allowed in development (React DevTools / Turbopack).
 *   Production runs without it.
 * - `frame-ancestors 'none'` blocks clickjacking; `object-src 'none'` removes
 *   plugin attack surface; `base-uri` / `form-action` lock down injection
 *   primitives an attacker would need to abuse stored content.
 */
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspDirectives },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
];

const nextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
