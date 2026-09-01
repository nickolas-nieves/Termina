import {
  ValidationError,
  pendingFromSource,
  saveSubmission,
  validateSubmission,
} from "@/lib/submissions";
import { clientAddress, pruneLimits, rateLimit, sameOrigin } from "@/lib/ratelimit";
import { issueTicket, verifyTicket } from "@/lib/ticket";

/**
 * The anonymous submission endpoint.
 *
 * This is the only place on the site where a stranger can write, so it is the
 * only place that needs real defences. In order:
 *
 *   1. same-origin only, so it cannot be driven from another page
 *   2. a signed, single-use, time-windowed ticket from GET, so a submission
 *      costs a handshake rather than one blind POST
 *   3. a honeypot field no person can fill in
 *   4. per-address rate limits, on the ticket and on the submission both
 *   5. a cap on how many unreviewed submissions one source can have queued
 *   6. strict validation and clamping of every field (see lib/submissions)
 *
 * Nothing here can reach the public set: submissions land in their own store
 * and only become icons when an admin accepts them.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BODY_BYTES = 8 * 1024;
const MAX_PENDING_PER_SOURCE = 8;

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(body, { status, headers: { "cache-control": "no-store", ...headers } });
}

/** Hand out a submission ticket. The editor calls this when it mounts. */
export async function GET(req: Request) {
  const address = clientAddress(req);
  const limit = await rateLimit("ticket", address, { windowMs: 60 * 60 * 1000, max: 40 });
  if (!limit.ok) {
    return json({ error: "Too many requests. Try again shortly." }, 429, {
      "retry-after": String(limit.retryAfterSeconds),
    });
  }
  return json({ ticket: await issueTicket() });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return json({ error: "Cross-origin submissions are not accepted." }, 403);
  }

  const address = clientAddress(req);

  const limit = await rateLimit("submit", address, { windowMs: 60 * 60 * 1000, max: 5 });
  if (!limit.ok) {
    return json(
      { error: "You've submitted several icons recently. Try again in a little while." },
      429,
      { "retry-after": String(limit.retryAfterSeconds) }
    );
  }

  // Read as text first: Request.json() would happily parse a body of any size.
  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json({ error: "That submission is too large." }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "The submission body must be JSON." }, 400);
  }

  const b = body as Record<string, unknown>;

  // The honeypot is styled off-screen and removed from the tab order, so a
  // person cannot fill it in. Answer 200 rather than an error: a bot that is
  // told it failed will try again differently.
  if (typeof b.website === "string" && b.website.trim() !== "") {
    return json({ ok: true, id: null });
  }

  const ticket = await verifyTicket(b.ticket);
  if (!ticket.ok) return json({ error: ticket.reason }, 400);

  if ((await pendingFromSource(address)) >= MAX_PENDING_PER_SOURCE) {
    return json(
      {
        error:
          "You already have several submissions waiting for review. They'll be looked at before you can send more.",
      },
      429
    );
  }

  let submission;
  try {
    submission = await validateSubmission(body, address);
  } catch (err) {
    if (err instanceof ValidationError) {
      return json({ error: err.message, field: err.field }, 400);
    }
    console.error("submission failed", err);
    return json({ error: "Something went wrong saving that submission." }, 500);
  }

  await saveSubmission(submission);

  // Opportunistic housekeeping, on the write path where it is already slow.
  if (Math.random() < 0.05) void pruneLimits().catch(() => {});

  return json({ ok: true, id: submission.id });
}
