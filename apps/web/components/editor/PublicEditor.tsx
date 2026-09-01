"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CELLS, glyphFile, groupByCategory, slugify, type PublicIcon } from "@termina/glyph";
import { Studio } from "./Studio";
import { CoreFields } from "./Fields";
import { SubmitDialog } from "./SubmitDialog";
import { clearDraft, readDraft, useDraft, useGlyphEditor } from "./useGlyphEditor";
import { EMPTY_FORM, useGlyphForm, type GlyphForm } from "./useGlyphForm";
import { Check, CopyIcon, DownloadIcon, Send } from "../Icons";
import { useToast } from "../Toast";
import { copyText, downloadText } from "@/lib/browser";

const DRAFT_KEY = "termina.draft.v2";

interface Draft {
  pixels: string;
  form: GlyphForm;
  editingSlug: string | null;
}

/**
 * The public editor.
 *
 * Everything here works with no account and no network: draw, download, copy.
 * Submitting is the one thing that talks to the server, and it is an explicit
 * separate step — nothing is sent anywhere just because you drew it.
 */
export function PublicEditor({ icons }: { icons: PublicIcon[] }) {
  const toast = useToast();
  const params = useSearchParams();
  const editSlug = params.get("edit");

  const editor = useGlyphEditor();
  const { form, set, setName, setSlug, relinkSlug, reset, tagList } = useGlyphForm();
  const [guides, setGuides] = useState(true);
  const [editing, setEditing] = useState<PublicIcon | null>(null);
  const [ticket, setTicket] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const categories = useMemo(
    () => Array.from(groupByCategory(icons).keys()).filter((c) => c !== "Unfiled"),
    [icons]
  );

  /* Restore the draft, or load the glyph named in ?edit=. The URL wins: a link
     from a glyph's page is an explicit request to work on that glyph. */
  useEffect(() => {
    const target = editSlug ? icons.find((i) => i.slug === editSlug) : undefined;
    if (target) {
      setEditing(target);
      editor.setPixels(target.pixels, { resetHistory: true });
      reset({
        name: target.name,
        slug: target.slug,
        category: target.category ?? "",
        tags: (target.tags ?? []).join(", "),
        status: "draft",
        version: target.version ?? 1,
        credit: "",
      });
      setHydrated(true);
      return;
    }
    const draft = readDraft<Draft>(DRAFT_KEY);
    if (draft?.pixels) {
      editor.setPixels(draft.pixels, { resetHistory: true });
      if (draft.form) reset({ ...EMPTY_FORM, ...draft.form });
      if (draft.editingSlug) {
        setEditing(icons.find((i) => i.slug === draft.editingSlug) ?? null);
      }
    }
    setHydrated(true);
    // Deliberately once, on mount: this is restore, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSlug]);

  /* A ticket is fetched up front so the anti-abuse time window is measured
     from when the editor opened, not from when the dialog did. */
  useEffect(() => {
    let cancelled = false;
    fetch("/api/submissions", { headers: { accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : null))
      .then((body: { ticket?: string } | null) => {
        if (!cancelled && body?.ticket) setTicket(body.ticket);
      })
      .catch(() => {
        /* submissions will report the problem when tried */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useDraft<Draft>(
    DRAFT_KEY,
    { pixels: editor.pixels, form, editingSlug: editing?.slug ?? null },
    hydrated
  );

  const effectiveSlug = slugify(form.slug || form.name) || "untitled";
  const file = () =>
    glyphFile({ slug: effectiveSlug, pixels: editor.pixels, version: form.version });

  function guard(): boolean {
    if (editor.isBlank) {
      toast("Nothing drawn yet");
      return false;
    }
    return true;
  }

  function downloadSVG() {
    if (!guard()) return;
    downloadText(`${effectiveSlug}.svg`, file(), "image/svg+xml");
    toast(`Downloaded ${effectiveSlug}.svg`);
  }

  async function copySVG() {
    if (!guard()) return;
    const ok = await copyText(file());
    if (!ok) return toast("Clipboard blocked — use the download instead");
    setCopied(true);
    setTimeout(() => setCopied(false), 1100);
    toast("SVG copied to clipboard");
  }

  function openSubmit() {
    if (!guard()) return;
    if (!form.name.trim()) {
      toast("Give the glyph a name first");
      document.getElementById("f-name")?.focus();
      return;
    }
    setSubmitOpen(true);
  }

  function startBlank() {
    editor.setPixels("0".repeat(CELLS), { resetHistory: true });
    reset(EMPTY_FORM);
    setEditing(null);
    clearDraft(DRAFT_KEY);
    document.getElementById("f-name")?.focus();
  }

  return (
    <main>
      <Studio
        editor={editor}
        guides={guides}
        onToggleGuides={() => setGuides((g) => !g)}
        onClear={() => {
          if (editor.clear()) toast("Grid cleared");
        }}
        onSave={openSubmit}
        sidebar={
          <>
            <div className="side-head">
              <div className="eyebrow">{editing ? `Editing ${editing.slug}` : "New glyph"}</div>
              <h2>{form.name.trim() || "Untitled"}</h2>
            </div>

            <div className="side-body">
              {editing ? (
                <div className="notice notice-info" style={{ marginBottom: 18 }}>
                  <span>
                    You’re working from the published <strong>{editing.name}</strong>.
                    Submitting sends this as a proposed change — the live glyph is untouched
                    until it’s reviewed.
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
              />

              <dl className="meta-list">
                <div className="meta-row">
                  <dt>Filename</dt>
                  <dd>{effectiveSlug}.svg</dd>
                </div>
                <div className="meta-row">
                  <dt>Saved</dt>
                  <dd>this device only</dd>
                </div>
              </dl>
            </div>

            <div className="side-foot">
              <button className="btn btn-primary btn-block" type="button" onClick={openSubmit}>
                <Send />
                {editing ? "Submit this change" : "Submit for review"}
              </button>
              <button className="btn btn-block" type="button" onClick={downloadSVG}>
                <DownloadIcon />
                Download SVG
              </button>
              <button className="btn btn-block" type="button" onClick={copySVG}>
                {copied ? <Check /> : <CopyIcon />}
                Copy SVG
              </button>
              <button className="btn btn-ghost btn-block" type="button" onClick={startBlank}>
                Start blank
              </button>
            </div>
          </>
        }
      />

      <SubmitDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        pixels={editor.pixels}
        form={form}
        ticket={ticket}
        editing={editing}
        onSubmitted={() => {
          // A used ticket cannot be reused, so fetch the next one now rather
          // than failing on the following submission.
          fetch("/api/submissions")
            .then((r) => (r.ok ? r.json() : null))
            .then((b: { ticket?: string } | null) => setTicket(b?.ticket ?? null))
            .catch(() => setTicket(null));
        }}
      />
    </main>
  );
}
