import "server-only";
import { requireAdmin } from "./admin";
import type { Session } from "./session";

/**
 * The gate every admin API route goes through.
 *
 * Two independent checks: a valid session belonging to an allowlisted login,
 * and a same-origin request. The session cookie is SameSite=Lax, so a
 * cross-site POST would not carry it anyway — the Origin check is the belt to
 * that suspenders, and costs nothing.
 */
export async function guard(
  req: Request
): Promise<{ ok: true; session: Session } | { ok: false; response: Response }> {
  const origin = req.headers.get("origin");
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (!origin) {
      return { ok: false, response: fail("Missing Origin header.", 403) };
    }
    try {
      if (new URL(origin).host !== new URL(req.url).host) {
        return { ok: false, response: fail("Cross-origin request refused.", 403) };
      }
    } catch {
      return { ok: false, response: fail("Bad Origin header.", 403) };
    }
  }

  const session = await requireAdmin();
  if (!session) return { ok: false, response: fail("Not signed in as an admin.", 401) };

  return { ok: true, session };
}

function fail(error: string, status: number) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}

export function ok(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

export function bad(error: string, status = 400) {
  return Response.json({ error }, { status, headers: { "cache-control": "no-store" } });
}
