# Publishing `termina-icons` to npm

You said you haven't published a package before, so this starts from the
beginning. If you already know what npm is, skip to
[The first publish](#the-first-publish).

---

## 1. What a package actually is

An npm package is a `.tgz` archive with a `package.json` at its root, uploaded
to a registry (npmjs.com by default). When someone runs `npm install
termina-icons`, npm downloads that archive and unpacks it into their
`node_modules/termina-icons/`. That's the whole mechanism. There is no build
step on their machine and no server involved at runtime — it's file transfer.

Three consequences that matter:

**The archive must contain finished files.** Nobody compiles your package for
you. Whatever a consumer imports has to already exist in the tarball. That's why
this repo has a build step (`packages/icons/scripts/build.mjs`) that generates
`dist/` before publishing.

**A published version is permanent.** You cannot re-upload `0.1.0` with
different contents. If you publish a mistake, you publish `0.1.1` on top of it.
(There is a 72-hour unpublish window for brand-new packages — see
[Mistakes](#mistakes-and-how-to-undo-them) — but treat it as unavailable.)

**The name is global and first-come.** `termina-icons` is claimed by whoever
publishes it first. If it's taken by the time you get there, you'll need a
different name or a scope (see below).

### `package.json`, in the parts that matter here

Open [`packages/icons/package.json`](../packages/icons/package.json) alongside
this.

| Field | What it does |
| --- | --- |
| `name` | The install name. Global and permanent once published. |
| `version` | Semantic version. Must be higher than the last published one. |
| `files` | **Whitelist** of what goes in the tarball. Ours is `["dist", "README.md", "LICENSE"]`, so source and scripts are excluded. |
| `exports` | The map of import paths to files. This is what makes `termina-icons/react` resolve. |
| `types` | Where TypeScript looks for type declarations. |
| `peerDependencies` | Packages the consumer must supply. React is here, marked optional, so a non-React consumer isn't nagged. |
| `sideEffects: false` | Tells bundlers unused exports can be dropped — this is what makes importing one icon not ship all of them. |
| `publishConfig.access` | `"public"` — required for scoped packages, harmless otherwise. |
| `prepublishOnly` | A script npm runs automatically before publishing. Ours rebuilds and verifies. |

### How icon-set packages are usually structured

Icon sets have an awkward shape: people want them as React components, as Vue
components, as raw files, and as metadata for search UIs. The convention that
has settled across Lucide, Phosphor and friends is:

1. **The icons themselves live outside the package**, in a plain directory of
   SVGs at the repository root. That's `icons/` here. It's the artefact people
   send pull requests against.
2. **Framework packages are generated from that directory**, never hand-written.
3. **Entry points are split by dependency.** Importing metadata shouldn't drag
   React in. That's why this package has `termina-icons` (no React) and
   `termina-icons/react` (React).
4. **Components take `size` and `color` and default to `currentColor`,** so one
   file covers light and dark.

This repo follows all four. `packages/icons/dist/` is entirely generated;
nothing in it is edited by hand.

---

## 2. Before the first publish

### Choose the name

The package is currently called `termina-icons` (unscoped). Check whether it's
free:

```bash
npm view termina-icons
```

`404 Not Found` means it's available. Anything else means it's taken, and you
need one of:

- **A different unscoped name** — `termina-icon-set`, `terminaicons`.
- **A scoped name** — `@yourusername/termina-icons`. Scopes are namespaced to
  your npm account or org, so they're always available. This is the safer
  default and costs nothing for public packages.

To switch to a scope, change `name` in `packages/icons/package.json`. The
`publishConfig.access: "public"` already there is what stops npm treating a
scoped package as private (which would require a paid plan).

Anywhere the docs say `npm i termina-icons`, update it to match — it appears in
`packages/icons/README.md`, the root `README.md`, and
`apps/web/components/IconDetail.tsx`.

### Create an npm account

1. Sign up at <https://www.npmjs.com/signup>.
2. Enable two-factor authentication — Account → Two-Factor Authentication.
   Do this now rather than later; npm requires it for publishing on most
   accounts, and turning it on afterwards is more disruptive.

I can't do either of these for you: they involve entering credentials, which is
something you should always do yourself.

### Sign in from the terminal

```bash
npm login
```

This opens a browser to authenticate. Confirm it worked:

```bash
npm whoami
```

---

## 3. The first publish

From the repository root:

```bash
npm run icons:check && npm run build --workspace packages/icons
```

Then look at exactly what would be uploaded — always do this before a first
publish:

```bash
npm pack --workspace packages/icons --dry-run
```

You should see `dist/`, `README.md`, `LICENSE` and `package.json`, and nothing
else. No `scripts/`, no source, no `.env`.

Then publish:

```bash
npm publish --workspace packages/icons
```

`prepublishOnly` rebuilds and runs the verification script first, so a stale or
empty `dist/` is caught before anything is uploaded.

Confirm it landed:

```bash
npm view termina-icons
```

Your README becomes the package's page at
`https://www.npmjs.com/package/termina-icons`.

### Try it from the outside

Worth doing once, so you know what consumers actually get:

```bash
mkdir /tmp/termina-test && cd /tmp/termina-test
npm init -y
npm install termina-icons
node -e "const { icons } = require('termina-icons'); console.log(icons.length)"
```

---

## 4. Publishing again

### Versioning

Semantic versioning is `MAJOR.MINOR.PATCH`. For an icon set:

| Change | Bump | Example |
| --- | --- | --- |
| Added new icons | **minor** | `0.1.0` → `0.2.0` |
| Redrew an icon, same slug | **patch** | `0.2.0` → `0.2.1` |
| Fixed a bug in the components | **patch** | `0.2.1` → `0.2.2` |
| **Renamed or removed** a slug | **major** | `0.2.2` → `1.0.0` |

That last row is the one to be careful about. A slug is an export name —
removing `TerminalWindow` breaks every consumer importing it, at build time. It
is a breaking change even though "it's just an icon."

While the version starts with `0.`, the ecosystem treats minor bumps as
potentially breaking anyway, which buys you some room early on. Move to `1.0.0`
when you're ready to promise stability.

Bump the version with npm rather than by hand — it also creates a git tag:

```bash
npm version minor --workspace packages/icons
```

### The routine

```bash
git pull                                        # get the latest published icons
npm run icons:check
npm run build --workspace packages/icons
npm version minor --workspace packages/icons
npm publish --workspace packages/icons
git push --follow-tags
```

### Or let CI do it

[`.github/workflows/publish-package.yml`](../.github/workflows/publish-package.yml)
does the same thing from GitHub, which is worth setting up because it also adds
**provenance** — a cryptographic attestation, shown on the npm page, that the
package was built from this repository by this workflow rather than from
someone's laptop.

To enable it:

1. On npmjs.com: Account → Access Tokens → Generate New Token → **Granular
   Access Token**, with read/write on `termina-icons` only. Copy it.
2. On GitHub: repo → Settings → Secrets and variables → Actions → New
   repository secret, named `NPM_TOKEN`. Paste it.
3. Bump the version and push, then run the workflow from the Actions tab.

The workflow is deliberately manual (`workflow_dispatch`). Publishing on every
merge to main is a good way to burn version numbers on mistakes.

---

## 5. Keeping the package in step with the set

The package is generated from `icons/icons.json`. Publishing an icon from the
admin console commits to that file — it does **not** publish to npm. The two are
separate on purpose: the site should update the moment you publish a glyph,
while npm consumers shouldn't get a new version every time you nudge a pixel.

So the rhythm is:

- **Publish from the admin console** whenever you want the site updated. Often.
- **Publish to npm** when you've accumulated enough to be worth a version.
  Occasionally.

`npm run build --workspace packages/icons` always regenerates `dist/` from
whatever is currently in `icons/`, and the pre-publish check refuses to publish a
`dist/` whose icon count doesn't match the manifest.

---

## 6. Mistakes, and how to undo them

**Published a broken version.** Publish a fixed one immediately, then mark the
broken one deprecated so installers see a warning:

```bash
npm deprecate termina-icons@0.2.0 "Broken build — use 0.2.1 or later"
```

**Published something that should never have been public** (a secret, private
data). Unpublish is allowed within 72 hours of publishing, and only if nothing
depends on it:

```bash
npm unpublish termina-icons@0.2.0
```

Then **rotate whatever leaked**. Assume it was scraped the moment it was up —
unpublishing removes the file, not the copies. `files` in `package.json` is a
whitelist specifically to make this unlikely; `npm pack --dry-run` before a
first publish is the habit that keeps it that way.

**Wrong dist-tag.** Everything publishes as `latest` by default, which is what
`npm install` picks up. To publish a preview without moving `latest`:

```bash
npm publish --workspace packages/icons --tag next
```

Consumers then opt in with `npm install termina-icons@next`.

**`npm publish` says 403.** Either you're not logged in (`npm whoami`), the name
is taken by someone else, or it's a scoped package without
`publishConfig.access: "public"`.

**`npm publish` says "You cannot publish over the previously published
versions".** The version in `package.json` is already on the registry. Bump it.

---

## 7. Reference

```bash
npm whoami                                          # who am I logged in as
npm view termina-icons                              # is the name free; what's published
npm view termina-icons versions                     # every published version
npm pack --workspace packages/icons --dry-run       # what would be uploaded
npm publish --workspace packages/icons              # publish
npm publish --workspace packages/icons --tag next   # publish without moving `latest`
npm deprecate termina-icons@0.2.0 "message"         # warn on install
npm version patch|minor|major --workspace packages/icons
```
