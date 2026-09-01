#!/usr/bin/env node
/**
 * Pre-publish sanity check.
 *
 * npm publish is irreversible for a given version number, so this runs from
 * `prepublishOnly` and refuses to publish a package that is empty, stale, or
 * missing an export someone's build would resolve.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const PKG = join(dirname(fileURLToPath(import.meta.url)), "..");
const ROOT = join(PKG, "..", "..");
const DIST = join(PKG, "dist");

const problems = [];
const need = ["index.js", "index.cjs", "index.d.ts", "react.js", "react.cjs", "react.d.ts", "icons.json", "sprite.svg"];
for (const f of need) {
  if (!existsSync(join(DIST, f))) problems.push(`dist/${f} is missing — run \`npm run build\` first`);
}

if (!problems.length) {
  const source = JSON.parse(readFileSync(join(ROOT, "icons", "icons.json"), "utf8"));
  const built = JSON.parse(readFileSync(join(DIST, "icons.json"), "utf8"));

  if (built.count !== source.count || built.icons.length !== source.icons.length) {
    problems.push("dist/icons.json is out of date — run `npm run build` after the last publish");
  }
  if (!source.icons.length) {
    problems.push("the icon set is empty — there is nothing to publish");
  }

  const { icons } = await import(join(DIST, "index.js"));
  const react = await import(join(DIST, "react.js"));
  for (const icon of icons) {
    if (!existsSync(join(DIST, "svg", `${icon.slug}.svg`))) {
      problems.push(`dist/svg/${icon.slug}.svg is missing`);
    }
  }
  const exported = Object.keys(react).length;
  if (exported !== icons.length) {
    problems.push(`${icons.length} glyphs but ${exported} React components — the build is inconsistent`);
  }

  const pkg = JSON.parse(readFileSync(join(PKG, "package.json"), "utf8"));
  if (!existsSync(join(PKG, "README.md"))) problems.push("README.md is missing — it is the npm listing page");
  if (!existsSync(join(PKG, "LICENSE"))) problems.push("LICENSE is missing");
  if (pkg.private) problems.push('package.json has "private": true, so npm will refuse to publish it');
}

if (problems.length) {
  console.error(`\nRefusing to publish (${problems.length} problem${problems.length === 1 ? "" : "s"}):\n`);
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error("");
  process.exit(1);
}
console.log("Package looks publishable.");
