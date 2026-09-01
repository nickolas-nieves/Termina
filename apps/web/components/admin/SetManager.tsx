"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { glyphFile, groupByCategory, matchesQuery } from "@termina/glyph";
import type { Entry } from "@/lib/working";
import { Glyph } from "../Glyph";
import { Check, CopyIcon, DownloadIcon, Search, Trash } from "../Icons";
import { useToast } from "../Toast";
import { PublishDialog } from "./PublishDialog";
import { copyText, downloadText } from "@/lib/browser";

const STATE_LABEL: Record<Entry["state"], string> = {
  published: "live",
  edited: "edited",
  new: "new",
  removing: "removing",
};

const STATE_PILL: Record<Entry["state"], string> = {
  published: "pill-final",
  edited: "pill-review",
  new: "pill-draft",
  removing: "pill-rejected",
};

/**
 * The whole set in one place: what is live, what has been changed but not
 * published, and what is staged for removal.
 */
export function SetManager({ entries: initial }: { entries: Entry[] }) {
  const toast = useToast();
  const [entries, setEntries] = useState(initial);
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<"all" | "pending">("all");
  const [publishOpen, setPublishOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const pending = entries.filter((e) => e.state !== "published");

  const results = useMemo(
    () =>
      entries.filter(
        (e) => (only === "all" || e.state !== "published") && matchesQuery(e, query)
      ),
    [entries, only, query]
  );

  const groups = useMemo(() => groupByCategory(results), [results]);

  async function refresh() {
    const res = await fetch("/api/admin/working");
    if (!res.ok) return;
    const body = (await res.json()) as { entries: Entry[] };
    setEntries(body.entries);
  }

  async function toggleRemoval(entry: Entry) {
    setBusy(entry.id);
    try {
      const res = await fetch("/api/admin/removals", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: entry.slug, remove: entry.state !== "removing" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return toast(body.error ?? "Could not stage that removal");
      }
      toast(
        entry.state === "removing"
          ? `${entry.slug} will stay published`
          : `${entry.slug} staged for removal — publish to apply it`
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function discardDraft(entry: Entry) {
    setBusy(entry.id);
    try {
      const res = await fetch(`/api/admin/working?id=${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        return toast(body.error ?? "Could not discard that draft");
      }
      toast(
        entry.state === "edited"
          ? `Discarded the unpublished edit to ${entry.slug}`
          : `Discarded ${entry.slug}`
      );
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function copySVG(entry: Entry) {
    const ok = await copyText(glyphFile(entry));
    if (!ok) return toast("Clipboard blocked — use Download instead");
    setCopied(entry.id);
    setTimeout(() => setCopied((c) => (c === entry.id ? null : c)), 1100);
    toast(`Copied ${entry.slug}.svg`);
  }

  let n = 0;

  return (
    <div className="admin-shell">
      <div className="admin-head">
        <div>
          <h1>The set</h1>
          <p>
            Everything published, plus anything drawn or accepted since the last publish. Changes
            live here until you publish them — the public site only ever shows what is committed to
            the repository.
          </p>
        </div>
        <div className="admin-actions">
          <Link className="btn" href="/admin/editor">
            New glyph
          </Link>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => setPublishOpen(true)}
            disabled={!pending.length}
          >
            Publish{pending.length ? ` ${pending.length}` : ""}
          </button>
        </div>
      </div>

      <dl className="stat-row">
        <div className="stat">
          <dt>Published</dt>
          <dd>{entries.filter((e) => e.state !== "new").length}</dd>
        </div>
        <div className="stat">
          <dt>Unpublished</dt>
          <dd>{pending.length}</dd>
        </div>
        <div className="stat">
          <dt>Categories</dt>
          <dd>{new Set(entries.map((e) => e.category || "Unfiled")).size}</dd>
        </div>
      </dl>

      <div className="filters-inner" style={{ padding: "0 0 20px" }}>
        <div className="search">
          <Search />
          <input
            placeholder="Search the set"
            autoComplete="off"
            spellCheck={false}
            aria-label="Search the set"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="chips">
          <button
            type="button"
            className="chip-btn"
            aria-pressed={only === "pending"}
            onClick={() => setOnly((v) => (v === "pending" ? "all" : "pending"))}
          >
            Unpublished only
          </button>
        </div>
        <div className="result-count">
          {results.length} of {entries.length}
        </div>
      </div>

      <div className="icon-grid">
        {!results.length ? (
          <div className="empty" style={{ gridColumn: "1/-1" }}>
            <h3>{entries.length ? "No matches" : "Nothing here yet"}</h3>
            <p>
              {entries.length
                ? "Nothing matches that filter."
                : "Draw the first glyph, or accept one from the submission queue."}
            </p>
            <Link className="btn btn-primary" href="/admin/editor" style={{ display: "inline-flex" }}>
              Open the editor
            </Link>
          </div>
        ) : (
          Array.from(groups).map(([category, items]) => (
            <div key={category} style={{ display: "contents" }}>
              <div className="section-label">
                {category} · {items.length}
              </div>
              {items.map((entry) => (
                <article
                  className={`card${busy === entry.id ? " is-busy" : ""}`}
                  key={entry.id}
                  style={{ ["--i" as string]: String(n++) }}
                >
                  <div className="row-actions">
                    <button
                      className="icon-btn"
                      type="button"
                      title="Copy SVG"
                      aria-label={`Copy ${entry.name} as SVG`}
                      onClick={() => copySVG(entry)}
                    >
                      {copied === entry.id ? <Check /> : <CopyIcon />}
                    </button>
                    <button
                      className="icon-btn"
                      type="button"
                      title="Download SVG"
                      aria-label={`Download ${entry.name} as SVG`}
                      onClick={() =>
                        downloadText(`${entry.slug}.svg`, glyphFile(entry), "image/svg+xml")
                      }
                    >
                      <DownloadIcon />
                    </button>
                    {entry.state === "new" || entry.state === "edited" ? (
                      <button
                        className="icon-btn danger"
                        type="button"
                        title={entry.state === "edited" ? "Discard this edit" : "Discard this draft"}
                        aria-label={`Discard changes to ${entry.name}`}
                        onClick={() => discardDraft(entry)}
                      >
                        <Trash />
                      </button>
                    ) : (
                      <button
                        className="icon-btn danger"
                        type="button"
                        title={
                          entry.state === "removing"
                            ? "Keep this glyph published"
                            : "Stage this glyph for removal"
                        }
                        aria-label={`Stage ${entry.name} for removal`}
                        onClick={() => toggleRemoval(entry)}
                      >
                        <Trash />
                      </button>
                    )}
                  </div>

                  <Link
                    className="glyph"
                    href={`/admin/editor?id=${encodeURIComponent(entry.id)}`}
                    title={`Edit ${entry.name}`}
                  >
                    <Glyph pixels={entry.pixels} size={52} title={entry.name} />
                  </Link>

                  <div>
                    <div className="name">{entry.name}</div>
                    <div className="slug">{entry.slug}</div>
                  </div>

                  <div className="foot">
                    <span className={`pill ${STATE_PILL[entry.state]}`}>
                      {STATE_LABEL[entry.state]}
                    </span>
                    {entry.state !== "published" && entry.state !== "removing" ? (
                      <span className={`pill pill-${entry.status}`}>{entry.status}</span>
                    ) : null}
                    <span className="slug">v{entry.version}</span>
                  </div>
                </article>
              ))}
            </div>
          ))
        )}
      </div>

      <PublishDialog
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        onPublished={refresh}
      />
    </div>
  );
}
