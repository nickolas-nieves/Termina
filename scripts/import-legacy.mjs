#!/usr/bin/env node
/**
 * Import a `termina-iconset.json` exported from the old single-file studio.
 *
 *   npm run icons:import -- <file>                 # final → published, rest → working set
 *   npm run icons:import -- <file> --all           # publish everything, whatever its status
 *   npm run icons:import -- <file> --status=final  # force a status on everything imported
 *   npm run icons:import -- <file> --dry-run       # report only, write nothing
 *
 * By default only glyphs marked `final` are published into `icons/`, mirroring
 * what the old Publish button did. Everything else goes into the local working
 * set, where the admin console picks it up.
 *
 * Existing glyphs are matched by slug and overwritten; nothing is deleted.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { STATUSES, normalizeIcon, isValidPixels, countOn } from "../packages/glyph/index.js";
import { readManifest, writeManifest } from "./lib/manifest.mjs";
import { workingFile } from "./lib/store-path.mjs";

const args = process.argv.slice(2);
const all = args.includes("--all");
const dryRun = args.includes("--dry-run");
const statusArg = args.find((a) => a.startsWith("--status="))?.split("=")[1];
const file = args.find((a) => !a.startsWith("--"));

if (!file) {
  console.error("Usage: npm run icons:import -- <termina-iconset.json> [--all] [--status=draft|review|final] [--dry-run]");
  process.exit(1);
}
if (statusArg && !STATUSES.includes(statusArg)) {
  console.error(`--status must be one of: ${STATUSES.join(", ")}`);
  process.exit(1);
}

let raw;
try {
  raw = JSON.parse(readFileSync(file, "utf8"));
} catch (err) {
  console.error(`Could not read ${file}: ${err.message}`);
  process.exit(1);
}

const source = Array.isArray(raw) ? raw : raw.icons || [];
const incoming = source
  .map((i) => normalizeIcon(i))
  .filter((i) => i && isValidPixels(i.pixels))
  .map((i) => (statusArg ? { ...i, status: statusArg } : i));

const skipped = source.length - incoming.length;
const blank = incoming.filter((i) => countOn(i.pixels) === 0);

if (!incoming.length) {
  console.error("No usable glyphs in that file.");
  process.exit(1);
}

const publishable = all ? incoming : incoming.filter((i) => i.status === "final");
const held = incoming.filter((i) => !publishable.includes(i));

/* A duplicate slug would collide on export, so report rather than silently
   letting the last one win. */
const seen = new Map();
for (const icon of publishable) {
  if (seen.has(icon.slug)) {
    console.error(`Duplicate slug in the import: "${icon.slug}" appears more than once.`);
    process.exit(1);
  }
  seen.set(icon.slug, icon);
}

if (dryRun) {
  console.log(`Dry run — nothing written.\n`);
  console.log(`  Readable glyphs   ${incoming.length}${skipped ? ` (${skipped} skipped as malformed)` : ""}`);
  console.log(`  Would publish     ${publishable.length}  → icons/`);
  console.log(`  Would hold        ${held.length}  → working set`);
  if (blank.length) console.log(`  Blank glyphs      ${blank.length}`);
  const byStatus = {};
  for (const i of incoming) byStatus[i.status] = (byStatus[i.status] ?? 0) + 1;
  console.log(`  By status         ${JSON.stringify(byStatus)}`);
  process.exit(0);
}

/* ── into the published set (git) ── */
let published = 0;
if (publishable.length) {
  const doc = readManifest();
  const bySlug = new Map(doc.icons.map((i) => [i.slug, i]));
  for (const icon of publishable) bySlug.set(icon.slug, icon);
  published = writeManifest([...bySlug.values()]).count;
}

/* ── the rest into the working set ──
   Written through the same layout apps/web/lib/store.ts uses, so the admin
   console actually finds them. */
if (held.length) {
  const path = workingFile();
  mkdirSync(dirname(path), { recursive: true });

  let doc = { icons: {}, removed: [], updatedAt: null };
  try {
    doc = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    /* first import */
  }
  doc.icons ||= {};
  doc.removed ||= [];

  // Match on slug so re-running an import updates rather than duplicating.
  const bySlug = new Map(Object.entries(doc.icons).map(([id, i]) => [i.slug, id]));
  for (const icon of held) {
    const existingId = bySlug.get(icon.slug);
    if (existingId) delete doc.icons[existingId];
    doc.icons[icon.id] = icon;
  }
  doc.updatedAt = new Date().toISOString();

  writeFileSync(path, JSON.stringify(doc, null, 2) + "\n");
}

if (skipped) console.log(`Skipped ${skipped} entr${skipped === 1 ? "y" : "ies"} that were not readable glyphs.`);
if (blank.length) console.log(`Note: ${blank.length} imported glyph${blank.length === 1 ? " is" : "s are"} blank.`);

if (publishable.length) {
  console.log(`Published set: ${publishable.length} imported — ${published} total in icons/.`);
}
if (held.length) {
  console.log(`Working set:   ${held.length} glyph${held.length === 1 ? "" : "s"} written to ${workingFile().replace(process.cwd() + "/", "")}`);
  console.log(`               Visible in the admin console at /admin when running locally.`);
}
console.log(`\nNext: npm run icons:check${publishable.length ? ` && git add icons && git commit -m "Import the existing set"` : ""}`);
