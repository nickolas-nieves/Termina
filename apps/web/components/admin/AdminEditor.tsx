"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CELLS,
  STATUSES,
  glyphFile,
  groupByCategory,
  slugify,
  uid,
  type Status,
} from "@termina/glyph";
import type { Entry } from "@/lib/working";
import { Studio } from "../editor/Studio";
import { CoreFields } from "../editor/Fields";
import { useGlyphEditor } from "../editor/useGlyphEditor";
import { EMPTY_FORM, useGlyphForm } from "../editor/useGlyphForm";
import { Check, Copy, Download } from "termina-icons/react";
import { useToast } from "../Toast";
import { copyText, downloadText, relTime } from "@/lib/browser";

/**
 * The admin editor.
 *
 * Same board and same fields as the public one, plus the two decisions only an
 * admin gets to make: what state a glyph is in, and what version it is. A
 * glyph saved here goes into the working set, not the repository — publishing
 * is a separate, deliberate act from the set page.
 */
export function AdminEditor({
  entries: initialEntries,
}: {
  entries: Entry[];
}) {
  const toast = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const openId = params.get("id");

  const [entries, setEntries] = useState(initialEntries);
  const editor = useGlyphEditor();
  const { form, set, setName, setSlug, relinkSlug, reset, tagList } = useGlyphForm();
  const [guides, setGuides] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [source, setSource] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(groupByCategory(entries).keys()).filter((c) => c !== "Unfiled"),
    [entries]
  );

  useEffect(() => {
    if (!openId) return;
    const entry = entries.find((e) => e.id === openId);
    if (!entry) {
      toast("That glyph is no longer in the set");
      return;
    }
    load(entry);
    // Loading is driven by the URL, not by every entry refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  function load(entry: Entry) {
    setSource(entry);
    // A published glyph has a synthetic id; editing one stages a real working
    // entry, so it needs an id of its own the moment it is saved.
    setEditingId(entry.state === "published" || entry.state === "removing" ? null : entry.id);
    editor.setPixels(entry.pixels, { resetHistory: true });
    reset({
      name: entry.name,
      slug: entry.slug,
      category: entry.category ?? "",
      tags: (entry.tags ?? []).join(", "),
      status: entry.status,
      version: entry.version,
      credit: entry.credit ?? "",
    });
    setSlugError(null);
  }

  async function refresh() {
    const res = await fetch("/api/admin/working");
    if (!res.ok) return;
    const body = (await res.json()) as { entries: Entry[] };
    setEntries(body.entries);
  }

  async function save(asNew: boolean) {
    if (editor.isBlank) return toast("Nothing drawn yet");
    if (!form.name.trim()) {
      toast("Give the glyph a name first");
      document.getElementById("f-name")?.focus();
      return;
    }

    const slug = slugify(form.slug || form.name) || "untitled";

    if (asNew && source && slug === source.slug) {
      toast(`Change the slug first — “${source.slug}” is the glyph you started from`);
      document.getElementById("f-slug")?.focus();
      return;
    }

    setSaving(true);
    setSlugError(null);
    try {
      const id = asNew || !editingId ? uid() : editingId;
      const res = await fetch("/api/admin/working", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id,
          name: form.name,
          slug,
          category: form.category,
          tags: form.tags,
          status: form.status,
          version: asNew ? 1 : form.version,
          pixels: editor.pixels,
          credit: form.credit.trim() || null,
          createdAt: source && !asNew ? source.createdAt : undefined,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        if (res.status === 409) setSlugError(body.error ?? "That slug is taken.");
        else toast(body.error ?? "Could not save that glyph");
        return;
      }
      setEditingId(id);
      toast(
        source && !asNew && source.state !== "new"
          ? `Staged an edit to ${slug} — publish to apply it`
          : `Saved ${slug} to the working set`
      );
      await refresh();
      router.refresh();
    } catch {
      toast("Could not reach the server");
    } finally {
      setSaving(false);
    }
  }

  function startBlank() {
    editor.setPixels("0".repeat(CELLS), { resetHistory: true });
    reset(EMPTY_FORM);
    setEditingId(null);
    setSource(null);
    setSlugError(null);
    document.getElementById("f-name")?.focus();
  }

  const effectiveSlug = slugify(form.slug || form.name) || "untitled";
  const file = () =>
    glyphFile({ slug: effectiveSlug, pixels: editor.pixels, version: form.version });

  return (
    <Studio
      editor={editor}
      guides={guides}
      onToggleGuides={() => setGuides((g) => !g)}
      onClear={() => {
        if (editor.clear()) toast("Grid cleared");
      }}
      onSave={() => save(false)}
      sidebar={
        <>
          <div className="side-head">
            <div className="eyebrow">
              {source
                ? source.state === "published" || source.state === "removing"
                  ? `Editing published ${source.slug}`
                  : "Editing draft"
                : "New glyph"}
            </div>
            <h2>{form.name.trim() || "Untitled"}</h2>
          </div>

          <div className="side-body">
            {source && (source.state === "published" || source.state === "removing") ? (
              <div className="notice notice-info" style={{ marginBottom: 18 }}>
                <span>
                  This one is live. Saving stages an unpublished edit — the site keeps showing the
                  published version until you publish.
                </span>
              </div>
            ) : null}

            <CoreFields
              form={form}
              tagList={tagList}
              categories={categories}
              onName={setName}
              onSlug={setSlug}
              onRelink={relinkSlug}
              set={set}
              slugError={slugError}
            />

            <div className="field">
              <div className="label">Status</div>
              <div className="seg">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={form.status === s}
                    onClick={() => set("status", s as Status)}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
              {form.status !== "final" ? (
                <p className="field-error" style={{ color: "var(--faint)" }}>
                  Only glyphs marked Final are published.
                </p>
              ) : null}
            </div>

            <div className="field">
              <div className="label">Version</div>
              <div className="stepper">
                <button type="button" aria-label="Decrease version" onClick={() => set("version", Math.max(1, form.version - 1))}>
                  −
                </button>
                <input
                  value={form.version}
                  inputMode="numeric"
                  aria-label="Version"
                  onChange={(e) => set("version", Math.max(1, parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 1))}
                />
                <button type="button" aria-label="Increase version" onClick={() => set("version", form.version + 1)}>
                  +
                </button>
              </div>
            </div>

            <div className="field">
              <div className="label">
                <label htmlFor="f-credit">Credit</label>
                <span className="hint">optional</span>
              </div>
              <input
                className="input"
                id="f-credit"
                placeholder="Contributor name"
                maxLength={40}
                value={form.credit}
                onChange={(e) => set("credit", e.target.value)}
              />
            </div>

            <dl className="meta-list">
              <div className="meta-row">
                <dt>Identifier</dt>
                <dd>{editingId ?? "unsaved"}</dd>
              </div>
              <div className="meta-row">
                <dt>Updated</dt>
                <dd>{source?.updatedAt ? relTime(source.updatedAt) : "—"}</dd>
              </div>
              <div className="meta-row">
                <dt>Filename</dt>
                <dd>{effectiveSlug}.svg</dd>
              </div>
            </dl>
          </div>

          <div className="side-foot">
            <button className="btn btn-primary btn-block" type="button" disabled={saving} onClick={() => save(false)}>
              {saving ? "Saving…" : source && source.state !== "new" ? "Stage this change" : "Save to working set"}
            </button>
            <button className="btn btn-block" type="button" disabled={saving || !source} onClick={() => save(true)}>
              Save as new glyph
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-block"
                type="button"
                onClick={() => {
                  if (editor.isBlank) return toast("Nothing drawn yet");
                  downloadText(`${effectiveSlug}.svg`, file(), "image/svg+xml");
                }}
              >
                <Download size={13}/>
                SVG
              </button>
              <button
                className="btn btn-block"
                type="button"
                onClick={async () => {
                  if (editor.isBlank) return toast("Nothing drawn yet");
                  const ok = await copyText(file());
                  if (!ok) return toast("Clipboard blocked — use the download instead");
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1100);
                  toast("SVG copied to clipboard");
                }}
              >
                {copied ? <Check size={13}/> : <Copy size={13} />}
                Copy
              </button>
            </div>
            <button className="btn btn-ghost btn-block" type="button" onClick={startBlank}>
              Start blank
            </button>
          </div>
        </>
      }
    />
  );
}
