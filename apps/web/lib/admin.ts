import "server-only";
import { readSession, type Session } from "./session";

/**
 * Who counts as an admin.
 *
 * The allowlist is an environment variable rather than anything in the repo:
 * this is an open-source project, and a fork must not inherit publish rights.
 * An empty allowlist means nobody is an admin — deliberately failing closed.
 */

export function adminLogins(): string[] {
  return (process.env.ADMIN_GITHUB_LOGINS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminLogin(login: string | null | undefined): boolean {
  if (!login) return false;
  const list = adminLogins();
  return list.length > 0 && list.includes(login.toLowerCase());
}

/** The session, but only if it still belongs to somebody on the allowlist. */
export async function requireAdmin(): Promise<Session | null> {
  const session = await readSession();
  if (!session) return null;
  // Re-checked on every request, so removing a login from the environment
  // revokes access immediately rather than at the end of their session.
  return isAdminLogin(session.login) ? session : null;
}

export function adminConfigured(): boolean {
  return (
    adminLogins().length > 0 &&
    Boolean(process.env.GITHUB_CLIENT_ID) &&
    Boolean(process.env.GITHUB_CLIENT_SECRET)
  );
}
