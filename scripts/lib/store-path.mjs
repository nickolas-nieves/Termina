import { join } from "node:path";
import { ROOT } from "./paths.mjs";

/**
 * Where the filesystem store backend keeps its JSON.
 *
 * This mirrors `apps/web/lib/store.ts` exactly: that module namespaces every
 * store under `.data/<store>/<key>.json`. The repo scripts cannot import it —
 * it is TypeScript and marked `server-only` — so the layout is restated here
 * and pinned by `scripts/store-path.test.mjs`, which reads the app's source
 * and fails if the two ever disagree.
 *
 * (An earlier version of the importer wrote to `.data/working.json` and the
 * admin console silently found nothing. Hence the test.)
 */

export const DATA_DIR = join(ROOT, ".data");

/** Matches `store("termina-admin")` in apps/web/lib/working.ts. */
export const ADMIN_STORE = "termina-admin";

/** Matches WORKING_KEY in apps/web/lib/working.ts. */
export const WORKING_KEY = "working";

export function storeFile(storeName, key) {
  return join(DATA_DIR, storeName, `${key}.json`);
}

export const workingFile = () => storeFile(ADMIN_STORE, WORKING_KEY);
