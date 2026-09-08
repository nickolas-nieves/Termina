# Architecture

## The shape of it

```
  icons/  ──────────────────────────►  the published set. Source of truth.
   (git)      read at build time       Nothing serves it at runtime.
      ▲
      │ commit, on Publish
      │
  ┌───┴──────────────┐
  │  admin console   │◄── GitHub OAuth, allowlisted
  └───┬──────────────┘
      │ accept
      │
  ┌───┴──────────────┐
  │ submission queue │◄── POST /api/submissions, anonymous, rate-limited
  └──────────────────┘
```

Three stores, deliberately separate, in increasing order of trust:

**The submission queue** holds what strangers sent. Nothing here is trusted and
nothing here is visible outside the admin console.

**The working set** holds what a maintainer has drawn or accepted but not
published. Drafts live here. It is a *delta* against the published set, not a
copy of it — which is what makes "Publish" a legible diff rather than a
wholesale overwrite.

**`icons/` in git** is what's live. It's read by a static import at build time,
so the public pages prerender, cache at the edge, and stay up even if every
backing service is down.

An icon moves left to right only by an explicit human action at each boundary:
*accept* moves a submission into the working set as a draft, *final* marks it
publishable, and *publish* commits it. Three deliberate steps between an
anonymous POST and the public site.

## Why git holds the icons

The alternative was a database, with publish as a flag flip. Git won because:

- The icon set is the open-source artefact. In a database it isn't really open
  source — you'd be publishing the app and keeping the icons.
- Pull requests against `icons/svg/*.svg` show the drawing changing.
- The public site needs no runtime data source at all.
- History is free, and reverting a bad publish is `git revert`.

The cost is that publishing takes a rebuild — a minute or two rather than
instant. That's the right trade for a set that changes daily at most.

`icons/icons.json` is canonical and `icons/svg/*.svg` is generated from it. Both
are committed. `npm run icons:check` proves they agree, that every slug is
unique and well-formed, and that the manifest is in canonical form. It runs in
CI and in the Netlify build.

## Why the manifest is serialised in exactly one place

Two code paths write `icons/icons.json`: `npm run icons:write` locally, and the
admin console's publish route through the GitHub API. If those serialised it
differently — key order, spacing, sort — `icons:check` would start failing on
main after a publish and the cause would be non-obvious.

So both call `manifestJSON` in `packages/glyph`. One implementation, and a CI
check that compares the committed file against it.

## `packages/glyph`

The glyph format and everything derived from it: the bitmap, transforms, SVG
rendering, slug rules, validation, the manifest format.

It's plain ESM with JSDoc types and a hand-written `index.d.ts`, not TypeScript.
That's so the repo scripts and the package build can `import` it directly with
no compile step ahead of them — no build-ordering problem, no stale `dist/`
during development. Next transpiles it like app code via `transpilePackages`.

## Authentication

Sessions are server-side. The cookie carries only a signed random session id —
never a claim about who you are, and never the GitHub token. Everything of
substance lives in the store keyed by that id, so a session can be revoked
instantly and a stolen cookie stops working the moment it's deleted.

The allowlist is re-checked on **every** request, not just at sign-in, so
removing a login from `ADMIN_GITHUB_LOGINS` takes effect immediately rather than
whenever their session happens to expire.

Two independent defences on every admin mutation: the session cookie is
`SameSite=Lax` (so it isn't sent on cross-site POSTs at all), and the `Origin`
header is checked explicitly. Either alone would do; both cost nothing.

The OAuth `state` parameter is random, signed, and echoed in a short-lived
cookie, so a callback that didn't originate here is rejected before any code is
exchanged.

## Publishing is compare-and-swap

The publish route reads the branch head when it builds the plan and sends it
back with the commit. If `main` moved in between — another publish, a merged
PR — the commit is refused rather than overwriting whatever landed. The console
tells you to reload and try again.

## The scripts write into the app's store

`scripts/` needs to write the working set — that is how the legacy importer
seeds it — but it cannot import `apps/web/lib/store.ts`: that module is
TypeScript and marked `server-only`. So the filesystem layout is restated in
`scripts/lib/store-path.mjs`.

Restating an invariant is a liability, so `scripts/store-path.test.mjs` reads
the app's source and asserts the two still agree — the store name, the key, and
the `.data/<store>/<key>.json` shape. It exists because the restatement was
once wrong: the importer wrote to `.data/working.json` while the console read
`.data/termina-admin/working.json`, and nothing anywhere reported a problem.
The glyphs were simply invisible.

## The storage abstraction

`apps/web/lib/store.ts` is a four-method key/value interface with two backends:
Netlify Blobs in production, JSON files under `.data/` everywhere else.

That exists so `git clone && npm install && npm run dev` gives a working app
with no accounts, keys or services to set up first. A contributor who wants to
fix a CSS bug shouldn't have to provision a datastore.

Store keys become filenames in the filesystem backend, so they're validated
against `[A-Za-z0-9._-]` — a key like `../../etc/passwd` throws rather than
escaping the directory. Writes go to a temp file and rename, so a crash
mid-write can't truncate the store.

## Rendering

Glyphs render as real SVG elements built from the bitmap, not as injected HTML
strings. The original single-file app used `innerHTML` throughout, which was
fine when the only author was the site owner. Now that some glyph data arrives
from strangers, glyph data must never be able to become markup — so `Glyph.tsx`
maps runs to `<rect>` elements and React escapes everything else.

## Styling

Plain CSS with custom properties, imported globally — not CSS Modules for the
shared design system, and not Tailwind.

The design is a coherent hand-authored system: about ninety tokens, all declared
once as `light-dark()` pairs so the entire palette turns on the root
`color-scheme`. The theme switcher sets one attribute; clearing it hands the
decision back to the OS. Reproducing that faithfully in Tailwind would mean
either arbitrary-value soup or a large config port, both of which risk drift from
the original for no benefit.

`apps/web/styles/` splits it by concern — tokens, base, chrome, editor, drawer,
admin, responsive — imported in that order from `app/globals.css`, with
`responsive.css` last so its overrides win without specificity tricks.
