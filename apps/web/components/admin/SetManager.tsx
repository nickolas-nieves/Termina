"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  STATUSES,
  glyphFile,
  groupByCategory,
  matchesQuery,
  publicIcon,
  type Status,
} from "@termina/glyph";
import type { Entry } from "@/lib/working";
import { Glyph } from "../Glyph";
import { Check, Copy, Download, Search, Trash } from "termina-icons/react";
import { useToast } from "../Toast";
import { PublishDialog } from "./PublishDialog";
import { copyText, download, downloadText } from "@/lib/browser";
import { setZip } from "@/lib/exports";

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

/** Published entries are synthetic — they have no working record to act on. */
const isWorking = (e: Entry) => e.state === "new" || e.state === "edited";

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
  const [publishScope, setPublishScope] = useState<string[] | undefined>(undefined);
  const [copied, setCopied] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const lastClicked = useRef<number | null>(null);

  const pending = entries.filter((e) => e.state !== "published");

  const results = useMemo(
    () => entries.filter((e) => (only === "all" || e.state !== "published") && matchesQuery(e, query)),
    [entries, only, query]
  );

  const groups = useMemo(() => groupByCategory(results), [results]);

  /* Flat render order, so shift-click can select a visual range across groups. */
  const ordered = useMemo(() => Array.from(groups).flatMap(([, items]) => items), [groups]);

  const selectable = useMemo(() => ordered.filter(isWorking), [ordered]);
  const selectedCount = selected.size;
  const allSelectableSelected =
    selectable.length > 0 && selectable.every((e) => selected.has(e.id));

  async function refresh() {
    const res = await fetch("/api/admin/working");
    if (!res.ok) return;
    const body = (await res.json()) as { entries: Entry[] };
    setEntries(body.entries);
    // Drop anything that no longer exists, so a stale id can't linger in the
    // selection and be sent to the server on the next bulk action.
    const live = new Set(body.entries.map((e) => e.id));
    setSelected((prev) => new Set([...prev].filter((id) => live.has(id))));
  }

  const toggleSelect = useCallback(
    (entry: Entry, index: number, shiftKey: boolean) => {
      // Read and move the anchor here, not inside the updater below. State
      // updaters must be pure — React runs them more than once — so a ref
      // written inside one is not dependably set by the next click.
      const anchor = lastClicked.current;
      lastClicked.current = index;

      setSelected((prev) => {
        const next = new Set(prev);
        const turningOn = !next.has(entry.id);

        // Shift-click extends from the previous click across the rendered
        // order — selecting a long run at once is the point of this UI.
        if (shiftKey && anchor !== null) {
          const from = Math.min(anchor, index);
          const to = Math.max(anchor, index);
          for (let i = from; i <= to; i++) {
            const e = ordered[i];
            if (!e || !isWorking(e)) continue;
            if (turningOn) next.add(e.id);
            else next.delete(e.id);
          }
        } else if (turningOn) {
          next.add(entry.id);
        } else {
          next.delete(entry.id);
        }

        return next;
      });
    },
    [ordered]
  );

  function selectAllVisible() {
    setSelected(new Set(selectable.map((e) => e.id)));
    lastClicked.current = null;
  }

  function clearSelection() {
    setSelected(new Set());
    lastClicked.current = null;
  }

  async function bulkStatus(status: Status) {
    if (!selectedCount) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/admin/working/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: [...selected], status }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        updated?: number;
        skipped?: number;
      };
      if (!res.ok) return toast(body.error ?? "Could not update those glyphs");

      const updated = body.updated ?? 0;
      const skipped = body.skipped ?? 0;
      toast(
        `Marked ${updated} glyph${updated === 1 ? "" : "s"} ${status}` +
          (skipped ? ` · ${skipped} already published, unchanged` : "")
      );
      await refresh();
      clearSelection();
    } catch {
      toast("Could not reach the server");
    } finally {
      setBulkBusy(false);
    }
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

  function downloadCategory(category: string, items: Entry[]) {
    const folder =
      category.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unfiled";
    download(`termina-${folder}.zip`, setZip(items.map(publicIcon), `termina-${folder}`));
    toast(`Downloaded ${items.length} glyph${items.length === 1 ? "" : "s"}`);
  }

  let flat = -1;

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
            onClick={() => {
              setPublishScope(undefined);
              setPublishOpen(true);
            }}
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
          <dt>Final</dt>
          <dd>{pending.filter((e) => e.status === "final").length}</dd>
        </div>
        <div className="stat">
          <dt>Categories</dt>
          <dd>{new Set(entries.map((e) => e.category || "Unfiled")).size}</dd>
        </div>
      </dl>

      <div className="filters-inner" style={{ padding: "0 0 20px" }}>
        <div className="search">
          <Search size={13}/>
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

      {selectable.length ? (
        <div className="select-bar" style={{ padding: "0 0 18px" }}>
          <button
            type="button"
            className="link-btn"
            onClick={allSelectableSelected ? clearSelection : selectAllVisible}
          >
            {allSelectableSelected
              ? "Clear selection"
              : `Select all ${selectable.length} unpublished shown`}
          </button>
          {selectedCount ? (
            <span className="bulk-hint">Shift-click a second glyph to select the range between.</span>
          ) : null}
        </div>
      ) : null}

      <div className={`icon-grid${selectedCount ? " is-selecting" : ""}`}>
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
                <button
                  type="button"
                  className="section-dl"
                  onClick={() => downloadCategory(category, items)}
                  title={`Download every glyph in ${category} as a zip`}
                >
                  <Download size={13} />
                  Download
                </button>
              </div>
              {items.map((entry) => {
                flat += 1;
                const index = flat;
                const checked = selected.has(entry.id);
                return (
                  <article
                    className={`card${busy === entry.id ? " is-busy" : ""}${checked ? " is-selected" : ""}`}
                    key={entry.id}
                  >
                    {isWorking(entry) ? (
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={checked}
                        aria-label={`Select ${entry.name}`}
                        className={`card-select${checked ? " is-on" : ""}`}
                        title="Select for a bulk action — shift-click for a range"
                        onClick={(e) => toggleSelect(entry, index, e.shiftKey)}
                      >
                        {checked ? <Check size={11} /> : null}
                      </button>
                    ) : null}

                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        type="button"
                        title="Copy SVG"
                        aria-label={`Copy ${entry.name} as SVG`}
                        onClick={() => copySVG(entry)}
                      >
                        {copied === entry.id ? <Check size={13}/> : <Copy size={13} />}
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
                        <Download size={13} />
                      </button>
                      {isWorking(entry) ? (
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
                      {isWorking(entry) ? (
                        <span className={`pill pill-${entry.status}`}>{entry.status}</span>
                      ) : null}
                      <span className="slug">v{entry.version}</span>
                    </div>
                  </article>
                );
              })}
            </div>
          ))
        )}
      </div>

      {selectedCount ? (
        <div className="bulk-bar" role="region" aria-label="Bulk actions">
          <span className="bulk-count">
            {selectedCount} selected
          </span>
          <div className="bulk-sep" />
          {STATUSES.map((s) => (
            <button
              key={s}
              className="btn"
              type="button"
              disabled={bulkBusy}
              onClick={() => bulkStatus(s)}
            >
              {bulkBusy ? "Working…" : `Mark ${s}`}
            </button>
          ))}
          <div className="bulk-sep" />
          <button
            className="btn btn-primary"
            type="button"
            disabled={bulkBusy}
            onClick={() => {
              setPublishScope([...selected]);
              setPublishOpen(true);
            }}
          >
            Publish {selectedCount}
          </button>
          <div className="bulk-sep" />
          <button className="btn btn-ghost" type="button" onClick={clearSelection} disabled={bulkBusy}>
            Clear
          </button>
        </div>
      ) : null}

      <PublishDialog
        open={publishOpen}
        ids={publishScope}
        onClose={() => setPublishOpen(false)}
        onPublished={() => {
          // A scoped publish leaves the rest of the selection alone; the ones
          // that went out are gone from the working set, and `refresh` drops
          // them from the selection.
          void refresh();
        }}
      />
    </div>
  );
}
