#!/usr/bin/env node
/**
 * Import a `termina-iconset.json` exported from the old single-file studio.
 *
 *   npm run icons:import -- ~/Downloads/termina-iconset.json
 *   npm run icons:import -- ~/Downloads/termina-iconset.json --all
 *
 * By default only glyphs marked `final` are published into `icons/`, which
 * mirrors what the old Publish button did. Everything else — drafts and
 * glyphs still in review — is written to `.data/working.json` so it lands in
 * the admin console's working set instead of the public set.
 *
 * Existing glyphs are matched by slug and overwritten; nothing is deleted.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { normalizeIcon, isValidPixels } from "../packages/glyph/index.js";
import { readManifest, writeManifest } from "./lib/manifest.mjs";
import { ROOT } from "./lib/paths.mjs";

const args = process.argv.slice(2);
const all = args.includes("--all");
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("Usage: npm run icons:import -- <termina-iconset.json> [--all]");
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`Could not read ${file}: ${err.message}`);
  process.exit(1);
}

const incoming = (Array.isArray(raw) ? raw : raw.icons || [])
  .map((i) => normalizeIcon(i))
  .filter((i) => i && isValidPixels(i.pixels));

if (!incoming.length) {
  console.error("No usable glyphs in that file.");
  process.exit(1);
}

const publishable = all ? incoming : incoming.filter((i) => i.status === "final");
const held = incoming.filter((i) => !publishable.includes(i));

/* ── into the public set ── */
const doc = readManifest();
const bySlug = new Map(doc.icons.map((i) => [i.slug, i]));
let added = 0, replaced = 0;
for (const icon of publishable) {
  if (bySlug.has(icon.slug)) replaced++; else added++;
  bySlug.set(icon.slug, icon);
}
const out = writeManifest([...bySlug.values()]);

/* ── the rest into the local working set ── */
if (held.length) {
  const dir = join(ROOT, ".data");
  mkdirSync(dir, { recursive: true });
  const path = join(dir, "working.json");
  let working = { icons: {}, updatedAt: null };
  try { working = JSON.parse(readFileSync(path, "utf8")); } catch { /* first run */ }
  working.icons ||= {};
  for (const icon of held) working.icons[icon.id] = icon;
  working.updatedAt = new Date().toISOString();
  writeFileSync(path, JSON.stringify(working, null, 2) + "\n");
}

console.log(`Published set: ${added} added, ${replaced} replaced — ${out.count} total.`);
if (held.length) {
  console.log(`Working set:   ${held.length} draft/review glyph${held.length === 1 ? "" : "s"} written to .data/working.json`);
  console.log(`               (local dev only — re-import there or redraw them once you are signed in)`);
}
console.log(`\nNext: npm run icons:check && git add icons && git commit -m "Import the existing set"`);
