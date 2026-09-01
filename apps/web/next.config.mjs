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
