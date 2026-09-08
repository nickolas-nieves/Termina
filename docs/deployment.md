# Deployment

The site is a Next.js app in `apps/web`, deployed on Netlify from the repository
root so npm workspaces resolve.

## Local development

```bash
npm install
npm run dev
```

That's it. No accounts, no keys, no services. The public site, the editor and
the submission flow all work — submissions are stored as JSON files under
`.data/`, which is gitignored.

The admin console is the only part that needs configuration, because it needs a
real identity to sign in as and a real repository to publish to.

## Environment

Copy `apps/web/.env.example` to `apps/web/.env.local` for local work, and set
the same variables in Netlify's site settings for production.

| Variable | Required | What it's for |
| --- | --- | --- |
| `SESSION_SECRET` | Production | Signs the admin session cookie. Must be ≥32 characters. |
| `ADMIN_GITHUB_LOGINS` | For admin | Comma-separated GitHub logins allowed into `/admin`. |
| `GITHUB_CLIENT_ID` | For admin | From the GitHub OAuth app. |
| `GITHUB_CLIENT_SECRET` | For admin | From the GitHub OAuth app. |
| `GITHUB_REPO` | For publishing | `owner/repo` the icon set is committed to. |
| `GITHUB_BRANCH` | No | Defaults to `main`. |
| `GITHUB_OAUTH_SCOPE` | Private repos | `repo` if the repository is private. Defaults to `public_repo`. |
| `PUBLIC_SITE_URL` | Production | The canonical origin. |

Three of these fail closed on purpose:

- **`SESSION_SECRET`** — in production the app throws on startup rather than
  falling back to a known development value. A guessable signing key would let
  anyone mint an admin cookie.
- **`ADMIN_GITHUB_LOGINS`** — empty means *nobody* is an admin, not everybody.
  A fork of this repository inherits no publish rights.
- **`PUBLIC_SITE_URL`** — without it the OAuth redirect falls back to the
  request's `Host` header, which a client controls. Set it in production.

Generate a session secret with:

```bash
openssl rand -base64 48
```

## Setting up admin sign-in

1. On GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: your site's URL
   - Authorization callback URL: `https://<your-site>/api/auth/callback`
2. Copy the Client ID; generate a client secret and copy it.
3. Set `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `ADMIN_GITHUB_LOGINS` (your
   GitHub username) and `GITHUB_REPO` in Netlify.
4. Redeploy so the functions pick up the new environment.

For local development, register a **second** OAuth app with the callback
`http://localhost:3000/api/auth/callback`. GitHub allows one callback URL per
app, and you don't want your production secret in a `.env.local`.

### Why your own GitHub account

Publishing commits to the repository using the OAuth token of whoever is signed
in. That means:

- Every publish is attributed to a person, visible in `git log`.
- There is no long-lived write credential sitting in the environment for someone
  to find.
- Losing admin access is a matter of removing a login from
  `ADMIN_GITHUB_LOGINS`, checked on every request.

The account you sign in with needs push access to `GITHUB_REPO`. The OAuth
scope requested is `public_repo` — the narrowest that can push to a public
repository — plus `read:user` to resolve the login for the allowlist. No email
scope is requested.

**If your repository is private**, set `GITHUB_OAUTH_SCOPE=repo`. The
`public_repo` scope cannot see private repositories at all, and GitHub reports
that as `404 Not Found` rather than a permissions error, which reads like a
typo in `GITHUB_REPO`. After changing it you have to sign out and back in: a
token keeps whatever scope it was issued with.

## Deploying to Netlify

```bash
npx netlify-cli login
npx netlify-cli init
npx netlify-cli deploy --prod
```

`netlify.toml` sets the build to `npm run icons:check && npm run build` — the
integrity check runs first, so a malformed icon set fails the deploy rather than
shipping.

### Setting the environment from the CLI

```bash
npx netlify-cli env:set SESSION_SECRET "$(openssl rand -base64 48)"
npx netlify-cli env:set ADMIN_GITHUB_LOGINS "your-github-username"
npx netlify-cli env:set GITHUB_REPO "nickolas-nieves/Termina"
npx netlify-cli env:set PUBLIC_SITE_URL "https://your-site.netlify.app"
```

Set `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` through the Netlify UI rather
than the CLI, so the secret doesn't land in your shell history.

## Storage

Two backends, chosen automatically:

- **On Netlify** — Netlify Blobs. No setup; it's part of the platform.
- **Anywhere else** — JSON files under `.data/` at the repository root.

Three stores are used, all private and none reachable without an admin session
(except the rate-limit store, which the submission route writes to):

| Store | Holds |
| --- | --- |
| `termina-sessions` | Admin sessions, including their GitHub tokens |
| `termina-admin` | The working set — drafts and unpublished edits |
| `termina-submissions` | The public review queue |
| `termina-limits` | Rate-limit counters and spent submission tickets |

The published icon set is **not** in any of them. It lives in `icons/` in git and
is read at build time, so the public pages have no runtime data dependency and
stay up even if every backing service is down.

## Deploying somewhere other than Netlify

Nothing is Netlify-specific except the Blobs backend and `netlify.toml`. On
Vercel or a container host, the filesystem store will be used — which is fine on
a persistent disk and **not** fine on ephemeral serverless storage, where
sessions and submissions would vanish between invocations.

To run elsewhere properly, add a backend to `apps/web/lib/store.ts`
implementing the four-method `Store` interface. It's about thirty lines.
