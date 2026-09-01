import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CELLS, N, bounds, componentName, countOn, flipH, flipV, fromCells,
  glyphFile, invert, isValidPixels, isValidSlug, normalizeIcon, normalizePixels,
  parseTags, pixelsFromSVG, rectList, rects, rotate, shift, slugify, toCells,
} from "../packages/glyph/index.js";

const blank = "0".repeat(CELLS);
const full = "1".repeat(CELLS);
/* An asymmetric shape, so a transform that silently does nothing is caught. */
const corner = (() => {
  const c = new Uint8Array(CELLS);
  c[0] = 1; c[1] = 1; c[N] = 1; c[N * 2 + 5] = 1;
  return fromCells(c);
})();

test("normalizePixels always returns exactly CELLS characters", () => {
  assert.equal(normalizePixels("").length, CELLS);
  assert.equal(normalizePixels("101").length, CELLS);
  assert.equal(normalizePixels("1".repeat(500)).length, CELLS);
  assert.equal(normalizePixels(null).length, CELLS);
  assert.equal(normalizePixels(undefined).length, CELLS);
  assert.equal(normalizePixels({}).length, CELLS);
  // Anything that is not 0 or 1 is dropped, not coerced into a pixel.
  assert.equal(normalizePixels("1x0"), "10" + "0".repeat(CELLS - 2));
});

test("isValidPixels rejects the wrong length and the wrong alphabet", () => {
  assert.ok(isValidPixels(blank));
  assert.ok(!isValidPixels("0".repeat(CELLS - 1)));
  assert.ok(!isValidPixels("0".repeat(CELLS - 1) + "2"));
  assert.ok(!isValidPixels(123));
});

test("cells round-trip", () => {
  assert.equal(fromCells(toCells(corner)), corner);
  assert.equal(countOn(corner), 4);
  assert.equal(countOn(blank), 0);
  assert.equal(countOn(full), CELLS);
});

test("flips are their own inverse, four rotations return to start", () => {
  assert.equal(flipH(flipH(corner)), corner);
  assert.equal(flipV(flipV(corner)), corner);
  assert.equal(rotate(rotate(rotate(rotate(corner)))), corner);
  assert.notEqual(flipH(corner), corner);
});

test("shift wraps rather than clipping", () => {
  // Nudging a full row all the way round must not lose a pixel.
  let bits = corner;
  for (let i = 0; i < N; i++) bits = shift(bits, 1, 0);
  assert.equal(bits, corner);
  assert.equal(countOn(shift(corner, 1, 0)), countOn(corner));
  assert.equal(countOn(shift(corner, 0, -1)), countOn(corner));
});

test("invert flips every cell", () => {
  assert.equal(invert(blank), full);
  assert.equal(invert(invert(corner)), corner);
});

test("bounds is null when blank and tight otherwise", () => {
  assert.equal(bounds(blank), null);
  assert.deepEqual(bounds(full), { x0: 0, y0: 0, x1: 12, y1: 12, w: 13, h: 13 });
});

test("rects merge horizontal runs", () => {
  // A full row is one rect, not thirteen.
  const row = "1".repeat(N) + "0".repeat(CELLS - N);
  assert.deepEqual(rects(row), [{ x: 0, y: 0, w: N }]);
  assert.equal(rectList(full).length, N);
  assert.deepEqual(rects(blank), []);
});

test("SVG round-trips back to the same bitmap", () => {
  for (const bits of [blank, full, corner]) {
    const svg = glyphFile({ slug: "x", pixels: bits, version: 1 });
    assert.equal(pixelsFromSVG(svg), bits, "round trip failed");
  }
});

test("slugify produces filename-safe identifiers", () => {
  assert.equal(slugify("Terminal Window"), "terminal-window");
  assert.equal(slugify("  Don't — Stop!  "), "dont-stop");
  assert.equal(slugify("///"), "");
  assert.ok(isValidSlug("terminal-window"));
  assert.ok(!isValidSlug("-leading"));
  assert.ok(!isValidSlug("trailing-"));
  assert.ok(!isValidSlug("double--dash"));
  assert.ok(!isValidSlug("Upper"));
});

test("componentName never starts with a digit", () => {
  assert.equal(componentName("terminal-window"), "TerminalWindow");
  // A slug like this would otherwise emit `export const 2faKey`, which is not JS.
  assert.equal(componentName("2fa-key"), "Icon2faKey");
  assert.ok(/^[A-Za-z_$]/.test(componentName("3d-cube")));
});

test("parseTags deduplicates, lowercases and caps", () => {
  assert.deepEqual(parseTags("Shell, console , shell"), ["shell", "console"]);
  assert.deepEqual(parseTags(""), []);
  assert.equal(parseTags(Array.from({ length: 40 }, (_, i) => `t${i}`)).length, 12);
});

test("normalizeIcon clamps hostile input rather than throwing", () => {
  const icon = normalizeIcon({
    name: "x".repeat(500),
    slug: "Not A Slug!!",
    tags: Array.from({ length: 100 }, (_, i) => `tag${i}`),
    status: "definitely-not-a-status",
    version: -7,
    pixels: "not pixels",
    credit: "y".repeat(500),
  });
  assert.ok(icon);
  assert.ok(icon.name.length <= 60);
  assert.ok(isValidSlug(icon.slug));
  assert.equal(icon.status, "draft", "an unknown status must not be trusted");
  assert.equal(icon.version, 1, "a negative version must not survive");
  assert.ok(isValidPixels(icon.pixels));
  assert.ok(icon.credit.length <= 40);
  assert.equal(normalizeIcon(null), null);
  assert.equal(normalizeIcon("nope"), null);
});
