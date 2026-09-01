import { normalizeIcon } from "@termina/glyph";
import { bad, guard, ok } from "@/lib/guard";
import { SlugTakenError, deleteWorkingIcon, mergedEntries, upsertIcon } from "@/lib/working";

/** The admin working set: everything not yet committed to the repo. */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;
  return ok({ entries: await mergedEntries() });
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("The body must be JSON.");
  }

  // Normalised before it goes near the store, exactly as an anonymous
  // submission would be: an authenticated client is still a client.
  const icon = normalizeIcon(body);
  if (!icon) return bad("That isn't a glyph.");

  try {
    const saved = await upsertIcon(icon);
    return ok({ icon: saved });
  } catch (err) {
    if (err instanceof SlugTakenError) return bad(err.message, 409);
    console.error("working set write failed", err);
    return bad("Could not save that glyph.", 500);
  }
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return bad("Which glyph?");
  const removed = await deleteWorkingIcon(id);
  if (!removed) return bad("No such glyph in the working set.", 404);
  return ok({ ok: true });
}
