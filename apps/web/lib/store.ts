import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * A tiny key/value store with two backends.
 *
 * On Netlify it is Netlify Blobs. Everywhere else — a plain `next dev`, a
 * contributor's laptop, CI — it falls back to JSON files under `.data/`, so
 * cloning the repo and running `npm run dev` gives a working app with no
 * accounts, keys or services to set up first.
 *
 * Nothing in here is reachable without an authenticated admin session or the
 * rate-limited submission route; see the callers.
 */

export interface Store {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

const onNetlify = Boolean(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT);

/* ── Netlify Blobs ── */

function netlifyStore(name: string): Store {
  const load = async () => {
    const { getStore } = await import("@netlify/blobs");
    return getStore({ name, consistency: "strong" });
  };
  return {
    async get<T>(key: string) {
      const s = await load();
      return ((await s.get(key, { type: "json" })) as T | null) ?? null;
    },
    async set(key, value) {
      const s = await load();
      await s.setJSON(key, value);
    },
    async delete(key) {
      const s = await load();
      await s.delete(key);
    },
    async list(prefix) {
      const s = await load();
      const { blobs } = await s.list({ prefix });
      return blobs.map((b: { key: string }) => b.key);
    },
  };
}

/* ── filesystem ── */

/**
 * Where the filesystem backend keeps its JSON.
 *
 * `next dev` runs with cwd at apps/web, but the same build can be started from
 * the repository root, so the location is derived rather than assumed — and
 * TERMINA_DATA_DIR overrides it outright for anyone hosting this elsewhere.
 */
const DATA_DIR = (() => {
  const override = process.env.TERMINA_DATA_DIR;
  if (override) return path.resolve(override);
  const cwd = process.cwd();
  const inAppDir = path.basename(cwd) === "web" && path.basename(path.dirname(cwd)) === "apps";
  return inAppDir ? path.join(cwd, "..", "..", ".data") : path.join(cwd, ".data");
})();

/** Keys become filenames, so anything that could escape the directory is out. */
function safeKey(key: string): string {
  if (!/^[A-Za-z0-9._-]+$/.test(key) || key === "." || key === "..") {
    throw new Error(`unsafe store key: ${JSON.stringify(key)}`);
  }
  return key;
}

function fsStore(name: string): Store {
  const dir = path.join(DATA_DIR, name);
  const file = (key: string) => path.join(dir, `${safeKey(key)}.json`);
  return {
    async get<T>(key: string) {
      try {
        return JSON.parse(await fs.readFile(file(key), "utf8")) as T;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      await fs.mkdir(dir, { recursive: true });
      // Write then rename, so a crash mid-write cannot truncate the store.
      const tmp = `${file(key)}.${process.pid}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value, null, 2));
      await fs.rename(tmp, file(key));
    },
    async delete(key) {
      await fs.rm(file(key), { force: true });
    },
    async list(prefix) {
      try {
        const names = await fs.readdir(dir);
        return names
          .filter((n) => n.endsWith(".json") && !n.includes(".tmp"))
          .map((n) => n.replace(/\.json$/, ""))
          .filter((k) => k.startsWith(prefix))
          .sort();
      } catch {
        return [];
      }
    },
  };
}

const cache = new Map<string, Store>();

export function store(name: string): Store {
  let s = cache.get(name);
  if (!s) {
    s = onNetlify ? netlifyStore(name) : fsStore(name);
    cache.set(name, s);
  }
  return s;
}

export const storeBackend = onNetlify ? "netlify-blobs" : "filesystem";
