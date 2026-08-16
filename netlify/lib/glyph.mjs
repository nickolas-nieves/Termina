/* Shared server-side glyph helpers. Kept outside netlify/functions so it is
   bundled as a module rather than deployed as its own function. */

export const N = 13;
export const CELLS = N * N;

export function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...extraHeaders }
  });
}

/** Constant-time-ish comparison so the passphrase check does not leak length by timing. */
export function safeEqual(a, b) {
  a = String(a || "");
  b = String(b || "");
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Passphrase gate. If TERMINA_KEY is unset the API is open — that is only
 * intended for `netlify dev`, and the studio warns about it in the UI.
 */
export function authorized(req) {
  const expected = process.env.TERMINA_KEY;
  if (!expected) return true;
  const given = req.headers.get("x-termina-key") || new URL(req.url).searchParams.get("key") || "";
  return safeEqual(given, expected);
}

const STATUSES = ["draft", "review", "final"];

/** Defensive normalisation — never trust what a client posts into the store. */
export function normalizeIcon(raw) {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  const bits = String(raw.pixels || "").replace(/[^01]/g, "").padEnd(CELLS, "0").slice(0, CELLS);
  const name = String(raw.name || "").trim().slice(0, 120) || "Untitled";
  const slug = String(raw.slug || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 120) || "untitled";
  return {
    id: String(raw.id).slice(0, 64),
    name,
    slug,
    category: String(raw.category || "").trim().slice(0, 80),
    tags: (Array.isArray(raw.tags) ? raw.tags : [])
      .map(t => String(t).trim().toLowerCase().slice(0, 40))
      .filter(Boolean)
      .slice(0, 24),
    status: STATUSES.includes(raw.status) ? raw.status : "draft",
    version: Number.isFinite(+raw.version) && +raw.version > 0 ? Math.min(9999, Math.floor(+raw.version)) : 1,
    pixels: bits,
    createdAt: isoOr(raw.createdAt),
    updatedAt: isoOr(raw.updatedAt)
  };
}

function isoOr(v) {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/** Merge horizontal runs of set pixels into single <rect> elements. */
export function rectList(bits) {
  const out = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      if (bits.charCodeAt(y * N + x) === 49) {
        let w = 1;
        while (x + w < N && bits.charCodeAt(y * N + x + w) === 49) w++;
        out.push(`<rect x="${x}" y="${y}" width="${w}" height="1"/>`);
        x += w;
      } else x++;
    }
  }
  return out;
}
