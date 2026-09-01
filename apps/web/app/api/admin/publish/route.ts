import { bad, guard, ok } from "@/lib/guard";
import { GitHubError, commitFiles, headSha, repoTarget } from "@/lib/github";
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
      repoError = err instanceof Error ? err.message : "Could not reach GitHub.";
    }
  }

  return ok({
    configured: Boolean(target),
    repo: target ? `${target.owner}/${target.repo}` : null,
    branch: target?.branch ?? null,
    head,
    repoError,
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

  let body: { expectedHead?: string | null };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    body = {};
  }

  const plan = await planPublish();
  if (!plan.added.length && !plan.modified.length && !plan.removed.length) {
    return bad("Nothing to publish — the repo already matches the working set.");
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
      added: plan.added.length,
      modified: plan.modified.length,
      removed: plan.removed.length,
    });
  } catch (err) {
    if (err instanceof GitHubError) {
      const hint =
        err.status === 403 || err.status === 404
          ? " Check that your GitHub account can push to this repository."
          : "";
      return bad(err.message + hint, err.status === 409 ? 409 : 502);
    }
    console.error("publish failed", err);
    return bad("The publish failed. Nothing was committed.", 500);
  }
}
