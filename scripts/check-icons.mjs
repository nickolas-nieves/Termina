#!/usr/bin/env node
/**
 * Fail the build if the manifest and the SVG files disagree, or if anything in
 * the set is malformed. This is what makes a pull request against the icon set
 * safe to merge: nobody can hand-edit an SVG into saying something the
 * manifest does not, and nobody can land a duplicate slug.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isValidPixels, isValidSlug, pixelsFromSVG, glyphFile, manifestJSON } from "../packages/glyph/index.js";
import { MANIFEST } from "./lib/paths.mjs";
import { readManifest, listSVGFiles } from "./lib/manifest.mjs";
import { SVG_DIR } from "./lib/paths.mjs";

const problems = [];
const doc = readManifest();
const seen = new Set();

for (const icon of doc.icons) {
  const where = icon.slug || "(no slug)";
  if (!isValidSlug(icon.slug)) problems.push(`${where}: slug is not a valid kebab-case identifier`);
  if (seen.has(icon.slug)) problems.push(`${where}: duplicate slug`);
  seen.add(icon.slug);
  if (!isValidPixels(icon.pixels)) problems.push(`${where}: pixels must be exactly 169 characters of 0/1`);
  if (!icon.name || typeof icon.name !== "string") problems.push(`${where}: missing name`);

  let file;
  try {
    file = readFileSync(join(SVG_DIR, `${icon.slug}.svg`), "utf8");
  } catch {
    problems.push(`${where}: icons/svg/${icon.slug}.svg is missing — run \`npm run icons:write\``);
    continue;
  }
  const recovered = pixelsFromSVG(file);
  if (recovered !== icon.pixels) {
    problems.push(`${where}: icons/svg/${icon.slug}.svg does not match the manifest pixels`);
  } else if (file !== glyphFile(icon)) {
    problems.push(`${where}: icons/svg/${icon.slug}.svg is not byte-identical to the generated form — run \`npm run icons:write\``);
  }
}

for (const file of listSVGFiles()) {
  const slug = file.replace(/\.svg$/, "");
  if (!seen.has(slug)) problems.push(`icons/svg/${file}: no such glyph in icons.json`);
}

if (doc.count !== doc.icons.length) problems.push(`count says ${doc.count} but there are ${doc.icons.length} glyphs`);

// The manifest is committed and is written by two different code paths — the
// local script and the admin console's publish route. Comparing it against the
// canonical serialisation catches a hand-edit or a drift between the two.
if (!problems.length) {
  const onDisk = readFileSync(MANIFEST, "utf8");
  const canonical = manifestJSON(doc.icons, { publishedAt: doc.publishedAt ?? null, grid: doc.grid });
  if (onDisk !== canonical) {
    problems.push("icons/icons.json is not in canonical form (order, key order or spacing) — run `npm run icons:write`");
  }
}

if (problems.length) {
  console.error(`Icon set check failed (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}
console.log(`Icon set OK — ${doc.icons.length} glyph${doc.icons.length === 1 ? "" : "s"}, manifest and SVG files agree.`);
