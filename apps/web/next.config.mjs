/**
 * Content-Security-Policy.
 *
 * `script-src` keeps 'unsafe-inline': the App Router streams its hydration
 * payload as inline `self.__next_f.push(...)` scripts on every page, static
 * ones included, and the only way to whitelist those is a per-request nonce
 * from middleware — which forces every page to render dynamically and would
 * cost this site its static, CDN-cached icon pages for very little. The app
 * renders no user-supplied markup anywhere (glyphs are built as elements, see
 * components/Glyph.tsx), so script injection has no foothold to begin with.
 *
 * Everything else is locked down, and those directives are where the value is
 * here: `object-src`/`base-uri`/`form-action` shut down the plugin, base-tag
 * and form-hijacking classes outright, and `frame-ancestors` backs up
 * X-Frame-Options for browsers that prefer CSP.
 *
 * To tighten `script-src` later: add middleware that mints a nonce per request
 * and sets this header with `'nonce-<value>' 'strict-dynamic'`, give
 * ThemeScript the same nonce, and accept dynamic rendering.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  // Inline `style={{...}}` attributes are used throughout the editor and admin.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "manifest-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @termina/glyph ships as untranspiled ESM source so the repo scripts can
  // import it without a build step; Next has to compile it like app code.
  transpilePackages: ["@termina/glyph"],
  eslint: { dirs: ["app", "components", "lib"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
      {
        // The feed and the sprite exist to be consumed from other origins.
        source: "/api/:path(set|sprite.svg)",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
        ],
      },
      {
        source: "/fonts/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
