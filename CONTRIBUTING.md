# Contributing to Termina Icons

## Contributing an icon

**The easy way, with no git and no account:** open the editor on the site, draw
on the 13×13 grid, and hit *Submit for review*. You can also open any published
glyph, change it, and submit that as a proposed edit — you'll see your version
next to the live one during review.

You'll be asked to confirm the glyph is your own work and contributed under the
MIT license. There's an optional field for a name to credit you by; it travels
with the glyph into the repository and the npm package. Nothing else is
collected — no email, no account, no IP address.

**The pull request way,** for several icons at once:

1. Add entries to `icons/icons.json`. `pixels` is 169 characters of `0`/`1`,
   row-major from the top-left of a 13×13 grid. Drawing them in the editor and
   copying the bitmap from the icon's page is easier than writing them by hand.
2. Run `npm run icons:write` to regenerate `icons/svg/`.
3. Run `npm run icons:check` — CI runs it too, and it will fail the build on a
   duplicate slug, a malformed bitmap, or a manifest that isn't canonical.

### What makes a good glyph

- **Use the safe area.** Keep the drawing inside the dashed inset — one cell of
  margin — unless it genuinely needs the full field. The editor shows it.
- **Stay on the grid.** Diagonals read as stairs at this size, so build shapes
  from runs rather than approximating curves.
- **Match the weight of the set.** Browse the drawer first. A glyph two cells
  heavier than its neighbours stands out for the wrong reason.
- **Check it at 13px.** The editor's preview strip shows 13, 26 and 39. If it's
  unreadable at 13 it isn't finished.
- **Name it for what it is, not what it looks like.** `terminal-window`, not
  `black-rectangle`. Add keywords for what people might search instead.

## Contributing code

```bash
npm install
npm run dev
```

That's the whole setup — the site runs with no accounts, keys or services. Local
data goes into `.data/`, which is gitignored.

Don't run `npm run build` while `npm run dev` is going — they share
`apps/web/.next`, and the production build replaces the chunks the dev server
has open. It fails with `Cannot find module './NNN.js'`. Stop the dev server
first, or `rm -rf apps/web/.next` and restart it.

Before opening a pull request:

```bash
npm run icons:check
npm test
npm run typecheck
npm run lint
npm run build
```

### Conventions

- **Match the surrounding code.** The comment style throughout explains *why*
  something is the way it is, not what the line does. Keep that.
- **The glyph format lives in `packages/glyph`.** If you're writing something
  that manipulates bitmaps, slugs or the manifest, it probably belongs there
  rather than duplicated in the app.
- **Don't hand-edit `packages/icons/dist/` or `icons/svg/`.** Both are
  generated, and CI checks that they match their sources.
- **Never render glyph data as markup.** Some of it comes from strangers. Build
  SVG elements, as `components/Glyph.tsx` does.

### Where things are

| Path | What |
| --- | --- |
| `icons/` | The published set. Source of truth. |
| `packages/glyph/` | The glyph format and everything derived from it. |
| `packages/icons/` | The npm package, generated from `icons/`. |
| `apps/web/app/` | Routes: public pages, API, admin console. |
| `apps/web/components/` | UI, including the editor and the admin console. |
| `apps/web/lib/` | Server-side data, auth, exports, validation. |
| `apps/web/styles/` | The design system. |
| `scripts/` | Icon-set integrity checks and the legacy importer. |

[docs/architecture.md](docs/architecture.md) explains how the pieces fit and why
the awkward-looking decisions were made.

## Reporting problems

Bugs and ideas: open an issue. Security vulnerabilities: see
[SECURITY.md](SECURITY.md) — please don't open a public issue for those.

## License

By contributing, you agree your contribution is licensed under the MIT license,
matching the rest of the project.
