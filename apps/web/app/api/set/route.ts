import { feed } from "@/lib/published";

/**
 * The public JSON feed. Unauthenticated and CORS-open by design — this is the
 * seam other sites build against.
 *
 *   GET /api/set
 */

export const dynamic = "force-static";

const CORS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
};

export function GET() {
  return new Response(JSON.stringify(feed(), null, 2), { status: 200, headers: CORS });
}

/* No OPTIONS handler on purpose: a cross-origin GET with no custom headers is
   a simple request and never preflights, and exporting one would opt this
   route out of static generation for nothing. */
