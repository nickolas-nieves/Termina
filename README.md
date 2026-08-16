# Termina Studio

Internal tool for drawing and cataloguing the Termina 13×13 pixel icon set.

```
public/index.html          the whole app — editor, drawer, export
public/icon.svg            the app mark (drawn in the studio itself)
scripts/make-icons.mjs     regenerates the icon PNGs from that SVG
netlify/functions/sync     private working set (passphrase-gated)
netlify/functions/publish  cuts a public snapshot of the final glyphs
netlify/functions/public-set   GET /api/set        public, CORS-open
netlify/functions/sprite       GET /api/sprite.svg public, CORS-open
netlify/lib/glyph.mjs      shared server helpers
```

## Deploying

You need a Netlify account and the CLI. The CLI's `login` and `init` steps open a
browser and sign you in — run those yourself; everything after is scriptable.

```bash
npm install
npx netlify-cli login
npx netlify-cli init
```

Set the shared passphrase before the first real deploy. Choose something long;
it is the only thing standing between the public URL and your set.

```bash
npx netlify-cli env:set TERMINA_KEY "your-long-shared-passphrase"
```

Then ship it:

```bash
npx netlify-cli deploy --prod
```

Local development, with Blobs and functions emulated:

```bash
npx netlify-cli dev
```

> If `TERMINA_KEY` is unset the API is **open** — anyone with the URL can read
> and write the set. That is fine for `netlify dev`, never for production.

## How syncing works

Each device keeps a full copy in `localStorage` and works offline. On boot, on
reconnect, on tab focus, every 90 seconds, and 800ms after any edit, the device
posts everything it holds to `/api/sync`. The server merges per glyph — newest
`updatedAt` wins — and returns the authoritative document, which replaces local
state. Push and pull are the same round trip, so a device coming back online
needs exactly one request to catch up.

Deletes are recorded as tombstones rather than plain removals, so a glyph
deleted on the laptop does not get resurrected by the desktop's stale copy.
A tombstone loses to a genuinely newer edit, so editing a glyph after deleting
it elsewhere revives it deliberately. Tombstones are pruned after 120 days.

The status pill in the header shows the current state — `Synced`, `Unpushed`,
`Offline`, `Locked`. Click it to force a sync or re-enter the passphrase.

## The public feed

`Export → Publish final glyphs` writes a snapshot containing **only glyphs
marked `final`**. Draft and review glyphs never leave the private set. The
snapshot is served without a passphrase, from any origin:

- `GET /api/set` — JSON: `{ format, version, grid, publishedAt, count, icons[] }`
- `GET /api/sprite.svg` — an SVG sprite of `<symbol>` elements

That is the seam for the eventual public icon-set site on its own domain. It can
fetch the JSON and render however it likes:

```js
const { icons } = await fetch("https://<site>/api/set").then(r => r.json());
```

Or skip the build step entirely and reference the sprite:

```html
<svg width="26" height="26" fill="#111">
  <use href="https://<site>/api/sprite.svg#termina-terminal-window"/>
</svg>
```

Publishing is explicit. Nothing becomes public until you mark a glyph final
*and* click publish.

## The app icon

`public/icon.svg` is the mark, exported straight from the studio. iOS and the
web manifest need rasters, so redraw it there, replace that file, and run:

```bash
node scripts/make-icons.mjs
```

That regenerates `icon-32/180/192/512` and the maskable variant, scaling the
13×13 grid by whole integers so no pixel lands on a half boundary. The tiles are
white-on-ink; flip `INK`/`PAPER` at the top of the script to invert them.

On the tablet, Share → Add to Home Screen installs the studio as a standalone
app with this icon.

## Glyph format

```json
{
  "id": "gx1a2b3c",
  "name": "Terminal window",
  "slug": "terminal-window",
  "category": "System",
  "tags": ["shell", "console"],
  "status": "final",
  "version": 2,
  "pixels": "0000…",
  "createdAt": "2026-08-16T…",
  "updatedAt": "2026-08-16T…"
}
```

`pixels` is 169 characters of `0`/`1`, row-major from the top-left. Exported
SVGs merge horizontal runs into single `<rect>` elements and use
`shape-rendering="crispEdges"` with `fill="currentColor"`.
