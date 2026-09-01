# Termina Icons

A free, open-source pixel icon set drawn on a 13×13 grid — plus the studio it
is drawn in, the review queue it grows through, and the npm package it ships as.

Every glyph occupies the same 169 cells. Nothing sits half a pixel off, so
weight and rhythm stay even across the set, and every export is `<rect>`
elements with `shape-rendering="crispEdges"` that inherit `currentColor`.

```
termina/
├── icons/                  the set itself — the source of truth
│   ├── icons.json          every glyph's metadata and 169-character bitmap
│   └── svg/<slug>.svg      one generated file per glyph, so PRs are reviewable
├── apps/web/               the Next.js site: drawer, editor, admin console
├── packages/
│   ├── glyph/              the glyph format and everything derived from it
│   └── icons/              the publishable npm package, built from icons/
├── scripts/                icon-set integrity checks and the legacy importer
└── docs/                   deployment, architecture, publishing, anti-abuse
```

## What it does

**For anyone, with no account:**

- Browse, search and filter the whole set
- Copy or download any glyph as SVG — one at a time, a whole category, or the
  entire set as a zip with the manifest and the licence
- Draw new glyphs in the editor, or open a published one and change it
- Submit either for review — no sign-in, ever

**For maintainers:**

- Draw glyphs as drafts that stay private, or mark them final
- Review the submission queue: see a proposed edit side by side with the live
  glyph, correct its metadata, accept or reject it
- Publish, which commits the set to this repository as you and rebuilds the site

## Running it

```bash
npm install
npm run dev
```

That is the whole setup. The site comes up at <http://localhost:3000> with the
committed icon set, a working editor, and a submission flow backed by JSON files
under `.data/` — no accounts, no keys, no services.

Only the admin console needs configuration. See [docs/deployment.md](docs/deployment.md).

```bash
npm run dev            # the site
npm test               # the glyph format's test suite
npm run typecheck      # TypeScript across the workspace
npm run lint
npm run build          # package, then site
npm run icons:check    # the manifest and the SVG files must agree
npm run icons:write    # regenerate icons/svg/ from the manifest
npm run icons:raster   # regenerate the app-icon PNGs from apps/web/public/icon.svg
```

## How the set is stored

`icons/icons.json` is the source of truth. Each glyph carries a name, a stable
slug, a category, keywords, a version, and `pixels` — 169 characters of `0`/`1`,
row-major from the top-left.

```json
{
  "name": "Terminal window",
  "slug": "terminal-window",
  "category": "System",
  "tags": ["shell", "console"],
  "version": 2,
  "pixels": "0000…"
}
```

`icons/svg/*.svg` is generated from that and committed alongside it, so a pull
request against the icon set shows the actual drawing changing. `npm run
icons:check` runs in CI and fails if the two ever disagree, if a slug is
malformed or duplicated, or if the manifest has been hand-edited out of its
canonical form.

To regenerate the SVG files after editing the manifest:

```bash
npm run icons:write
```

## Using the icons

```bash
npm install termina-icons
```

```jsx
import { TerminalWindow } from "termina-icons/react";

<TerminalWindow size={26} />
```

There is a metadata-only entry point that does not import React, plus raw SVG
files and a sprite. See [packages/icons/README.md](packages/icons/README.md).

You can also read the set straight off the site, with no install:

```js
const { icons } = await fetch("https://<site>/api/set").then((r) => r.json());
```

```html
<svg width="26" height="26" fill="currentColor">
  <use href="https://<site>/api/sprite.svg#termina-terminal-window" />
</svg>
```

## Contributing

The easiest way to add an icon is to draw it in the editor on the site and
submit it — that needs no account and no git. Code changes and bulk icon
contributions go through pull requests as usual.

See [CONTRIBUTING.md](CONTRIBUTING.md).

## Migrating from the old single-file studio

Earlier versions of this project were one `public/index.html` with Netlify
Functions behind a shared passphrase. To bring an existing set across, export it
from the old app (**Export → Set as JSON**) and run:

```bash
npm run icons:import -- ~/Downloads/termina-iconset.json --dry-run   # look first
npm run icons:import -- ~/Downloads/termina-iconset.json
```

Glyphs marked `final` go into `icons/`; everything else lands in the local
working set, where the admin console picks it up at `/admin`.

| Flag | Effect |
| --- | --- |
| `--dry-run` | Report what would happen, write nothing |
| `--all` | Publish every glyph into `icons/`, whatever its status |
| `--status=final` | Force a status on everything imported |

The old studio only ever marked a glyph `final` at publish time, so an export
is usually all drafts. If you want the whole set live immediately, combine
them: `--all` publishes straight into `icons/`, and a commit puts it on the
site. Re-running an import matches on slug, so it updates rather than
duplicating.

## Documentation

- [docs/deployment.md](docs/deployment.md) — deploying, and the environment it needs
- [docs/architecture.md](docs/architecture.md) — how the pieces fit, and why
- [docs/npm-package.md](docs/npm-package.md) — what an npm package is and how to publish this one
- [docs/anti-abuse.md](docs/anti-abuse.md) — what protects the submission endpoint
- [SECURITY.md](SECURITY.md) — reporting a vulnerability

## License

MIT — both the code and the icons. See [LICENSE](LICENSE).
