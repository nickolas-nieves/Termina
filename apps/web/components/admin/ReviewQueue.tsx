"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { glyphFile, type PublicIcon, type SubmissionStatus } from "@termina/glyph";
import type { SubmissionView } from "@/lib/submissions";
import { Dialog } from "../Dialog";
import { Glyph } from "../Glyph";
import { ArrowRightLong, Check, Cross, DownloadIcon, Trash } from "../Icons";
import { useToast } from "../Toast";
import { CategoryCombo } from "../editor/CategoryCombo";
import { downloadText, relTime } from "@/lib/browser";

/**
 * The review queue.
 *
 * Accepting copies a submission into the working set as a draft — it does not
 * publish. That keeps the anonymous write path two deliberate steps away from
 * the public site, and gives every accepted glyph a pass through the editor
 * before it ships.
 */
export function ReviewQueue({
  submissions: initial,
  published,
  categories,
}: {
  submissions: SubmissionView[];
  published: PublicIcon[];
  categories: string[];
}) {
  const toast = useToast();
  const router = useRouter();
  const [subs, setSubs] = useState(initial);
  const [filter, setFilter] = useState<SubmissionStatus | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<SubmissionView | null>(null);

  const bySlug = useMemo(() => new Map(published.map((i) => [i.slug, i])), [published]);
  const counts = useMemo(
    () => ({
      pending: subs.filter((s) => s.status === "pending").length,
      accepted: subs.filter((s) => s.status === "accepted").length,
      rejected: subs.filter((s) => s.status === "rejected").length,
    }),
    [subs]
  );

  const shown = subs.filter((s) => filter === "all" || s.status === filter);

  async function act(
    sub: SubmissionView,
    action: "reject" | "delete",
  ) {
    setBusy(sub.id);
    try {
      const res = await fetch(`/api/admin/submissions/${encodeURIComponent(sub.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) return toast(body.error ?? "That didn't work");

      if (action === "delete") {
        setSubs((list) => list.filter((s) => s.id !== sub.id));
        toast(`Deleted the submission for ${sub.slug}`);
      } else {
        setSubs((list) =>
          list.map((s) => (s.id === sub.id ? { ...s, status: "rejected" } : s))
        );
        toast(`Rejected ${sub.slug}`);
      }
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="admin-shell">
      <div className="admin-head">
        <div>
          <h1>Submissions</h1>
          <p>
            Icons sent in from the public editor. Nothing here is on the site — accepting one moves
            it into the working set as a draft, where you can refine it before publishing.
          </p>
        </div>
      </div>

      <div className="chips" style={{ marginBottom: 22 }}>
        {(["pending", "accepted", "rejected", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            className="chip-btn"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && counts[f] ? ` · ${counts[f]}` : ""}
          </button>
        ))}
      </div>

      {!shown.length ? (
        <div className="empty">
          <h3>{filter === "pending" ? "Nothing waiting" : "Nothing here"}</h3>
          <p>
            {filter === "pending"
              ? "The queue is empty. Submissions from the public editor will land here."
              : `No ${filter} submissions.`}
          </p>
        </div>
      ) : (
        <div className="queue">
          {shown.map((sub) => {
            const live = sub.targetSlug ? bySlug.get(sub.targetSlug) : undefined;
            return (
              <article className={`sub-card${busy === sub.id ? " is-busy" : ""}`} key={sub.id}>
                <div className="sub-visual">
                  {live ? (
                    <>
                      <span className="sub-tile was" title={`Published: ${live.name}`}>
                        <Glyph pixels={live.pixels} size={34} />
                      </span>
                      <ArrowRightLong className="sub-arrow" />
                    </>
                  ) : null}
                  <span className="sub-tile" title="Submitted">
                    <Glyph pixels={sub.pixels} size={34} />
                  </span>
                </div>

                <div className="sub-body">
                  <div className="sub-title">
                    <span className="name">{sub.name}</span>
                    <code>{sub.slug}</code>
                    <span className={`pill pill-${sub.status}`}>{sub.status}</span>
                    {sub.kind === "edit" ? <span className="pill pill-review">edit</span> : null}
                  </div>

                  <div className="sub-meta">
                    <span>{relTime(sub.createdAt)}</span>
                    <span className="dot-sep">·</span>
                    <span>{sub.category || "Unfiled"}</span>
                    {sub.credit ? (
                      <>
                        <span className="dot-sep">·</span>
                        <span>by {sub.credit}</span>
                      </>
                    ) : null}
                    <span className="dot-sep">·</span>
                    {/* An opaque grouping label, not an address: several
                        submissions sharing it came from one source. */}
                    <span title="Submitter group — the same label means the same source">
                      src {sub.sourceGroup}
                    </span>
                    {sub.reviewedBy ? (
                      <>
                        <span className="dot-sep">·</span>
                        <span>reviewed by {sub.reviewedBy}</span>
                      </>
                    ) : null}
                  </div>

                  {sub.note ? (
                    <p
                      style={{
                        margin: "10px 0 0",
                        fontSize: 12.5,
                        color: "var(--muted)",
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                        maxWidth: "62ch",
                      }}
                    >
                      {sub.note}
                    </p>
                  ) : null}

                  {sub.tags.length ? (
                    <div className="sub-tags">
                      {sub.tags.map((t) => (
                        <span className="tag" key={t}>
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="sub-actions">
                  <button
                    className="btn"
                    type="button"
                    title="Download the submitted SVG"
                    aria-label={`Download ${sub.slug} as SVG`}
                    onClick={() =>
                      downloadText(
                        `${sub.slug}.svg`,
                        glyphFile({ slug: sub.slug, pixels: sub.pixels, version: 1 }),
                        "image/svg+xml"
                      )
                    }
                  >
                    <DownloadIcon />
                  </button>
                  {sub.status === "pending" ? (
                    <>
                      <button className="btn btn-danger" type="button" onClick={() => act(sub, "reject")}>
                        <Cross />
                        Reject
                      </button>
                      <button
                        className="btn btn-primary"
                        type="button"
                        onClick={() => setAccepting(sub)}
                      >
                        <Check />
                        Accept
                      </button>
                    </>
                  ) : (
                    <button className="btn btn-danger" type="button" onClick={() => act(sub, "delete")}>
                      <Trash />
                      Delete
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      <AcceptDialog
        submission={accepting}
        categories={categories}
        onClose={() => setAccepting(null)}
        onAccepted={(id) => {
          setSubs((list) => list.map((s) => (s.id === id ? { ...s, status: "accepted" } : s)));
          router.refresh();
        }}
      />
    </div>
  );
}

/**
 * Accepting is also the moment to fix the metadata — a good glyph with a bad
 * slug should not have to be rejected and redrawn by its contributor.
 */
function AcceptDialog({
  submission,
  categories,
  onClose,
  onAccepted,
}: {
  submission: SubmissionView | null;
  categories: string[];
  onClose: () => void;
  onAccepted: (id: string) => void;
}) {
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [credit, setCredit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  // Seed the form the first time a given submission is opened.
  if (submission && loadedFor !== submission.id) {
    setLoadedFor(submission.id);
    setName(submission.name);
    setSlug(submission.slug);
    setCategory(submission.category);
    setTags(submission.tags.join(", "));
    setCredit(submission.credit ?? "");
    setError(null);
  }

  async function accept(thenEdit: boolean) {
    if (!submission) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/submissions/${encodeURIComponent(submission.id)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          overrides: { name, slug, category, tags, credit: credit.trim() || null },
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        icon?: { id: string };
      };
      if (!res.ok) {
        setError(body.error ?? "Could not accept that submission.");
        return;
      }
      toast(`Accepted ${slug} — it's a draft in the working set now`);
      onAccepted(submission.id);
      onClose();
      if (thenEdit && body.icon) router.push(`/admin/editor?id=${encodeURIComponent(body.icon.id)}`);
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={Boolean(submission)} onClose={onClose} labelledBy="accept-title" wide>
      <h3 id="accept-title">Accept this submission</h3>
      <p>
        It becomes a <strong>draft</strong> in the working set. Nothing reaches the public site
        until you mark it final and publish.
      </p>

      {submission ? (
        <div className="sub-visual" style={{ marginBottom: 20 }}>
          <span className="sub-tile">
            <Glyph pixels={submission.pixels} size={34} />
          </span>
          {submission.credit ? (
            <div className="sub-body">
              <div className="sub-meta">Contributor asked to be credited as “{submission.credit}”</div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="field">
        <label className="label" htmlFor="a-name">Name</label>
        <input className="input" id="a-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </div>
      <div className="field">
        <label className="label" htmlFor="a-slug">Slug</label>
        <input
          className="input mono"
          id="a-slug"
          value={slug}
          maxLength={60}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
        />
      </div>
      <div className="field">
        <div className="label">Category</div>
        <CategoryCombo value={category} onChange={setCategory} options={categories} />
      </div>
      <div className="field">
        <label className="label" htmlFor="a-tags">Keywords</label>
        <input className="input" id="a-tags" value={tags} onChange={(e) => setTags(e.target.value)} />
      </div>
      <div className="field">
        <div className="label">
          <label htmlFor="a-credit">Credit</label>
          <span className="hint">published with the glyph</span>
        </div>
        <input
          className="input"
          id="a-credit"
          value={credit}
          maxLength={40}
          onChange={(e) => setCredit(e.target.value)}
        />
      </div>

      {error ? <p className="dialog-error">{error}</p> : null}

      <div className="dialog-actions">
        <button className="btn" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn" type="button" onClick={() => accept(false)} disabled={busy}>
          Accept
        </button>
        <button className="btn btn-primary" type="button" onClick={() => accept(true)} disabled={busy}>
          {busy ? "Accepting…" : "Accept and edit"}
        </button>
      </div>
    </Dialog>
  );
}
