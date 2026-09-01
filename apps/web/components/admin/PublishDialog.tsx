"use client";

import { useEffect, useState } from "react";
import type { PublicIcon } from "@termina/glyph";
import { Dialog } from "../Dialog";
import { Glyph } from "../Glyph";
import { Warn } from "../Icons";
import { useToast } from "../Toast";

interface Plan {
  configured: boolean;
  repo: string | null;
  branch: string | null;
  head: string | null;
  repoError: string | null;
  scoped: boolean;
  excludedRemovals: number;
  nextCount: number;
  added: PublicIcon[];
  modified: PublicIcon[];
  removed: string[];
  held: Array<{ slug: string; name: string; status: string }>;
}

/**
 * Publishing writes a commit to a public repository, so the dialog shows the
 * exact diff first. Nothing about "publish" should ever be a surprise.
 */
export function PublishDialog({
  open,
  onClose,
  onPublished,
  ids,
}: {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
  /** Publish only these working glyphs. Omitted publishes everything ready. */
  ids?: string[];
}) {
  const toast = useToast();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialised so a changing array identity does not refetch on every render.
  const scopeKey = ids ? ids.join(",") : "";

  useEffect(() => {
    if (!open) return;
    setPlan(null);
    setError(null);
    fetch("/api/admin/publish/plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(scopeKey ? { ids: scopeKey.split(",") } : {}),
    })
      .then((r) => r.json())
      .then((body: Plan & { error?: string }) => {
        if (body.error) setError(body.error);
        else setPlan(body);
      })
      .catch(() => setError("Could not work out what would change."));
  }, [open, scopeKey]);

  const total = plan ? plan.added.length + plan.modified.length + plan.removed.length : 0;

  async function publish() {
    if (!plan) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          expectedHead: plan.head,
          ...(scopeKey ? { ids: scopeKey.split(",") } : {}),
        }),
      });
      const body = (await res.json()) as {
        error?: string;
        commit?: string;
        url?: string;
      };
      if (!res.ok) {
        setError(body.error ?? "The publish failed.");
        return;
      }
      toast(`Published — commit ${body.commit}. The site rebuilds in a minute or two.`);
      onPublished();
      onClose();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} labelledBy="publish-title" wide>
      <h3 id="publish-title">
        {ids?.length ? `Publish ${ids.length} selected` : "Publish to the repository"}
      </h3>

      {!plan && !error ? (
        <p>Working out what would change…</p>
      ) : error && !plan ? (
        <div className="notice notice-bad">
          <Warn />
          <span>{error}</span>
        </div>
      ) : plan ? (
        <>
          <p>
            {total === 0 ? (
              plan.scoped ? (
                <>
                  Nothing to publish in that selection — those glyphs are either unchanged or not
                  marked final.
                </>
              ) : (
                <>Nothing to publish — the repository already matches the working set.</>
              )
            ) : plan.configured ? (
              <>
                This commits {total} change{total === 1 ? "" : "s"} to{" "}
                <code>
                  {plan.repo}@{plan.branch}
                </code>{" "}
                as you. The set will hold {plan.nextCount} glyph
                {plan.nextCount === 1 ? "" : "s"} afterwards, and the public site rebuilds from
                that commit.
              </>
            ) : (
              <>
                {total} change{total === 1 ? "" : "s"} are ready, but this deployment has no
                repository configured to publish them to.
              </>
            )}
          </p>

          {!plan.configured ? (
            <div className="notice notice-bad">
              <Warn />
              <span>
                <code>GITHUB_REPO</code> is not set, so there is nowhere to publish to. See{" "}
                <code>docs/deployment.md</code>.
              </span>
            </div>
          ) : null}

          {plan.repoError ? (
            <div className="notice notice-bad">
              <Warn />
              <span>{plan.repoError}</span>
            </div>
          ) : null}

          {total > 0 ? (
            <ul className="diff-list">
              {plan.added.map((i) => (
                <li className="diff-add" key={`a-${i.slug}`}>
                  <span className="diff-mark" aria-label="added">+</span>
                  <span className="diff-tile"><Glyph pixels={i.pixels} size={16} /></span>
                  {i.slug}
                  {i.credit ? <span style={{ opacity: 0.6 }}>by {i.credit}</span> : null}
                </li>
              ))}
              {plan.modified.map((i) => (
                <li className="diff-mod" key={`m-${i.slug}`}>
                  <span className="diff-mark" aria-label="changed">~</span>
                  <span className="diff-tile"><Glyph pixels={i.pixels} size={16} /></span>
                  {i.slug}
                </li>
              ))}
              {plan.removed.map((slug) => (
                <li className="diff-del" key={`d-${slug}`}>
                  <span className="diff-mark" aria-label="removed">−</span>
                  <span className="diff-tile" />
                  {slug}
                </li>
              ))}
            </ul>
          ) : null}

          {plan.scoped && plan.excludedRemovals ? (
            <div className="notice notice-info" style={{ marginTop: 16 }}>
              <span>
                {plan.excludedRemovals} staged removal
                {plan.excludedRemovals === 1 ? " is" : "s are"} not part of this publish. Removals
                apply to published glyphs, which cannot be selected — publish the whole set to
                apply them.
              </span>
            </div>
          ) : null}

          {plan.held.length ? (
            <div className="notice notice-warn" style={{ marginTop: 16 }}>
              <Warn />
              <span>
                {plan.held.length}{plan.scoped ? " of the selected" : ""} glyph
                {plan.held.length === 1 ? "" : "s"} held back —{" "}
                {plan.held
                  .slice(0, 4)
                  .map((h) => h.slug)
                  .join(", ")}
                {plan.held.length > 4 ? `, and ${plan.held.length - 4} more` : ""}. Only glyphs
                marked <strong>Final</strong> are published.
              </span>
            </div>
          ) : null}

          {plan.removed.length ? (
            <div className="dialog-note" style={{ marginTop: 16 }}>
              Removing a published glyph breaks anything already importing it by that slug, and it
              stays in the repository history either way.
            </div>
          ) : null}

          {error ? <p className="dialog-error">{error}</p> : null}
        </>
      ) : null}

      <div className="dialog-actions">
        <button className="btn" type="button" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          type="button"
          onClick={publish}
          disabled={busy || !plan || total === 0 || !plan.configured || Boolean(plan.repoError)}
        >
          {busy ? "Publishing…" : total ? `Publish ${total} change${total === 1 ? "" : "s"}` : "Publish"}
        </button>
      </div>
    </Dialog>
  );
}
