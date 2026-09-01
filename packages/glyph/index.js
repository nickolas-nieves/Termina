/**
 * The glyph format, and everything that derives from it.
 *
 * A glyph is 169 characters of "0"/"1", row-major from the top-left of a 13×13
 * field. That string is the source of truth; the SVG files in `icons/svg` are
 * generated from it and are checked against it in CI, so the two can never
 * drift apart.
 *
 * Plain ESM with JSDoc types rather than TypeScript, so the repo scripts and
 * the package build can import it directly with no compile step ahead of them.
 * `index.d.ts` carries the types for the web app.
 */

export const N = 13;
export const CELLS = N * N;

/** Publication states. Only `final` glyphs are ever published. */
export const STATUSES = ["draft", "review", "final"];

/** States a public submission moves through. */
export const SUBMISSION_STATUSES = ["pending", "accepted", "rejected"];

export const MAX_NAME = 60;
export const MAX_SLUG = 60;
export const MAX_CATEGORY = 40;
export const MAX_TAGS = 12;
export const MAX_TAG = 24;
export const MAX_CREDIT = 40;
export const MAX_NOTE = 500;

/* ── bitmap ──────────────────────────────────────────────── */

/** @returns {string} 169 chars of 0/1 — always exactly CELLS long. */
export function normalizePixels(input) {
  const bits = String(input ?? "").replace(/[^01]/g, "");
  return bits.padEnd(CELLS, "0").slice(0, CELLS);
}

/** True when the string is a well-formed bitmap of exactly the right length. */
export function isValidPixels(input) {
  return typeof input === "string" && input.length === CELLS && /^[01]+$/.test(input);
}

/** @returns {Uint8Array} */
export function toCells(bits) {
  const s = normalizePixels(bits);
  const out = new Uint8Array(CELLS);
  for (let i = 0; i < CELLS; i++) out[i] = s.charCodeAt(i) === 49 ? 1 : 0;
  return out;
}

/** @returns {string} */
export function fromCells(cells) {
  let s = "";
  for (let i = 0; i < CELLS; i++) s += cells[i] ? "1" : "0";
  return s;
}

export function countOn(bits) {
  let n = 0;
  const s = normalizePixels(bits);
  for (let i = 0; i < CELLS; i++) if (s.charCodeAt(i) === 49) n++;
  return n;
}

export const isBlank = (bits) => countOn(bits) === 0;

/** Tight bounding box of the set pixels, or null when the glyph is blank. */
export function bounds(bits) {
  const s = normalizePixels(bits);
  let x0 = N, y0 = N, x1 = -1, y1 = -1;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      if (s.charCodeAt(y * N + x) !== 49) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/* ── transforms ──────────────────────────────────────────── */

function remap(bits, fn) {
  const src = toCells(bits);
  const out = new Uint8Array(CELLS);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const [nx, ny] = fn(x, y);
      out[ny * N + nx] = src[y * N + x];
    }
  }
  return fromCells(out);
}

/** Nudge, wrapping at the edges — the same behaviour the arrow keys have. */
export const shift = (bits, dx, dy) =>
  remap(bits, (x, y) => [(x + dx + N) % N, (y + dy + N) % N]);
export const flipH = (bits) => remap(bits, (x, y) => [N - 1 - x, y]);
export const flipV = (bits) => remap(bits, (x, y) => [x, N - 1 - y]);
export const rotate = (bits) => remap(bits, (x, y) => [N - 1 - y, x]);

export function invert(bits) {
  const s = normalizePixels(bits);
  let out = "";
  for (let i = 0; i < CELLS; i++) out += s.charCodeAt(i) === 49 ? "0" : "1";
  return out;
}

/* ── SVG ─────────────────────────────────────────────────── */

/**
 * Merge horizontal runs of set pixels into single <rect> elements. A 13×13
 * glyph that would be 169 rects usually lands under 20, and there are no paths
 * to simplify or strokes to drift when scaled.
 */
export function rects(bits) {
  const s = normalizePixels(bits);
  const out = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      if (s.charCodeAt(y * N + x) === 49) {
        let w = 1;
        while (x + w < N && s.charCodeAt(y * N + x + w) === 49) w++;
        out.push({ x, y, w });
        x += w;
      } else x++;
    }
  }
  return out;
}

/** The same runs, as markup. Used everywhere a string of SVG is what's wanted. */
export function rectList(bits) {
  return rects(bits).map((r) => `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="1"/>`);
}

export const rectsFor = (bits) => rectList(bits).join("");

/**
 * Inline SVG markup, for rendering in the page.
 * No explicit fill unless asked, so the glyph inherits currentColor.
 */
export function glyphSVG(bits, size, color) {
  const px = size ? ` width="${size}" height="${size}"` : "";
  const fill = color ? ` fill="${color}"` : ` fill="currentColor"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}"${px} shape-rendering="crispEdges"${fill}>${rectsFor(bits)}</svg>`;
}

/**
 * The on-disk / downloadable form. Pretty-printed one rect per line so a diff
 * of `icons/svg/*.svg` in a pull request is readable.
 */
export function glyphFile(icon) {
  const rects = rectList(icon.pixels);
  const body = rects.length ? "\n  " + rects.join("\n  ") + "\n" : "";
  return (
    `<!-- termina · ${icon.slug} · v${icon.version ?? 1} -->\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${N}" height="${N}" ` +
    `shape-rendering="crispEdges" fill="currentColor">${body}</svg>\n`
  );
}

/** Recover the bitmap from a generated SVG file, so CI can verify the pair. */
export function pixelsFromSVG(svg) {
  const cells = new Uint8Array(CELLS);
  const re = /<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="1"\s*\/>/g;
  let m;
  while ((m = re.exec(svg))) {
    const x = +m[1], y = +m[2], w = +m[3];
    if (x < 0 || y < 0 || y >= N || x + w > N) return null;
    for (let i = 0; i < w; i++) cells[y * N + x + i] = 1;
  }
  return fromCells(cells);
}

/** An SVG sprite of <symbol> elements, referenced as #termina-<slug>. */
export function spriteSVG(icons, prefix = "termina") {
  const symbols = icons
    .map((i) => `  <symbol id="${prefix}-${i.slug}" viewBox="0 0 ${N} ${N}">${rectsFor(i.pixels)}</symbol>`)
    .join("\n");
  return `<svg xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges" fill="currentColor">\n${symbols}\n</svg>\n`;
}

/* ── identifiers ─────────────────────────────────────────── */

export function slugify(s) {
  return String(s ?? "")
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG);
}

/**
 * A valid slug is also a valid filename and a valid JS identifier once
 * pascal-cased, which is what keeps the npm package's exports predictable.
 */
export function isValidSlug(s) {
  return typeof s === "string" && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= MAX_SLUG;
}

/** `terminal-window` → `TerminalWindow`, the exported component name. */
export function pascalCase(slug) {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/**
 * Component names cannot start with a digit. `2fa` would emit invalid JS, so
 * such slugs are prefixed rather than silently dropped from the package.
 */
export function componentName(slug) {
  const base = pascalCase(slug);
  return /^[0-9]/.test(base) ? "Icon" + base : base;
}

export function parseTags(input) {
  const raw = Array.isArray(input) ? input : String(input ?? "").split(",");
  const seen = new Set();
  const out = [];
  for (const t of raw) {
    const tag = String(t).trim().toLowerCase().replace(/\s+/g, " ").slice(0, MAX_TAG);
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/* ── glyph records ───────────────────────────────────────── */

function isoOr(v, fallback) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? fallback : d.toISOString();
}

/**
 * Coerce anything into a well-formed glyph. Never throws and never trusts the
 * input: every field is clamped, so this is safe to run on a request body.
 */
export function normalizeIcon(raw, { now = new Date().toISOString() } = {}) {
  if (!raw || typeof raw !== "object") return null;

  const name = String(raw.name ?? "").trim().slice(0, MAX_NAME) || "Untitled";
  const slug = slugify(raw.slug || name) || "untitled";
  const created = isoOr(raw.createdAt, now);

  return {
    id: String(raw.id ?? "").slice(0, 64) || uid(),
    name,
    slug,
    category: String(raw.category ?? "").trim().slice(0, MAX_CATEGORY),
    tags: parseTags(raw.tags),
    status: STATUSES.includes(raw.status) ? raw.status : "draft",
    version:
      Number.isFinite(+raw.version) && +raw.version > 0
        ? Math.min(9999, Math.floor(+raw.version))
        : 1,
    pixels: normalizePixels(raw.pixels),
    credit: String(raw.credit ?? "").trim().slice(0, MAX_CREDIT) || null,
    createdAt: created,
    updatedAt: isoOr(raw.updatedAt, created),
  };
}

/** The subset of a glyph that is published. Never leaks internal state. */
export function publicIcon(icon) {
  return {
    name: icon.name,
    slug: icon.slug,
    category: icon.category || "",
    tags: icon.tags ?? [],
    version: icon.version ?? 1,
    pixels: icon.pixels,
    ...(icon.credit ? { credit: icon.credit } : {}),
  };
}

export function uid() {
  return "gx" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/** Group into categories, with Unfiled always sorted last. */
export function groupByCategory(icons, unfiled = "Unfiled") {
  const groups = new Map();
  for (const icon of icons) {
    const key = icon.category || unfiled;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(icon);
  }
  for (const list of groups.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return new Map(
    Array.from(groups.entries()).sort(([a], [b]) =>
      a === unfiled ? 1 : b === unfiled ? -1 : a.localeCompare(b)
    )
  );
}

/** Search across every field someone might remember a glyph by. */
export function matchesQuery(icon, query) {
  const q = String(query ?? "").trim().toLowerCase();
  if (!q) return true;
  return q.split(/\s+/).every(
    (term) =>
      icon.name.toLowerCase().includes(term) ||
      icon.slug.includes(term) ||
      (icon.category || "").toLowerCase().includes(term) ||
      (icon.tags ?? []).some((t) => t.includes(term))
  );
}

/* ── the committed manifest ──────────────────────────────── */

/**
 * The exact shape of `icons/icons.json`.
 *
 * There is deliberately one implementation of this. The repo script writes it
 * locally and the admin console's publish route writes it through the GitHub
 * API; if those two ever serialised it differently, `npm run icons:check`
 * would start failing on main after a publish and nobody would know why.
 */
export function manifestDoc(icons, { publishedAt = null, grid = N } = {}) {
  const sorted = icons.map(publicIcon).sort((a, b) => a.slug.localeCompare(b.slug));
  return {
    format: "termina-iconset",
    version: 1,
    grid,
    publishedAt,
    count: sorted.length,
    icons: sorted,
  };
}

/** The manifest as it appears on disk, trailing newline included. */
export function manifestJSON(icons, opts) {
  return JSON.stringify(manifestDoc(icons, opts), null, 2) + "\n";
}
