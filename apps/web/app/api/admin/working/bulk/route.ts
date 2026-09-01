import { STATUSES, type Status } from "@termina/glyph";
import { bad, guard, ok } from "@/lib/guard";
import { bulkSetStatus } from "@/lib/working";

/**
 * Set the status of many working glyphs in one request.
 *
 * The set page can select the whole working set at once, so this exists to
 * make that one store write rather than one per glyph.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/* Generous, but bounded: the working set is not expected to reach this, and an
   unbounded array is an unbounded amount of work for one request. */
const MAX_IDS = 2000;

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  let body: { ids?: unknown; status?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("The body must be JSON.");
  }

  if (!Array.isArray(body.ids)) return bad("Expected an array of glyph ids.");
  if (!body.ids.length) return bad("No glyphs selected.");
  if (body.ids.length > MAX_IDS) return bad(`Too many glyphs at once — the limit is ${MAX_IDS}.`);

  const ids = body.ids.filter((id): id is string => typeof id === "string").slice(0, MAX_IDS);
  if (!ids.length) return bad("No usable glyph ids.");

  if (!STATUSES.includes(body.status as Status)) {
    return bad(`Status must be one of: ${STATUSES.join(", ")}.`);
  }

  const result = await bulkSetStatus(ids, body.status as Status);
  return ok(result);
}
