"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { glyphFile, groupByCategory, matchesQuery, type PublicIcon } from "@termina/glyph";
import { Glyph } from "./Glyph";
import { Check, CopyIcon, DownloadIcon, DownArrowLong, Search } from "./Icons";
import { useToast } from "./Toast";
import { copyText, download, downloadText } from "@/lib/browser";
import { setZip } from "@/lib/exports";

/**
 * The drawer: every published glyph, searchable by name, slug, keyword or
 * category, grouped by category, with per-glyph and per-category downloads.
 */
export function Drawer({ icons }: { icons: PublicIcon[] }) {
  const toast = useToast();
  const [query, setQuery] = useState("");
  const [cats, setCats] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const categories = useMemo(() => Array.from(groupByCategory(icons).keys()), [icons]);

  const results = useMemo(
    () =>
      icons.filter(
        (i) => (!cats.size || cats.has(i.category || "Unfiled")) && matchesQuery(i, query)
      ),
    [icons, cats, query]
  );

  const groups = useMemo(() => groupByCategory(results), [results]);

  // `/` focuses the search, unless the caret is already in a field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  async function copySVG(icon: PublicIcon) {
    const ok = await copyText(glyphFile(icon));
    if (!ok) return toast("Clipboard blocked — use Download SVG instead");
    setCopied(icon.slug);
    setTimeout(() => setCopied((s) => (s === icon.slug ? null : s)), 1100);
    toast(`Copied ${icon.slug}.svg`);
  }

  function downloadSVG(icon: PublicIcon) {
    downloadText(`${icon.slug}.svg`, glyphFile(icon), "image/svg+xml");
  }

  function downloadCategory(category: string, items: PublicIcon[]) {
    const folder = category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unfiled";
    download(`termina-${folder}.zip`, setZip(items, `termina-${folder}`));
    toast(`Downloaded ${items.length} glyph${items.length === 1 ? "" : "s"} from ${category}`);
  }

  function toggleCat(c: string) {
    setCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
  }

  return (
    <>
      <div className="drawer-head" id="drawer">
        <h2>Icon drawer</h2>
        <p>
          Every glyph in the Termina set. Search by name, slug, keyword, or category — then copy it,
          download it, or open it in the editor.
        </p>
      </div>

      <div className="filters">
        <div className="filters-inner">
          <div className="search">
            <Search />
            <input
              ref={searchRef}
              id="search"
              placeholder="Search glyphs"
              autoComplete="off"
              spellCheck={false}
              value={query}
              aria-label="Search glyphs"
              onChange={(e) => setQuery(e.target.value)}
            />
            <kbd className="slash">/</kbd>
          </div>
          <div className="chips">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                className="chip-btn"
                aria-pressed={cats.has(c)}
                onClick={() => toggleCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
          <div className="result-count" aria-live="polite">
            {results.length} of {icons.length} glyph{icons.length === 1 ? "" : "s"}
          </div>
        </div>
      </div>

      <div className="grid-wrap">
        <div className="icon-grid">
          {!icons.length ? (
            <div className="empty" style={{ gridColumn: "1/-1" }}>
              <h3>The drawer is empty</h3>
              <p>
                Nothing has been published yet. Draw a glyph on the 13×13 grid and submit it — it
                will show up here once it is reviewed.
              </p>
              <Link className="btn btn-primary" href="/editor" style={{ display: "inline-flex" }}>
                Open the editor
              </Link>
            </div>
          ) : !results.length ? (
            <div className="empty" style={{ gridColumn: "1/-1" }}>
              <h3>No matches</h3>
              <p>
                Nothing in the set matches those filters. Try a different keyword or clear the
                category chips.
              </p>
              <button
                className="btn"
                type="button"
                onClick={() => {
                  setQuery("");
                  setCats(new Set());
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            Array.from(groups).map(([category, items]) => (
              <ItemGroup
                key={category}
                category={category}
                items={items}
                copied={copied}
                onCopy={copySVG}
                onDownload={downloadSVG}
                onDownloadCategory={downloadCategory}
              />
            ))
          )}
        </div>
      </div>
    </>
  );
}

function ItemGroup({
  category,
  items,
  copied,
  onCopy,
  onDownload,
  onDownloadCategory,
}: {
  category: string;
  items: PublicIcon[];
  copied: string | null;
  onCopy: (i: PublicIcon) => void;
  onDownload: (i: PublicIcon) => void;
  onDownloadCategory: (c: string, items: PublicIcon[]) => void;
}) {
  return (
    <>
      <div className="section-label">
        {category} · {items.length}
        <button
          type="button"
          className="section-dl"
          onClick={() => onDownloadCategory(category, items)}
          title={`Download every glyph in ${category} as a zip`}
        >
          <DownArrowLong size={12} />
          Download
        </button>
      </div>
      {items.map((icon) => (
        <article className="card" key={icon.slug}>
          <div className="row-actions">
            <button
              className="icon-btn"
              type="button"
              title="Copy SVG"
              aria-label={`Copy ${icon.name} as SVG`}
              onClick={() => onCopy(icon)}
            >
              {copied === icon.slug ? <Check /> : <CopyIcon />}
            </button>
            <button
              className="icon-btn"
              type="button"
              title="Download SVG"
              aria-label={`Download ${icon.name} as SVG`}
              onClick={() => onDownload(icon)}
            >
              <DownloadIcon />
            </button>
          </div>
          <Link className="glyph" href={`/icons/${icon.slug}`} title={`Open ${icon.name}`}>
            <Glyph pixels={icon.pixels} size={52} title={icon.name} />
          </Link>
          <div>
            <div className="name">{icon.name}</div>
            <div className="slug">{icon.slug}</div>
          </div>
          <div className="foot">
            <span className="slug">v{icon.version}</span>
          </div>
        </article>
      ))}
    </>
  );
}
