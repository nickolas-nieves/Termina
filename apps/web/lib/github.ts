import "server-only";

/**
 * Everything that talks to GitHub: the OAuth handshake for admin sign-in, and
 * the Git Data API calls that turn "Publish" into a real commit on the repo.
 *
 * Publishing uses the signed-in admin's own OAuth token, so every publish is
 * attributed to a person and there is no long-lived write credential sitting
 * in the environment. `GITHUB_TOKEN` is honoured as a fallback for self-hosted
 * forks and CI.
 */

const API = "https://api.github.com";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatarUrl: string | null;
}

export interface RepoTarget {
  owner: string;
  repo: string;
  branch: string;
}

export function repoTarget(): RepoTarget | null {
  const slug = process.env.GITHUB_REPO;
  if (!slug) return null;
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) return null;
  return { owner, repo, branch: process.env.GITHUB_BRANCH || "main" };
}

/* ── OAuth ───────────────────────────────────────────────── */

export function authorizeUrl(state: string, redirectUri: string): string {
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);
  // `public_repo` is the narrowest scope that can push a commit to a public
  // repository. `read:user` is only there to resolve the login for the
  // allowlist check — no email scope is requested.
  url.searchParams.set("scope", "public_repo read:user");
  url.searchParams.set("allow_signup", "false");
  return url.toString();
}

export async function exchangeCode(code: string, redirectUri: string): Promise<string | null> {
  const res = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const body = (await res.json()) as { access_token?: string; error?: string };
  return body.access_token ?? null;
}

export async function fetchUser(token: string): Promise<GitHubUser | null> {
  const res = await fetch(`${API}/user`, {
    headers: gh(token),
    cache: "no-store",
  });
  if (!res.ok) return null;
  const u = (await res.json()) as { login?: string; name?: string | null; avatar_url?: string | null };
  if (!u.login) return null;
  return { login: u.login, name: u.name ?? null, avatarUrl: u.avatar_url ?? null };
}

function gh(token: string): HeadersInit {
  return {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "termina-icons",
  };
}

/* ── committing ──────────────────────────────────────────── */

export interface FileChange {
  path: string;
  /** UTF-8 contents, or null to delete the file. */
  content: string | null;
}

export class GitHubError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "GitHubError";
  }
}

async function call<T>(token: string, url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url.startsWith("http") ? url : `${API}${url}`, {
    ...init,
    headers: { ...gh(token), "content-type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let detail = text.slice(0, 300);
    try {
      detail = (JSON.parse(text) as { message?: string }).message ?? detail;
    } catch { /* not JSON — keep the raw text */ }
    throw new GitHubError(`GitHub ${res.status}: ${detail}`, res.status);
  }
  return (await res.json()) as T;
}

/**
 * Commit a set of file changes in one commit.
 *
 * `expectedHeadSha` makes this a compare-and-swap: if main moved since the
 * admin console read it, the publish is refused rather than silently
 * clobbering whatever landed in between.
 */
export async function commitFiles(opts: {
  token: string;
  target: RepoTarget;
  message: string;
  files: FileChange[];
  expectedHeadSha?: string | null;
}): Promise<{ sha: string; url: string }> {
  const { token, target, message, files } = opts;
  const base = `/repos/${target.owner}/${target.repo}`;

  const ref = await call<{ object: { sha: string } }>(token, `${base}/git/ref/heads/${target.branch}`);
  const headSha = ref.object.sha;

  if (opts.expectedHeadSha && opts.expectedHeadSha !== headSha) {
    throw new GitHubError(
      `The ${target.branch} branch moved since this page was loaded. Reload the admin console and publish again.`,
      409
    );
  }

  const headCommit = await call<{ tree: { sha: string } }>(token, `${base}/git/commits/${headSha}`);

  const tree = await Promise.all(
    files.map(async (f) => {
      if (f.content === null) {
        return { path: f.path, mode: "100644" as const, type: "blob" as const, sha: null };
      }
      const blob = await call<{ sha: string }>(token, `${base}/git/blobs`, {
        method: "POST",
        body: JSON.stringify({ content: f.content, encoding: "utf-8" }),
      });
      return { path: f.path, mode: "100644" as const, type: "blob" as const, sha: blob.sha };
    })
  );

  const newTree = await call<{ sha: string }>(token, `${base}/git/trees`, {
    method: "POST",
    body: JSON.stringify({ base_tree: headCommit.tree.sha, tree }),
  });

  const commit = await call<{ sha: string; html_url: string }>(token, `${base}/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message, tree: newTree.sha, parents: [headSha] }),
  });

  await call(token, `${base}/git/refs/heads/${target.branch}`, {
    method: "PATCH",
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });

  return { sha: commit.sha, url: commit.html_url };
}

export async function headSha(token: string, target: RepoTarget): Promise<string> {
  const ref = await call<{ object: { sha: string } }>(
    token,
    `/repos/${target.owner}/${target.repo}/git/ref/heads/${target.branch}`
  );
  return ref.object.sha;
}

/** Read a file's current contents, or null when it does not exist. */
export async function readFile(token: string, target: RepoTarget, path: string): Promise<string | null> {
  try {
    const res = await call<{ content: string; encoding: string }>(
      token,
      `/repos/${target.owner}/${target.repo}/contents/${encodeURI(path)}?ref=${encodeURIComponent(target.branch)}`
    );
    return Buffer.from(res.content, res.encoding as BufferEncoding).toString("utf8");
  } catch (err) {
    if (err instanceof GitHubError && err.status === 404) return null;
    throw err;
  }
}
