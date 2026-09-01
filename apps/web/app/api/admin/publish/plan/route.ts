import { bad, guard, ok } from "@/lib/guard";
import { explainGitHubError, headSha, repoTarget } from "@/lib/github";
import { planPublish } from "@/lib/working";

/**
 * Preview what a publish would change, optionally scoped to a selection.
 *
 * A POST rather than a GET because the selection can be hundreds of ids, which
 * does not belong in a query string. It reads and commits nothing — the plan
 * is the thing the confirmation dialog renders before anything happens.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IDS = 2000;

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  let body: { ids?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  let ids: string[] | undefined;
  if (Array.isArray(body.ids)) {
    if (body.ids.length > MAX_IDS) return bad(`Too many glyphs at once — the limit is ${MAX_IDS}.`);
    ids = body.ids.filter((id): id is string => typeof id === "string");
    if (!ids.length) return bad("No glyphs selected.");
  }

  const target = repoTarget();
  const plan = await planPublish(ids ? { ids } : {});

  // The branch head is read here and echoed back with the commit, so a publish
  // is refused if main moves in between.
  let head: string | null = null;
  let repoError: string | null = null;
  if (target) {
    try {
      head = await headSha(g.session.githubToken, target);
    } catch (err) {
      repoError = explainGitHubError(err, target);
    }
  }

  return ok({
    configured: Boolean(target),
    repo: target ? `${target.owner}/${target.repo}` : null,
    branch: target?.branch ?? null,
    head,
    repoError,
    scoped: plan.scoped,
    excludedRemovals: plan.excludedRemovals,
    // How many glyphs the published set will hold afterwards. A scoped publish
    // must still write the whole manifest, so this is the guard against one
    // silently truncating the set to just the selection.
    nextCount: plan.next.length,
    added: plan.added,
    modified: plan.modified,
    removed: plan.removed,
    held: plan.held.map((i) => ({ slug: i.slug, name: i.name, status: i.status })),
  });
}
