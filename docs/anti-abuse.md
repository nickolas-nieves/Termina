# Protecting the submission endpoint

`POST /api/submissions` is the only place on this site where someone with no
account can write. Everything else is either static or behind an admin session.
This is what stands in front of it, and — just as importantly — what doesn't.

## The layers

In the order a request meets them, in `apps/web/app/api/submissions/route.ts`:

1. **Same-origin only.** A request carrying an `Origin` header from another site
   is refused, so the endpoint can't be driven from a page you don't control.

2. **A signed, single-use, time-windowed ticket.** The editor fetches one when
   it mounts (`GET /api/submissions`). It is HMAC-signed, so it can't be forged;
   accepted only between 3 seconds and 6 hours old; and recorded as spent on
   use. A submission therefore costs a GET, a wait, and a POST rather than one
   blind POST. See `apps/web/lib/ticket.ts`.

3. **A honeypot.** A `website` field, positioned off-screen and removed from the
   tab order, that no person can fill in. A filled one gets `200 OK` and is
   silently dropped — a bot told it failed will just try something else.

4. **Per-address rate limits.** Five submissions and forty tickets per hour, in
   a fixed window. Counters live in the shared store, not process memory,
   because serverless instances aren't shared and an in-memory limiter would
   reset on every cold start.

5. **A cap on unreviewed submissions per source.** Eight. Once a source has that
   many sitting in the queue, it can't add more until they're reviewed. This is
   the one that actually protects *your time*: rate limits bound the flow, this
   bounds the backlog.

6. **Strict validation.** Every field is length-clamped and character-checked in
   `apps/web/lib/submissions.ts`; the bitmap must be exactly 169 characters of
   `0`/`1` and not blank. Nothing is stored that wasn't understood.

## What isn't collected

No email address, no account, no IP address. The submitter's address is used to
derive an HMAC (`sourceHash`) and then discarded. That hash groups submissions
from one source during review — it's the `src ab12cd` label in the queue — and
cannot be reversed into an address. It's never sent to the client.

The one field that renders publicly is the optional credit name, so it's held to
a tighter character set than anything else: letters, numbers, spaces, and
`. ' - _`. No URLs, no markup, nothing that could read as a link or an
instruction. It's rejected rather than stripped, so the contributor is told why.

## What this does and doesn't stop

**Stops:** drive-by spam, naive scripted POSTs, form-filler bots, anyone who
found the endpoint and tried it once.

**Doesn't stop:** someone who actually tries. A script that fetches a ticket,
waits three seconds, and rotates through addresses will get submissions into the
queue. The rate limiter slows it; the per-source cap limits how much of the
queue any one source can occupy; the review step means none of it reaches the
public site. But you would have rejections to click.

This was a deliberate trade: a captcha was considered and declined, in exchange
for not adding a third-party dependency and not asking contributors to solve
anything. The queue is built so that being wrong about it is survivable —
submissions never touch the published set, and rejecting in bulk is cheap.

## Adding a captcha later

If the queue does get flooded, the change is contained. Cloudflare Turnstile is
free, privacy-preserving, and usually invisible to the user:

1. Get a site key and secret key from the Cloudflare dashboard.
2. Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.
3. Render the widget in `SubmitDialog.tsx` and post the resulting token.
4. Verify it in `verifyTicket` (or beside it) against
   `https://challenges.cloudflare.com/turnstile/v0/siteverify`.

Gate it on the keys being present, so local development and forks keep working
without them.
