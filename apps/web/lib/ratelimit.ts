import "server-only";
import { store } from "./store";
import { sign } from "./crypto";

/**
 * Fixed-window rate limiting for the anonymous submission route.
 *
 * Counters live in the shared store rather than in process memory, because
 * serverless instances are not shared and an in-memory limiter would reset
 * itself on every cold start.
 *
 * The key is an HMAC of the client address, never the address itself: the
 * limiter needs to tell two callers apart, not to know who they are. Nothing
 * here can be reversed into an IP, and the records expire on their own.
 */

const limits = () => store("termina-limits");

export interface RateLimit {
  windowMs: number;
  max: number;
}

export interface RateResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  resetAt: number;
}

/**
 * The client address, taken from the proxy headers Netlify sets. The leftmost
 * X-Forwarded-For entry is client-controlled and therefore only a hint; it is
 * good enough to slow a naive script down, which is all a rate limiter is for.
 */
export function clientAddress(req: Request): string {
  const nf = req.headers.get("x-nf-client-connection-ip");
  if (nf) return nf;
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return "unknown";
}

async function bucketKey(scope: string, address: string): Promise<string> {
  const signed = await sign(`ratelimit:${scope}:${address}`);
  // Store keys are restricted to [A-Za-z0-9._-]; base64url already is, but the
  // signature is appended after a dot, so take a stable slice of the digest.
  return `${scope}_${signed.slice(signed.lastIndexOf(".") + 1, signed.lastIndexOf(".") + 33)}`;
}

export async function rateLimit(
  scope: string,
  address: string,
  { windowMs, max }: RateLimit
): Promise<RateResult> {
  const key = await bucketKey(scope, address);
  const now = Date.now();
  const s = limits();

  let bucket = await s.get<Bucket>(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
  }

  bucket.count += 1;
  await s.set(key, bucket);

  const remaining = Math.max(0, max - bucket.count);
  return {
    ok: bucket.count <= max,
    remaining,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Sweep spent buckets. Called opportunistically, not on a schedule. */
export async function pruneLimits() {
  const s = limits();
  const now = Date.now();
  for (const key of await s.list("")) {
    const bucket = await s.get<Bucket>(key);
    if (!bucket || bucket.resetAt <= now) await s.delete(key);
  }
}

/**
 * Reject a cross-site state change outright. SameSite=Lax already withholds
 * the session cookie from cross-site POSTs; this covers the submission route,
 * which has no cookie to withhold.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin fetches may omit it; no cookie is trusted on this basis alone
  try {
    const target = new URL(req.url);
    const source = new URL(origin);
    if (source.host === target.host) return true;
    const allowed = process.env.PUBLIC_SITE_URL;
    return Boolean(allowed && new URL(allowed).host === source.host);
  } catch {
    return false;
  }
}
