import Link from "next/link";
import { Mark } from "./Mark";

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="foot-inner">
        <span className="foot-mark" role="img" aria-label="Termina">
          <Mark />
        </span>
        <p>Termina Icons. Released under the MIT license.</p>
        <nav aria-label="Footer">
          <a href="https://github.com/nickolas-nieves/Termina" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <Link href="/editor">Editor</Link>
          <Link href="/admin">Admin</Link>
        </nav>
      </div>
    </footer>
  );
}
