import { normalizeIcon, uid } from "@termina/glyph";
import { bad, guard, ok } from "@/lib/guard";
import { deleteSubmission, getSubmission, setSubmissionStatus, toView } from "@/lib/submissions";
import { SlugTakenError, slugIsPublished, upsertIcon } from "@/lib/working";
import { publishedIcons } from "@/lib/published";

/**
 * Act on one submission.
 *
 * Accepting does not publish. It copies the submission into the working set as
 * a draft, where it can be edited like anything else and published on the
 * admin's own schedule — so an accepted submission still gets a second look
 * before it reaches the public site.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Action = "accept" | "reject" | "delete";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const { id } = await params;
  const sub = await getSubmission(id);
  if (!sub) return bad("No such submission.", 404);

  let body: { action?: Action; overrides?: Record<string, unknown> };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return bad("The body must be JSON.");
  }

  if (body.action === "delete") {
    await deleteSubmission(id);
    return ok({ ok: true, deleted: true });
  }

  if (body.action === "reject") {
    const next = await setSubmissionStatus(id, "rejected", g.session.login);
    return ok({ ok: true, submission: next ? toView(next) : null });
  }

  if (body.action !== "accept") return bad("Unknown action.");

  // The admin can correct the metadata as part of accepting — a good glyph
  // with a bad slug should not have to be rejected and redrawn.
  const overrides = body.overrides ?? {};
  const slug = String(overrides.slug ?? sub.slug);

  // An edit deliberately shadows the published slug it replaces. A new glyph
  // must not: that would silently overwrite something already shipped.
  if (sub.kind !== "edit" && slug !== sub.targetSlug && slugIsPublished(slug)) {
    return bad(
      `“${slug}” is already published. Accept this with a different slug, or treat it as an edit of the existing glyph.`,
      409
    );
  }

  const live = publishedIcons.find((i) => i.slug === slug);

  const icon = normalizeIcon({
    id: uid(),
    name: overrides.name ?? sub.name,
    slug,
    category: overrides.category ?? sub.category,
    tags: overrides.tags ?? sub.tags,
    pixels: sub.pixels,
    // Credit travels with the glyph into the repo, so a contributor stays
    // credited in the published manifest and the npm package.
    credit: overrides.credit !== undefined ? overrides.credit : sub.credit,
    // Accepted, not published: it lands as a draft in the working set.
    status: "draft",
    // Replacing a live glyph is a new version of it, not a reset to v1.
    version: live ? (live.version ?? 1) + 1 : 1,
  });
  if (!icon) return bad("That submission is malformed.");

  try {
    const saved = await upsertIcon(icon);
    const next = await setSubmissionStatus(id, "accepted", g.session.login);
    return ok({ ok: true, icon: saved, submission: next ? toView(next) : null });
  } catch (err) {
    if (err instanceof SlugTakenError) {
      return bad(
        `${err.message} Give it a different slug when you accept it.`,
        409
      );
    }
    console.error("accepting submission failed", err);
    return bad("Could not accept that submission.", 500);
  }
}
