import { bad, guard, ok } from "@/lib/guard";
import { GitHubError, commitFiles, explainGitHubError, headSha, repoTarget } from "@/lib/github";
import { buildChanges, commitMessage } from "@/lib/publish";
import { clearPublished, planPublish } from "@/lib/working";

/**
 * Publish: commit the working set into `icons/` on the default branch.
 *
 * The plan is computed server-side and returned by GET, so the confirmation
 * dialog shows the real diff rather than a guess. The commit is attributed to
 * the signed-in admin's own GitHub account, and is a compare-and-swap against
 * the branch head — if main moved in between, the publish is refused instead
 * of overwriting whatever landed.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_IDS = 2000;

export async function GET(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const target = repoTarget();
  const plan = await planPublish();

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

export async function POST(req: Request) {
  const g = await guard(req);
  if (!g.ok) return g.response;

  const target = repoTarget();
  if (!target) {
    return bad(
      "GITHUB_REPO is not set, so there is nowhere to publish to. See docs/deployment.md.",
      500
    );
  }

  let body: { expectedHead?: string | null; ids?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  // The plan is recomputed here from the same ids rather than trusted from the
  // client: the dialog shows a preview, but what gets committed is derived
  // server-side from the working set as it stands right now.
  let ids: string[] | undefined;
  if (Array.isArray(body.ids)) {
    if (body.ids.length > MAX_IDS) return bad(`Too many glyphs at once — the limit is ${MAX_IDS}.`);
    ids = body.ids.filter((id): id is string => typeof id === "string");
    if (!ids.length) return bad("No glyphs selected.");
  }

  const plan = await planPublish(ids ? { ids } : {});
  if (!plan.added.length && !plan.modified.length && !plan.removed.length) {
    return bad(
      ids
        ? "Nothing to publish in that selection — those glyphs are either unchanged or not marked final."
        : "Nothing to publish — the repo already matches the working set."
    );
  }

  const publishedAt = new Date().toISOString();
  const files = buildChanges({ ...plan, publishedAt });

  try {
    const commit = await commitFiles({
      token: g.session.githubToken,
      target,
      message: commitMessage({ ...plan, login: g.session.login }),
      files,
      expectedHeadSha: body.expectedHead ?? null,
    });

    // These glyphs live in git now. Leaving them in the working set would show
    // every published glyph as a pending edit forever.
    await clearPublished([
      ...plan.added.map((i) => i.slug),
      ...plan.modified.map((i) => i.slug),
      ...plan.removed,
    ]);

    return ok({
      ok: true,
      commit: commit.sha.slice(0, 7),
      url: commit.url,
      scoped: plan.scoped,
      added: plan.added.length,
      modified: plan.modified.length,
      removed: plan.removed.length,
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      // 409 is the compare-and-swap losing to a concurrent push, which is a
      // conflict the caller can retry — everything else is a bad gateway.
      return bad(explainGitHubError(err, target), err.status === 409 ? 409 : 502);
    }
    console.error("publish failed", err);
    return bad("The publish failed. Nothing was committed.", 500);
  }
}
