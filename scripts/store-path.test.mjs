import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ADMIN_STORE, WORKING_KEY, storeFile, workingFile } from "./lib/store-path.mjs";
import { ROOT } from "./lib/paths.mjs";

/**
 * The repo scripts write into the same filesystem store the web app reads, but
 * they cannot import it — apps/web/lib/store.ts is TypeScript and `server-only`.
 * So the layout is restated in scripts/lib/store-path.mjs, and these tests read
 * the app's source to prove the restatement is still accurate.
 *
 * This exists because it was once wrong: the importer wrote 167 glyphs to
 * `.data/working.json` while the console read `.data/termina-admin/working.json`,
 * and nothing anywhere reported a problem.
 */

const read = (p) => readFileSync(join(ROOT, p), "utf8");

test("the admin store name matches what working.ts opens", () => {
  const src = read("apps/web/lib/working.ts");
  const match = src.match(/store\(\s*["']([^"']+)["']\s*\)/);
  assert.ok(match, "could not find a store(...) call in working.ts");
  assert.equal(
    match[1],
    ADMIN_STORE,
    "working.ts opens a different store than scripts/lib/store-path.mjs targets"
  );
});

test("the working-set key matches WORKING_KEY in working.ts", () => {
  const src = read("apps/web/lib/working.ts");
  const match = src.match(/WORKING_KEY\s*=\s*["']([^"']+)["']/);
  assert.ok(match, "could not find WORKING_KEY in working.ts");
  assert.equal(match[1], WORKING_KEY);
});

test("the filesystem layout matches store.ts", () => {
  const src = read("apps/web/lib/store.ts");
  // store.ts builds `<DATA_DIR>/<name>/<key>.json`; assert both halves survive.
  assert.match(src, /path\.join\(DATA_DIR,\s*name\)/, "store.ts no longer namespaces by store name");
  assert.match(src, /\$\{safeKey\(key\)\}\.json/, "store.ts no longer names files <key>.json");
  assert.match(src, /"\.data"/, "store.ts no longer roots the store at .data");
});

test("workingFile resolves to the path the console reads", () => {
  assert.equal(workingFile(), storeFile(ADMIN_STORE, WORKING_KEY));
  assert.match(workingFile(), /\.data\/termina-admin\/working\.json$/);
});
