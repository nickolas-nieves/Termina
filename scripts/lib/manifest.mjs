import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { glyphFile, isValidSlug, isValidPixels, manifestDoc, manifestJSON, publicIcon } from "../../packages/glyph/index.js";
import { MANIFEST, SVG_DIR } from "./paths.mjs";

export function readManifest() {
  const doc = JSON.parse(readFileSync(MANIFEST, "utf8"));
  if (!Array.isArray(doc.icons)) throw new Error("icons.json has no icons array");
  return doc;
}

/**
 * Write the manifest and regenerate `icons/svg` from it. The manifest is the
 * source of truth; the SVG files exist so a pull request against the icon set
 * is reviewable, and `npm run icons:check` proves the two still agree.
 */
export function writeManifest(icons, { publishedAt = new Date().toISOString() } = {}) {
  const sorted = icons
    .map(publicIcon)
    .sort((a, b) => a.slug.localeCompare(b.slug));

  for (const icon of sorted) {
    if (!isValidSlug(icon.slug)) throw new Error(`invalid slug: ${JSON.stringify(icon.slug)}`);
    if (!isValidPixels(icon.pixels)) throw new Error(`invalid pixels on ${icon.slug}`);
  }
  const dupes = sorted.map((i) => i.slug).filter((s, n, a) => a.indexOf(s) !== n);
  if (dupes.length) throw new Error(`duplicate slugs: ${[...new Set(dupes)].join(", ")}`);

  const doc = manifestDoc(sorted, { publishedAt });
  writeFileSync(MANIFEST, manifestJSON(sorted, { publishedAt }));

  // Rewrite the SVG directory from scratch so a removed glyph leaves no file
  // behind — a stale SVG would still be picked up by the package build.
  rmSync(SVG_DIR, { recursive: true, force: true });
  mkdirSync(SVG_DIR, { recursive: true });
  for (const icon of sorted) {
    writeFileSync(join(SVG_DIR, `${icon.slug}.svg`), glyphFile(icon));
  }
  return doc;
}

export function listSVGFiles() {
  try {
    return readdirSync(SVG_DIR).filter((f) => f.endsWith(".svg")).sort();
  } catch {
    return [];
  }
}
