import { bad, guard, ok } from "@/lib/guard";
import { stageRemoval } from "@/lib/working";

/**
 * Stage or unstage the removal of a published glyph. Nothing is deleted here —
 * the removal only happens when the next publish commits.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  let body: { slug?: string; remove?: boolean };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("The body must be JSON.");
  }
  if (!body.slug) return bad("Which glyph?");

  const doc = await stageRemoval(body.slug, body.remove !== false);
  return ok({ removed: doc.removed });
}
