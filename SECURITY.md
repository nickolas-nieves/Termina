# Security

## Reporting a vulnerability

Please report security issues privately, through GitHub's
[private vulnerability reporting](https://github.com/nickolas-nieves/Termina/security/advisories/new)
on this repository. Don't open a public issue.

Include what you did, what happened, and what you think the impact is. A proof
of concept helps. You'll get an acknowledgement as soon as it's seen.

Please don't run automated scanners against the live site, and don't test
anything that would degrade it for other people or touch data that isn't yours.

## What's in scope

This project has one anonymous write endpoint and one privileged console, so
those are where the interesting problems will be:

- Getting content onto the public site without an admin accepting and publishing
  it
- Reading the working set or the submission queue without an admin session
- Forging, fixating or stealing an admin session
- Making the publish route commit something other than what the diff showed
- Recovering a submitter's IP address from anything the app stores or serves
- Cross-site scripting, especially through glyph metadata or a credit name

## What's known and accepted

**The submission queue can be flooded by a determined attacker.** The endpoint
is protected by a signed single-use ticket, a honeypot, per-address rate limits
and a cap on unreviewed submissions per source — but no captcha. A script that
rotates addresses will get entries into the queue. This was a deliberate trade;
submissions never reach the public site without review, so the cost is a
maintainer's time rather than site integrity.
[docs/anti-abuse.md](docs/anti-abuse.md) has the reasoning and how to add a
captcha if it stops being acceptable.

**Rate limiting keys off proxy headers.** The leftmost `X-Forwarded-For` entry
is client-controlled and therefore a hint, not an identity. `X-Nf-Client-Connection-Ip`
is preferred where the platform sets it.

**An admin has full trust.** Anyone on `ADMIN_GITHUB_LOGINS` can publish
anything to the repository as themselves. There's no second reviewer and no
approval step; that's the intended model for a single-maintainer set.

## Deployment notes that are security-relevant

- `SESSION_SECRET` must be at least 32 characters in production. The app refuses
  to start otherwise rather than falling back to a known development value.
- `ADMIN_GITHUB_LOGINS` empty means *nobody* is an admin. A fork inherits no
  publish rights.
- `PUBLIC_SITE_URL` must be set in production. Without it the OAuth redirect
  falls back to the request's `Host` header, which a client can forge.
- `.data/` holds sessions, GitHub tokens, the working set and the submission
  queue. It's gitignored; keep it that way.
