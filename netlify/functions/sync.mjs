import { getStore } from "@netlify/blobs";
import { json, authorized, normalizeIcon } from "../lib/glyph.mjs";

/**
 * Private working set. Every device posts what it has; the server merges and
 * returns the authoritative document. One round trip does both push and pull,
 * which means an offline device just needs to call this once when it comes back.
 *
 *   GET  /api/sync  -> current document
 *   POST /api/sync  -> merge {icons:[], deleted:{}} and return the result
 */

const SET_KEY = "set.json";
const TOMBSTONE_DAYS = 120;

const store = () => getStore({ name: "termina", consistency: "strong" });

const EMPTY = { icons: {}, deleted: {}, rev: 0, updatedAt: null };

export default async (req) => {
  if (!authorized(req)) {
    return json({ error: "unauthorized", hint: "Missing or wrong passphrase." }, 401);
  }

  const s = store();
  const doc = (await s.get(SET_KEY, { type: "json" })) || { ...EMPTY };
  doc.icons ||= {};
  doc.deleted ||= {};

  if (req.method === "GET") return json(doc);
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "body must be JSON" }, 400);
  }

  const icons = { ...doc.icons };
  const deleted = { ...doc.deleted };

  // 1. Incoming glyphs win only if they are strictly newer (ISO strings sort correctly).
  for (const raw of Array.isArray(body.icons) ? body.icons : []) {
    const inc = normalizeIcon(raw);
    if (!inc) continue;
    const cur = icons[inc.id];
    if (!cur || inc.updatedAt > cur.updatedAt) icons[inc.id] = inc;
  }

  // 2. Collect tombstones from both sides, keeping the latest delete time.
  for (const [id, at] of Object.entries(body.deleted || {})) {
    const t = String(at);
    if (!deleted[id] || t > deleted[id]) deleted[id] = t;
  }

  // 3. A delete only sticks if nothing newer has edited that glyph since.
  //    Editing a glyph on device B after deleting it on device A revives it.
  for (const [id, at] of Object.entries(deleted)) {
    const ic = icons[id];
    if (ic && ic.updatedAt > at) delete deleted[id];
    else delete icons[id];
  }

  // 4. Forget ancient tombstones so the document does not grow without bound.
  const cutoff = new Date(Date.now() - TOMBSTONE_DAYS * 86400000).toISOString();
  for (const [id, at] of Object.entries(deleted)) if (at < cutoff) delete deleted[id];

  const next = {
    icons,
    deleted,
    rev: (doc.rev || 0) + 1,
    updatedAt: new Date().toISOString()
  };

  await s.setJSON(SET_KEY, next);
  return json(next);
};

export const config = { path: "/api/sync" };
