import "server-only";
import { cookies } from "next/headers";
import { randomId, sign, unsign } from "./crypto";
import { store } from "./store";

/**
 * Server-side sessions.
 *
 * The cookie carries only a signed, random session id — never any claim about
 * who you are and never the GitHub token. Everything of substance lives in the
 * store, keyed by that id, so a session can be revoked instantly and a stolen
 * cookie stops working the moment it is deleted.
 */

export const SESSION_COOKIE = "termina_session";
const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours
const sessions = () => store("termina-sessions");

export interface Session {
  id: string;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  /** The admin's own GitHub token, used to attribute publish commits to them. */
  githubToken: string;
  createdAt: string;
  expiresAt: string;
}

const isProd = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  // Lax rather than Strict: the OAuth callback is a cross-site top-level
  // navigation and would arrive without the cookie under Strict. Lax still
  // withholds the cookie from cross-site POSTs, and every mutating route
  // checks the Origin header on top of that.
  sameSite: "lax" as const,
  path: "/",
};

export async function createSession(data: Omit<Session, "id" | "createdAt" | "expiresAt">) {
  const id = randomId();
  const now = Date.now();
  const session: Session = {
    ...data,
    id,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };
  await sessions().set(id, session);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await sign(id), { ...cookieOptions, maxAge: SESSION_TTL_MS / 1000 });
  return session;
}

export async function readSession(): Promise<Session | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const id = await unsign(raw);
  if (!id) return null;

  const session = await sessions().get<Session>(id);
  if (!session) return null;

  if (Date.parse(session.expiresAt) < Date.now()) {
    await sessions().delete(id);
    return null;
  }
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const id = await unsign(jar.get(SESSION_COOKIE)?.value);
  if (id) await sessions().delete(id);
  jar.delete(SESSION_COOKIE);
}

/** Best-effort sweep of expired records, so the store does not grow forever. */
export async function pruneSessions() {
  const s = sessions();
  const keys = await s.list("");
  const now = Date.now();
  for (const key of keys) {
    const rec = await s.get<Session>(key);
    if (!rec || Date.parse(rec.expiresAt) < now) await s.delete(key);
  }
}
