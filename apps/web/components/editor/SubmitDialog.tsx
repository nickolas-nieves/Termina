"use client";

import { useState } from "react";
import { MAX_CREDIT, MAX_NOTE, type PublicIcon } from "@termina/glyph";
import { Dialog } from "../Dialog";
import { Glyph } from "../Glyph";
import { ArrowRight } from "termina-icons/react";
import { useToast } from "../Toast";
import type { GlyphForm } from "./useGlyphForm";

/**
 * The submission dialog.
 *
 * Everything it asks for is optional except the licence confirmation, because
 * the whole point of the flow is that contributing does not require an
 * account, an email address, or anything else identifying.
 */
export function SubmitDialog({
  open,
  onClose,
  pixels,
  form,
  ticket,
  editing,
  onSubmitted,
}: {
  open: boolean;
  onClose: () => void;
  pixels: string;
  form: GlyphForm;
  ticket: string | null;
  editing: PublicIcon | null;
  onSubmitted: () => void;
}) {
  const toast = useToast();
  const [credit, setCredit] = useState("");
  const [note, setNote] = useState("");
  const [license, setLicense] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    if (!license) {
      setError("You need to confirm the glyph is yours and MIT-licensed.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          ticket,
          website,
          kind: editing ? "edit" : "new",
          targetSlug: editing?.slug ?? null,
          name: form.name,
          slug: form.slug,
          category: form.category,
          tags: form.tags,
          pixels,
          credit,
          note,
          license,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "That submission was not accepted.");
        return;
      }
      setDone(true);
      toast("Submitted for review — thank you");
      onSubmitted();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  function close() {
    setDone(false);
    setError(null);
    onClose();
  }

  if (done) {
    return (
      <Dialog open={open} onClose={close} labelledBy="submit-done-title">
        <h3 id="submit-done-title">Submitted for review</h3>
        <p>
          Thanks — “{form.name}” is in the review queue. If it makes it into the set it will appear
          in the drawer, and the SVG stays yours to use in the meantime.
        </p>
        <div className="dialog-note">
          There is no account to check back on, so nothing will notify you. Keep the copy you
          downloaded if you need it before then.
        </div>
        <div className="dialog-actions">
          <button className="btn btn-primary" type="button" onClick={close}>
            Done
          </button>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={close} labelledBy="submit-title">
      <h3 id="submit-title">{editing ? `Suggest a change to ${editing.slug}` : "Submit this icon"}</h3>
      <p>
        {editing
          ? "Your version goes into the review queue alongside the published one. Nothing on the site changes until it's accepted."
          : "It goes into a review queue. Nothing is published until it's reviewed, and you don't need an account either way."}
      </p>

      <div className="sub-visual" style={{ marginBottom: 20 }}>
        {editing ? (
          <>
            <span className="sub-tile was" title="Currently published">
              <Glyph pixels={editing.pixels} size={34} />
            </span>
            <ArrowRight className="sub-arrow" size={13}/>
          </>
        ) : null}
        <span className="sub-tile" title="Your version">
          <Glyph pixels={pixels} size={34} />
        </span>
        <div className="sub-body">
          <div className="sub-title">
            <span className="name">{form.name || "Untitled"}</span>
            <code>{form.slug || "untitled"}</code>
          </div>
          {form.category ? <div className="sub-meta">{form.category}</div> : null}
        </div>
      </div>

      <div className="field">
        <div className="label">
          <label htmlFor="s-credit">Credit</label>
          <span className="hint">optional</span>
        </div>
        <input
          className="input"
          id="s-credit"
          placeholder="A name to credit you by"
          autoComplete="off"
          maxLength={MAX_CREDIT}
          value={credit}
          onChange={(e) => setCredit(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="label">
          <label htmlFor="s-note">Note for the reviewer</label>
          <span className="hint">optional</span>
        </div>
        <textarea
          className="input"
          id="s-note"
          placeholder="What it's for, or what you changed"
          maxLength={MAX_NOTE}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>

      {/* Honeypot — off-screen and out of the tab order, so only a script fills it. */}
      <div className="hp" aria-hidden="true">
        <label htmlFor="s-website">Website</label>
        <input
          id="s-website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <label className="check">
        <input type="checkbox" checked={license} onChange={(e) => setLicense(e.target.checked)} />
        <span>
          This glyph is my own work, and I’m contributing it under the{" "}
          <a
            href="https://github.com/nickolas-nieves/Termina/blob/main/LICENSE"
            target="_blank"
            rel="noopener noreferrer"
          >
            MIT license
          </a>
          .
        </span>
      </label>

      {error ? <p className="dialog-error">{error}</p> : null}

      <div className="dialog-actions">
        <button className="btn" type="button" onClick={close} disabled={busy}>
          Cancel
        </button>
        <button className="btn btn-primary" type="button" onClick={submit} disabled={busy || !license}>
          {busy ? "Submitting…" : "Submit for review"}
        </button>
      </div>
    </Dialog>
  );
}
