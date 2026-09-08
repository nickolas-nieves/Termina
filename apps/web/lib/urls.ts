import "server-only";

/**
 * Where the site actually lives.
 *
 * Derived from PUBLIC_SITE_URL in production rather than from the request's
 * Host header, which a client controls — a forged Host would otherwise let
 * someone bend the OAuth redirect to a domain they own.
 */
export function siteOrigin(req: Request): string {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* misconfigured — fall through to the request origin */
    }
  }
  if (process.env.NODE_ENV !== "production") return new URL(req.url).origin;
  // No PUBLIC_SITE_URL in production is a deployment mistake; using the request
  // origin here is the least-bad fallback and is logged once per call site.
  console.warn("PUBLIC_SITE_URL is not set — falling back to the request origin.");
  return new URL(req.url).origin;
}

/**
 * The canonical origin, for metadata that is generated with no request in hand
 * — `robots.ts`, `sitemap.ts`, `metadataBase`.
 *
 * There is deliberately no production hostname baked in here. A fork that
 * forgets PUBLIC_SITE_URL should get obviously-wrong localhost URLs in its
 * sitemap rather than quietly advertising somebody else's deployment.
 */
export function publicSiteUrl(): string {
  const configured = process.env.PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      /* misconfigured — fall through */
    }
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("PUBLIC_SITE_URL is not set — canonical URLs will be wrong.");
  }
  return "http://localhost:3000";
}

export function redirectUri(req: Request): string {
  return `${siteOrigin(req)}/api/auth/callback`;
}

/**
 * Only ever redirect to a path on this site. An open redirect here would turn
 * the sign-in link into a credible phishing vector.
 */
export function safeNext(value: string | null | undefined): string {
  if (!value) return "/admin";
  if (!value.startsWith("/") || value.startsWith("//")) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  return value;
}
