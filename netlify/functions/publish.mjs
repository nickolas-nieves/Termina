import { getStore } from "@netlify/blobs";
import { json, authorized } from "../lib/glyph.mjs";

/**
 * Cuts a public snapshot from the private working set. Only glyphs marked
 * `final` are published — draft and review glyphs stay private.
 *
 * This is the seam for the eventual public site: it reads /api/set, which is
 * unauthenticated and CORS-open, and never touches the working set.
 *
 *   POST /api/publish
 */

const SET_KEY = "set.json";
const PUBLISHED_KEY = "published.json";

const store = () => getStore({ name: "termina", consistency: "strong" });

export default async (req) => {
  if (!authorized(req)) return json({ error: "unauthorized" }, 401);
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  const s = store();
  const doc = (await s.get(SET_KEY, { type: "json" })) || { icons: {} };

  const icons = Object.values(doc.icons || {})
    .filter(i => i && i.status === "final")
    .sort((a, b) => a.slug.localeCompare(b.slug))
    .map(({ id, name, slug, category, tags, version, pixels }) => ({
      id, name, slug, category, tags, version, pixels
    }));

  const snapshot = {
    format: "termina-iconset",
    version: 1,
    grid: 13,
    publishedAt: new Date().toISOString(),
    count: icons.length,
    icons
  };

  await s.setJSON(PUBLISHED_KEY, snapshot);
  return json({ ok: true, count: icons.length, publishedAt: snapshot.publishedAt });
};

export const config = { path: "/api/publish" };
