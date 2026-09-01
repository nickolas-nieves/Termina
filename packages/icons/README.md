# termina-icons

Pixel icons drawn on a 13×13 grid. Every glyph occupies the same 169 cells, so
weight and rhythm stay even across the set, and every export is `<rect>`
elements with `shape-rendering="crispEdges"` — no paths to simplify, no strokes
that drift when you scale them.

Ships as raw SVG, an SVG sprite, and tree-shakeable React components.

```bash
npm install termina-icons
```

## React

```jsx
import { TerminalWindow, ArrowUp } from "termina-icons/react";

<TerminalWindow />                        {/* 24px, currentColor */}
<ArrowUp size={16} />
<ArrowUp size={26} color="#9F2F2D" />
<ArrowUp title="Back to top" />           {/* accessible name */}
```

Every component takes `size`, `color`, `title`, and any other SVG prop, and
forwards a ref to the `<svg>`.

Icons inherit `currentColor` by default, so one file covers light and dark:

```jsx
<span style={{ color: "var(--ink)" }}>
  <TerminalWindow />
</span>
```

Icons are **decorative by default** — they render `aria-hidden="true"` unless
you pass a `title`. That is usually right: an icon next to a label that already
says "Delete" should not make a screen reader say "Delete" twice. Pass `title`
when the icon is the only thing carrying the meaning.

### Sizing

The glyphs are drawn on a 13-cell grid, so they are sharpest at whole multiples
of 13 — 13, 26, 39, 52. At 24px (the default) the browser is scaling 13 cells
into 24 pixels, which is fine at normal reading sizes but slightly soft. If you
want them perfectly crisp, use `size={26}`.

## Without React

```js
import { icons, getIcon, toSVG, categories } from "termina-icons";

icons.length;                    // every glyph, sorted by slug
getIcon("terminal-window");      // { name, slug, category, tags, version, pixels }
categories();                    // ["Brand", "System", …, "Unfiled"]
toSVG("terminal-window", { size: 26 });   // SVG markup as a string
```

This entry point does not import React, so you can use the metadata in a build
script, a server, or a non-React app without pulling React in.

## Raw files

```js
import manifest from "termina-icons/icons.json";
import terminalWindow from "termina-icons/svg/terminal-window.svg";
```

Or reference the sprite with no build step at all:

```html
<svg width="26" height="26" fill="currentColor">
  <use href="/node_modules/termina-icons/dist/sprite.svg#termina-terminal-window" />
</svg>
```

## The glyph format

Each icon's `pixels` is 169 characters of `0`/`1`, row-major from the top-left.
That string is the source of truth; every SVG in the package is generated from
it.

```js
import { toRects, GRID } from "termina-icons";

toRects(getIcon("terminal-window").pixels);
// [{ x: 2, y: 2, w: 5 }, …] — horizontal runs, merged
```

## Browsing and contributing

The full set is browsable at the project site, where you can also draw a glyph
on the same grid and submit it — no account needed.

- Source and issues: <https://github.com/nickolas-nieves/Termina>

## License

MIT. Both the code and the icons.
