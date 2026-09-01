import "server-only";
import { randomId, sign, unsign } from "./crypto";
import { store } from "./store";

/**
 * Submission tickets.
 *
 * Without a captcha, the cheapest useful defence is to make a submission cost
 * more than one blind POST. A ticket is issued when the editor loads, signed
 * so it cannot be forged, and accepted only inside a time window and only
 * once. That forces a bot into a GET-then-POST handshake with a minimum delay,
 * which stops the naive case; the rate limiter handles the rest.
 *
 * This is deliberately modest. If the queue ever gets flooded by something
 * that actually tries, the place to add a captcha is `verifyTicket` — see
 * `docs/anti-abuse.md`.
 */

const MIN_AGE_MS = 3_000; // a person cannot draw and submit faster than this
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // long enough to draw something careful
const used = () => store("termina-limits");

export async function issueTicket(): Promise<string> {
  return sign(`${Date.now()}.${randomId(12)}`);
}

export type TicketResult = { ok: true } | { ok: false; reason: string };

export async function verifyTicket(raw: unknown): Promise<TicketResult> {
  if (typeof raw !== "string" || raw.length > 512) {
    return { ok: false, reason: "Missing submission ticket. Reload the editor and try again." };
  }

  const value = await unsign(raw);
  if (!value) {
    return { ok: false, reason: "That submission ticket isn't valid. Reload the editor and try again." };
  }

  const [issuedAt, nonce] = value.split(".");
  const age = Date.now() - Number(issuedAt);
  if (!Number.isFinite(age) || !nonce) {
    return { ok: false, reason: "That submission ticket isn't valid. Reload the editor and try again." };
  }
  if (age < MIN_AGE_MS) {
    return { ok: false, reason: "That was too fast — take a moment and submit again." };
  }
  if (age > MAX_AGE_MS) {
    return { ok: false, reason: "This page has been open a while. Reload the editor and submit again." };
  }

  // One use each. The record expires with the ticket window, so the store does
  // not accumulate: `pruneLimits` sweeps anything past its reset time.
  const key = `used_${nonce.replace(/[^A-Za-z0-9_-]/g, "")}`;
  if (await used().get(key)) {
    return { ok: false, reason: "That submission was already received." };
  }
  await used().set(key, { count: 1, resetAt: Date.now() + MAX_AGE_MS });

  return { ok: true };
}
