"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark, Wordmark } from "../Mark";
import { Menu } from "../Menu";
import { Ellipsis } from "termina-icons/react";
import { useTheme } from "../useTheme";
import { THEME_LABEL } from "../ThemeScript";

/**
 * The admin header. Same bar as the public site so the console does not feel
 * like a different product, with the session and its exits in place of the
 * public export menu.
 */
export function AdminMasthead({ login }: { login: string | null }) {
  const pathname = usePathname();
  const { theme, cycle } = useTheme();

  return (
    <header className="masthead">
      <nav className="nav-left" aria-label="Primary">
        <Link className="nav-logo" href="/" title="Back to the public site">
          <Mark />
          <span className="sr-only">Termina Icons</span>
        </Link>
        <Link
          className="tab"
          href="/admin"
          aria-current={pathname === "/admin" ? "page" : undefined}
        >
          Admin
        </Link>
      </nav>

      <div className="wordmark" role="img" aria-label="Termina">
        <Wordmark />
      </div>

      <div className="masthead-actions">
        {login ? (
          <span className="sync-pill" data-state="ok" title={`Signed in as ${login}`}>
            <span className="dot" />
            <span className="sync-text">{login}</span>
          </span>
        ) : null}

        <Menu label="More actions" className="btn btn-ghost more-btn" trigger={<Ellipsis />}>
          {(close) => (
            <>
              <Link role="menuitem" href="/" onClick={close}>
                Public site<span className="sub">exit</span>
              </Link>
              <a
                role="menuitem"
                href="https://github.com/nickolas-nieves/Termina"
                target="_blank"
                rel="noopener noreferrer"
              >
                Repository<span className="sub">GitHub</span>
              </a>
              <hr />
              <button type="button" role="menuitem" onClick={cycle}>
                Appearance<span className="sub">{THEME_LABEL[theme]}</span>
              </button>
              {login ? (
                // A form POST rather than a link: a GET logout can be fired by
                // any page that can make the browser load a URL.
                <form action="/api/auth/logout" method="post">
                  <button type="submit" role="menuitem">
                    Sign out<span className="sub">{login}</span>
                  </button>
                </form>
              ) : null}
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
