import { cookies } from "next/headers";
import { unsign, timingSafeEqual } from "@/lib/crypto";
import { isAdminLogin } from "@/lib/admin";
import { exchangeCode, fetchUser } from "@/lib/github";
import { createSession } from "@/lib/session";
import { redirectUri, safeNext, siteOrigin } from "@/lib/urls";

/**
 * Finish the GitHub OAuth handshake.
 *
 * Everything is checked before a session exists: the state must match the
 * cookie we set, the code must exchange, the account must resolve, and the
 * login must be on the allowlist. A GitHub account that is not an admin gets
 * no session at all rather than a session with no rights.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const origin = siteOrigin(req);
  const url = new URL(req.url);
  const jar = await cookies();

  const fail = (error: string) => {
    jar.delete("termina_oauth_state");
    return Response.redirect(new URL(`/admin/signin?error=${error}`, origin), 302);
  };

  if (url.searchParams.get("error")) return fail("denied");

  const state = url.searchParams.get("state");
  const cookieState = jar.get("termina_oauth_state")?.value;
  if (!state || !cookieState || !timingSafeEqual(state, cookieState)) return fail("state");

  const payload = await unsign(state);
  if (!payload) return fail("state");
  const next = safeNext(payload.split("|")[1]);

  const code = url.searchParams.get("code");
  if (!code) return fail("state");

  const token = await exchangeCode(code, redirectUri(req));
  if (!token) return fail("exchange");

  const user = await fetchUser(token);
  if (!user) return fail("exchange");

  if (!isAdminLogin(user.login)) return fail("forbidden");

  await createSession({
    login: user.login,
    name: user.name,
    avatarUrl: user.avatarUrl,
    githubToken: token,
  });

  jar.delete("termina_oauth_state");
  return Response.redirect(new URL(next, origin), 302);
}
