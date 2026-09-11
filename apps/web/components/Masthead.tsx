"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PublicIcon } from "@termina/glyph";
import { Mark, Wordmark } from "./Mark";
import { Menu } from "./Menu";
import { useToast } from "./Toast";
import { useTheme } from "./useTheme";
import { THEME_LABEL } from "./ThemeScript";
import { downloadText, download } from "@/lib/browser";
import { manifestJSON, setZip, sheetSVG } from "@/lib/exports";
import { ChevronDown, Ellipsis, CircleQuestion } from "termina-icons/react"

/**
 * The public site header. Three tracks, so the wordmark stays optically
 * centred however wide the two clusters flanking it get.
 */
export function Masthead({ icons }: { icons: PublicIcon[] }) {
  const pathname = usePathname();
  const toast = useToast();
  const { theme, cycle } = useTheme();

  const route = pathname.startsWith("/editor") ? "editor" : "drawer";

  function exportSet(kind: "json" | "svgzip" | "sheet") {
    if (!icons.length) return toast("The set is empty");
    if (kind === "json") {
      downloadText("termina-iconset.json", manifestJSON(icons), "application/json");
      return toast(`Downloaded ${icons.length} glyphs as JSON`);
    }
    if (kind === "sheet") {
      downloadText("termina-sheet.svg", sheetSVG(icons), "image/svg+xml");
      return toast("Downloaded the reference sheet");
    }
    download("termina-svg.zip", setZip(icons));
    toast(`Downloaded ${icons.length} SVG${icons.length === 1 ? "" : "s"}`);
  }

  return (
    <header className="masthead">
      <nav className="nav-left" aria-label="Primary">
        <Link
          className="nav-logo"
          href="/"
          title={`Icon drawer — ${icons.length} glyph${icons.length === 1 ? "" : "s"}`}
          aria-current={route === "drawer" ? "page" : undefined}
        >
          <Mark />
          <span className="sr-only">Termina Icons</span>
        </Link>
        <Link className="tab" href="/editor" aria-current={route === "editor" ? "page" : undefined}>
          Editor
        </Link>
      </nav>

      <div className="wordmark" role="img" aria-label="Termina">
        <Wordmark />
      </div>

      <div className="masthead-actions">
        <Menu
          label="Export the set"
          trigger={
            <>
              Export
              <ChevronDown size={13} />
            </>
          }
        >
          {(close) => (
            <>
              <button type="button" role="menuitem" onClick={() => { close(); exportSet("json") }}>
                Set as JSON<span className="sub">.json</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { close(); exportSet("svgzip") }}>
                All glyphs as SVG<span className="sub">.zip</span>
              </button>
              <button type="button" role="menuitem" onClick={() => { close(); exportSet("sheet") }}>
                Sprite reference sheet<span className="sub">.svg</span>
              </button>
              <hr />
              <a role="menuitem" href="/api/set" target="_blank" rel="noopener noreferrer">
                Public JSON feed<span className="sub">/api/set</span>
              </a>
              <a role="menuitem" href="/api/sprite.svg" target="_blank" rel="noopener noreferrer">
                SVG sprite<span className="sub">/api/sprite.svg</span>
              </a>
            </>
          )}
        </Menu>

        <Menu label="More actions" className="btn btn-ghost more-btn" trigger={<Ellipsis />}>
          {(close) => (
            <>
              <Link role="menuitem" href="/editor" onClick={close}>
                Submit an icon
              </Link>
              <a
                role="menuitem"
                href="https://github.com/nickolas-nieves/Termina"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source on GitHub
              </a>
              <hr />
              {/* The appearance row cycles in place, so it is the one item that
                  keeps the menu open — everything else is a one-shot action. */}
              <button type="button" role="menuitem" onClick={cycle}>
                Appearance<span className="sub">{THEME_LABEL[theme]}</span>
              </button>
              <Link role="menuitem" href="/admin" onClick={close}>
                Admin
              </Link>
            </>
          )}
        </Menu>

        <Menu
          label="Keyboard shortcuts"
          className="btn btn-ghost tips-btn"
          menuClassName="menu-tips"
          trigger={<CircleQuestion size={13} />}
        >
          {() => (
            <>
              <h3>Shortcuts</h3>
              <ul className="shortcuts-list">
                <li>Paint / erase<span className="keys"><kbd>drag</kbd></span></li>
                <li>Erase only<span className="keys"><kbd>right-drag</kbd></span></li>
                <li>Undo / redo<span className="keys"><kbd>⌘Z</kbd><kbd>⇧⌘Z</kbd></span></li>
                <li>Nudge (wraps)<span className="keys"><kbd>← ↑ ↓ →</kbd></span></li>
                <li>Mirror / rotate<span className="keys"><kbd>H</kbd><kbd>V</kbd><kbd>R</kbd></span></li>
                <li>Invert / guides<span className="keys"><kbd>I</kbd><kbd>G</kbd></span></li>
                <li>Clear grid<span className="keys"><kbd>⇧C</kbd></span></li>
                <li>Search drawer<span className="keys"><kbd>/</kbd></span></li>
              </ul>
            </>
          )}
        </Menu>
      </div>
    </header>
  );
}
