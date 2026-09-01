"use client";

import Link from "next/link";
import { useState } from "react";
import { componentName, glyphFile, type PublicIcon } from "@termina/glyph";
import { Glyph } from "./Glyph";
import { Check, CopyIcon, DownloadIcon } from "./Icons";
import { useToast } from "./Toast";
import { copyText, downloadText } from "@/lib/browser";

/**
 * One glyph, at every size it is meant to be used at, with the four ways of
 * getting it into a project: the file, the npm component, the sprite
 * reference, and the raw bitmap.
 */
export function IconDetail({ icon }: { icon: PublicIcon }) {
  const toast = useToast();
  const [copied, setCopied] = useState<string | null>(null);

  const file = glyphFile(icon);
  const comp = componentName(icon.slug);

  const snippets: Array<{ id: string; title: string; code: string }> = [
    { id: "svg", title: "SVG", code: file.trim() },
    {
      id: "react",
      title: "React — termina-icons",
      code: `import { ${comp} } from "termina-icons";\n\n<${comp} size={24} />`,
    },
    {
      id: "sprite",
      title: "Sprite reference — no build step",
      code: `<svg width="26" height="26" fill="currentColor">\n  <use href="/api/sprite.svg#termina-${icon.slug}" />\n</svg>`,
    },
    { id: "bits", title: "Bitmap — 169 characters", code: icon.pixels },
  ];

  async function copy(id: string, text: string, label: string) {
    const ok = await copyText(text);
    if (!ok) return toast("Clipboard blocked — use the download instead");
    setCopied(id);
    setTimeout(() => setCopied((c) => (c === id ? null : c)), 1100);
    toast(label);
  }

  return (
    <div className="detail">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Drawer</Link>
        <span aria-hidden="true">/</span>
        {icon.category ? (
          <>
            <span>{icon.category}</span>
            <span aria-hidden="true">/</span>
          </>
        ) : null}
        <span>{icon.slug}</span>
      </nav>

      <div className="detail-top">
        <div>
          <div className="detail-tile">
            <Glyph pixels={icon.pixels} size={156} title={icon.name} />
          </div>
          <div className="detail-scale previews" style={{ marginTop: 14 }}>
            <div className="pv">
              <div className="frame"><Glyph pixels={icon.pixels} size={13} /></div>
              <div className="chip">13 px</div>
            </div>
            <div className="pv">
              <div className="frame"><Glyph pixels={icon.pixels} size={26} /></div>
              <div className="chip">26 px</div>
            </div>
            <div className="pv">
              <div className="frame"><Glyph pixels={icon.pixels} size={39} /></div>
              <div className="chip">39 px</div>
            </div>
            <div className="pv-divider" />
            <div className="pv inverse">
              <div className="frame"><Glyph pixels={icon.pixels} size={26} /></div>
              <div className="chip">inverse</div>
            </div>
          </div>
        </div>

        <div className="detail-body">
          <h1>{icon.name}</h1>
          <p className="detail-slug">{icon.slug}</p>

          <div className="detail-facts">
            {icon.category ? <span className="fm-cat">{icon.category}</span> : null}
            <span className="slug">v{icon.version}</span>
            {icon.tags.map((t) => (
              <span className="tag" key={t}>{t}</span>
            ))}
          </div>

          {icon.credit ? (
            <p className="detail-slug" style={{ marginTop: 14 }}>
              Contributed by {icon.credit}
            </p>
          ) : null}

          <div className="detail-actions">
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => copy("file", file, `Copied ${icon.slug}.svg`)}
            >
              {copied === "file" ? <Check /> : <CopyIcon />}
              Copy SVG
            </button>
            <button
              className="btn"
              type="button"
              onClick={() => downloadText(`${icon.slug}.svg`, file, "image/svg+xml")}
            >
              <DownloadIcon />
              Download SVG
            </button>
            <Link className="btn" href={`/editor?edit=${encodeURIComponent(icon.slug)}`}>
              Open in editor
            </Link>
          </div>

          <p className="detail-slug" style={{ marginTop: 20, maxWidth: "52ch", lineHeight: 1.6 }}>
            Spotted something off? Open it in the editor, fix the pixels, and submit the change for
            review — no account needed.
          </p>
        </div>
      </div>

      <div className="snippets">
        {snippets.map((s) => (
          <section className="snippet" key={s.id}>
            <div className="snippet-head">
              <h2>{s.title}</h2>
              <button
                className="snippet-copy"
                type="button"
                onClick={() => copy(s.id, s.code, `Copied the ${s.title.split(" —")[0]} snippet`)}
              >
                {copied === s.id ? <Check size={12} /> : <CopyIcon size={12} />}
                Copy
              </button>
            </div>
            <pre>
              <code>{s.code}</code>
            </pre>
          </section>
        ))}
      </div>
    </div>
  );
}
