import { spriteSVG } from "@termina/glyph";
import { publishedIcons } from "@/lib/published";

/**
 * Public SVG sprite of the published glyphs, so another site can use the set
 * with a plain markup reference and no build step:
 *
 *   <svg width="26" height="26"><use href="https://<site>/api/sprite.svg#termina-arrow-up"/></svg>
 */

export const dynamic = "force-static";

export function GET() {
  return new Response(spriteSVG(publishedIcons), {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}
