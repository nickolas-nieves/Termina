import { getStore } from "@netlify/blobs";
import { json } from "../lib/glyph.mjs";

/**
 * Public, unauthenticated read of the published snapshot. This is what the
 * future public icon-set site fetches — from any origin.
 *
 * Nothing here reads the private working set, so unpublished glyphs cannot
 * leak through this route.
 *
 *   GET /api/set
 */

const PUBLISHED_KEY = "published.json";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "cache-control": "public, max-age=60, stale-while-revalidate=600"
};

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405, CORS);

  const store = getStore({ name: "termina", consistency: "strong" });
  const snapshot = await store.get(PUBLISHED_KEY, { type: "json" });

  if (!snapshot) {
    return json(
      { format: "termina-iconset", version: 1, grid: 13, count: 0, icons: [], publishedAt: null },
      200,
      CORS
    );
  }
  return json(snapshot, 200, CORS);
};

export const config = { path: "/api/set" };
