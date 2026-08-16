import { getStore } from "@netlify/blobs";
import { rectList } from "../lib/glyph.mjs";

/**
 * Public SVG sprite of the published glyphs, so another site can use the set
 * with a plain markup reference and no build step:
 *
 *   <svg width="26" height="26"><use href="https://<site>/api/sprite.svg#termina-arrow-up"/></svg>
 *
 *   GET /api/sprite.svg
 */

const PUBLISHED_KEY = "published.json";

export default async () => {
  const store = getStore({ name: "termina", consistency: "strong" });
  const snapshot = await store.get(PUBLISHED_KEY, { type: "json" });
  const icons = (snapshot && snapshot.icons) || [];

  const symbols = icons
    .map(i => `  <symbol id="termina-${i.slug}" viewBox="0 0 13 13">${rectList(i.pixels).join("")}</symbol>`)
    .join("\n");

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" fill="currentColor">\n` +
    `${symbols}\n</svg>\n`;

  return new Response(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=60, stale-while-revalidate=600"
    }
  });
};

export const config = { path: "/api/sprite.svg" };
