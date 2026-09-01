"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CELLS, N, type PublicIcon } from "@termina/glyph";
import { Glyph } from "./Glyph";
import { DownArrowLong, External } from "./Icons";
import { useToast } from "./Toast";
import { usePrefersReducedMotion } from "./useTheme";
import { download } from "@/lib/browser";
import { setZip } from "@/lib/exports";

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

  const strip = icons.filter((i) => i.pixels).slice(0, 5);
  const first = icons.find((i) => i.pixels);

  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-copy">
          <h1>Icons drawn one pixel at a time.</h1>
          <p className="hero-sub">
            {icons.length ? (
              <>
                <b>{icons.length}</b> glyph{icons.length === 1 ? "" : "s"}, all on the same 13 by 13
                grid, exported as SVG that inherits currentColor.
              </>
            ) : (
              "Every glyph lives on the same 13 by 13 grid and exports as SVG that inherits currentColor."
            )}
          </p>
          <div className="hero-cta">
            <a className="btn btn-primary" href="#drawer">
              Browse the set
            </a>
            <button className="btn" type="button" onClick={downloadAll}>
              Download SVGs
            </button>
          </div>
        </div>
        {/* Decorative: the reel says the same thing the copy already says. */}
        <HeroBoard frames={[MARK_BITS, ...drawn.slice(0, 14).map((i) => i.pixels)]} />
      </section>

      <div className="sec-head">
        <h2>How the set is built</h2>
        <p>One grid, one export path, and enough metadata to find a glyph six months from now.</p>
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
              Every glyph occupies the same {CELLS} cells. Nothing sits half a pixel off, so weight
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
              Runs of pixels merge into single rects. No paths to simplify, no strokes that drift
              when you scale them.
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
            <h3>Named, slugged, filed</h3>
            <p>
              Each glyph carries a name, a stable slug, a category and keywords, so search finds it
              by whatever you happen to call it.
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
              Every glyph as its own file, plus the JSON manifest and the licence, in one zip.
            </span>
          </span>
          <DownArrowLong className="res-go" />
        </button>
        <Link className="res" href="/editor">
          <span className="res-body">
            <span className="res-t">Draw one yourself</span>
            <span className="res-d">
              Open the editor, draw on the same grid, and submit it for the set. No account needed.
            </span>
          </span>
          <External className="res-go" />
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
              The studio the set is drawn in, the export code, and the glyph format.
            </span>
          </span>
          <External className="res-go" />
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
              <code>npm i termina-icons</code> — raw SVG, an SVG sprite, and React components.
            </span>
          </span>
          <External className="res-go" />
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
