"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CELLS, N, type PublicIcon } from "@termina/glyph";
import { Glyph } from "./Glyph";
import { useToast } from "./Toast";
import { usePrefersReducedMotion } from "./useTheme";
import { download } from "@/lib/browser";
import { setZip } from "@/lib/exports";
import { ArrowDown, Download, ExternalLink, Link as LinkIcon } from "termina-icons/react";

/* The T mark, drawn on the same 13×13 grid as every glyph in the set. It is
   the first frame of the hero reel, so the board opens on something known. */
const MARK_BITS =
  "0000000000000" + "0000000000000" + "0010101010100" + "0001010101000" +
  "0010101010100" + "0000010100000" + "0000001000000" + "0000010100000" +
  "0000001000000" + "0000010100000" + "0000001000000" + "0000010100000" +
  "0000000000000";

export function Landing({ icons }: { icons: PublicIcon[] }) {
  const toast = useToast();
  const drawn = icons.filter((i) => i.pixels && i.pixels !== MARK_BITS);

  function downloadAll() {
    if (!icons.length) return toast("The set is empty");
    download("termina-svg.zip", setZip(icons));
    toast(`Downloaded ${icons.length} SVG${icons.length === 1 ? "" : "s"}`);
  }

  /* The server render and the first client paint have to agree, so both start
     from the set's own order; the shuffle waits until after hydration. */
  const [picks, setPicks] = useState(() => icons.filter((i) => i.pixels));
  useEffect(() => {
    setPicks(icons.filter((i) => i.pixels).sort(() => Math.random() - 0.5));
  }, [icons]);
  const strip = picks.slice(0, 5);
  const first = picks[0];

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <h1>Icons drawn one pixel at a time.</h1>
          <p className="hero-sub">
            {icons.length ? (
              <>
                A fully open source, community created set of <b>{icons.length}</b> glyph{icons.length === 1 ? "" : "s"}, all on the same 13 by 13
                grid for use in any project.
              </>
            ) : (
              "A fully open source, community created set, all on the same 13 by 13 grid for use in any project."
            )}
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#drawer">
              Browse the set
            </a>
            <a className="btn" href="/editor">
              Create a glyph
            </a>
          </div>
        </div>
        {/* Decorative: the reel says the same thing the copy already says. */}
        <HeroBoard frames={[MARK_BITS, ...drawn.sort(() => Math.random() - 0.5).slice(0, 14).map((i) => i.pixels)]} />
      </section>

      <div className="sec-head">
        <h2>How the set is built</h2>
        <p>One grid, one export path, and succinct metadata that is easy to use wherever you need it.</p>
      </div>

      <section className="about">
        <article className="fact wide">
          <div className="fact-vis">
            {(strip.length ? strip : [{ pixels: MARK_BITS, name: "Termina" } as PublicIcon]).map((i, n) => (
              <span className="fact-tile" key={i.slug ?? n} title={i.name}>
                <Glyph pixels={i.pixels} size={26} />
              </span>
            ))}
          </div>
          <div>
            <h3>One grid, no exceptions</h3>
            <p>
              Every glyph occupies the same {CELLS} cells. Every glyph is perfect, so weight
              and rhythm stay even across the whole set.
            </p>
          </div>
        </article>

        <article className="fact tint">
          <pre className="fact-code">
            <code>{`<svg viewBox="0 0 ${N} ${N}"\n     shape-rendering="crispEdges"\n     fill="currentColor">`}</code>
          </pre>
          <div>
            <h3>Sharp SVG, small files</h3>
            <p>
              Runs of pixels merge into single rects and allow for smooth scaling at any size.
            </p>
          </div>
        </article>

        <article className="fact tint">
          <div className="fact-vis">
            <span className="fact-tile">
              <Glyph pixels={first?.pixels ?? MARK_BITS} size={26} />
            </span>
            <span className="fact-tile invert">
              <Glyph pixels={first?.pixels ?? MARK_BITS} size={26} />
            </span>
          </div>
          <div>
            <h3>Takes your text color</h3>
            <p>
              Glyphs fill with currentColor, so one file covers light and dark without a second
              asset.
            </p>
          </div>
        </article>

        <article className="fact wide">
          {first ? (
            <div className="fact-meta">
              <span className="fact-tile sm">
                <Glyph pixels={first.pixels} size={18} />
              </span>
              <span className="fm-name">{first.name}</span>
              <code>{first.slug}</code>
              {first.category ? <span className="fm-cat">{first.category}</span> : null}
            </div>
          ) : null}
          <div>
            <h3>Named, slugged, and filed</h3>
            <p>
              Each glyph carries a name, a stable slug, a category and keywords, so search supports easier discovery.
            </p>
          </div>
        </article>
      </section>

      <div className="sec-head">
        <h2>Resources</h2>
      </div>

      <section className="resources">
        <button className="res" type="button" onClick={downloadAll}>
          <span className="res-body">
            <span className="res-t">Download SVGs</span>
            <span className="res-d">
              Every glyph as its own file, plus the JSON manifest and the licence, in a zip file.
            </span>
          </span>

          <span className="res-go">
            <Download size={16}/>
          </span>
        </button>
        <Link className="res" href="/editor">
          <span className="res-body">
            <span className="res-t">Create a glyph</span>
            <span className="res-d">
              Open the editor, create a glyph, and download for yourself or submit it for the set.
            </span>
          </span>
          <span className="res-go">
            <LinkIcon size={16}/>
          </span>
        </Link>
        <a
          className="res"
          href="https://github.com/nickolas-nieves/Termina"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="res-body">
            <span className="res-t">Source on GitHub</span>
            <span className="res-d">
              The source code for the set, the editor, and the library. All open source and free to use.
            </span>
          </span>
          <span className="res-go">
            <ExternalLink size={16}/>
          </span>
        </a>
        <a
          className="res"
          href="https://www.npmjs.com/package/termina-icons"
          target="_blank"
          rel="noopener noreferrer"
        >
          <span className="res-body">
            <span className="res-t">Install from npm</span>
            <span className="res-d">
              <code>npm i termina-icons</code>
            </span>
          </span>
          <span className="res-go">
            <ExternalLink size={16}/>
          </span>
        </a>
      </section>
    </div>
  );
}

/**
 * One <i> per cell, built once. Each carries its own transition delay, so a
 * repaint travels across the board on the diagonal instead of flipping at once.
 */
function HeroBoard({ frames }: { frames: string[] }) {
  const reduced = usePrefersReducedMotion();
  const [at, setAt] = useState(0);
  const reel = useRef(frames);
  reel.current = frames;

  useEffect(() => {
    if (reduced || frames.length < 2) return;
    const t = setInterval(() => {
      if (document.hidden) return; // no repaints behind a hidden tab
      setAt((n) => (n + 1) % reel.current.length);
    }, 2600);
    return () => clearInterval(t);
  }, [reduced, frames.length]);

  const bits = frames[Math.min(at, frames.length - 1)] ?? frames[0]!;

  return (
    <div className="hero-board" aria-hidden="true">
      {Array.from({ length: CELLS }, (_, i) => (
        <i
          key={i}
          className={bits[i] === "1" ? "on" : undefined}
          style={{ ["--d" as string]: String(((i % N) + Math.floor(i / N)) * 16) }}
        />
      ))}
    </div>
  );
}
