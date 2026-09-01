#!/usr/bin/env node
/**
 * Regenerate `icons/svg/*.svg` from `icons/icons.json`.
 * Run after hand-editing the manifest; the admin console does this itself.
 */
import { readManifest, writeManifest } from "./lib/manifest.mjs";

const doc = readManifest();
const out = writeManifest(doc.icons, { publishedAt: doc.publishedAt });
console.log(`Wrote ${out.count} glyph${out.count === 1 ? "" : "s"} to icons/svg/`);
