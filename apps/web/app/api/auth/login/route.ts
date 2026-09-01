import { cookies } from "next/headers";
import { randomId, sign } from "@/lib/crypto";
import { adminConfigured } from "@/lib/admin";
import { authorizeUrl } from "@/lib/github";
import { redirectUri, safeNext } from "@/lib/urls";

/**
 * Start the GitHub OAuth handshake.
 *
 * The `state` is random, signed, and echoed back in a short-lived cookie, so a
 * callback that did not originate here is rejected before any code is
 * exchanged. Without it, an attacker could complete a login into the admin's
 * browser using their own authorisation code.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  if (!adminConfigured()) {
    return Response.redirect(new URL("/admin/signin?error=unconfigured", req.url), 302);
  }

  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));

  const nonce = randomId(24);
  const state = await sign(`${nonce}|${next}`);

  const jar = await cookies();
  jar.set("termina_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return Response.redirect(authorizeUrl(state, redirectUri(req)), 302);
}
