import Link from "next/link";
import { redirect } from "next/navigation";
import { Mark } from "@/components/Mark";
import { GitHub, Warn } from "@/components/Icons";
import { adminConfigured, adminLogins, requireAdmin } from "@/lib/admin";
import { storeBackend } from "@/lib/store";

export const dynamic = "force-dynamic";

const MESSAGES: Record<string, string> = {
  denied: "GitHub sign-in was cancelled.",
  state: "That sign-in link expired or didn't match. Start again from this page.",
  exchange: "GitHub wouldn't confirm that sign-in. Try once more.",
  forbidden:
    "That GitHub account isn't on the admin allowlist for this site. Signing in with a different account, or adding this one to ADMIN_GITHUB_LOGINS, will fix it.",
  unconfigured: "Admin sign-in isn't configured on this deployment yet.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; signedout?: string; next?: string }>;
}) {
  const session = await requireAdmin();
  if (session) redirect("/admin");

  const { error, signedout, next } = await searchParams;
  const configured = adminConfigured();
  const loginCount = adminLogins().length;

  return (
    <main className="signin">
      <div className="signin-card">
        <div className="mark">
          <Mark />
        </div>
        <h1>Termina admin</h1>
        <p>
          Sign in with GitHub to manage the icon set. Publishing commits to the repository as you,
          so the account you use is the one that has to be able to push.
        </p>

        {error && MESSAGES[error] ? (
          <div className="notice notice-bad" style={{ textAlign: "left" }}>
            <Warn />
            <span>{MESSAGES[error]}</span>
          </div>
        ) : null}

        {signedout ? (
          <div className="notice notice-info" style={{ textAlign: "left" }}>
            <span>Signed out. Your session on this device has been destroyed.</span>
          </div>
        ) : null}

        {!configured ? (
          <div className="notice notice-warn" style={{ textAlign: "left" }}>
            <Warn />
            <span>
              This deployment is missing its admin configuration.{" "}
              {loginCount === 0
                ? "ADMIN_GITHUB_LOGINS is empty, so nobody can sign in."
                : "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are not set."}{" "}
              See <code>docs/deployment.md</code>.
            </span>
          </div>
        ) : (
          <a
            className="btn btn-primary btn-block"
            href={`/api/auth/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          >
            <GitHub />
            Continue with GitHub
          </a>
        )}

        <p style={{ margin: "22px 0 0", fontSize: 12 }}>
          <Link href="/">Back to the icon set</Link>
        </p>

        {process.env.NODE_ENV !== "production" ? (
          <p style={{ margin: "16px 0 0", fontSize: 11, opacity: 0.6 }}>
            Storage backend: {storeBackend}
          </p>
        ) : null}
      </div>
    </main>
  );
}
