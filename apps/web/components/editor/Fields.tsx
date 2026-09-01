"use client";

import { CategoryCombo } from "./CategoryCombo";
import type { GlyphForm } from "./useGlyphForm";

/** The metadata fields shared by both sidebars, in the same order as before. */
export function CoreFields({
  form,
  tagList,
  categories,
  onName,
  onSlug,
  onRelink,
  set,
  slugError,
}: {
  form: GlyphForm;
  tagList: string[];
  categories: string[];
  onName: (v: string) => void;
  onSlug: (v: string) => void;
  onRelink: () => void;
  set: <K extends keyof GlyphForm>(key: K, value: GlyphForm[K]) => void;
  slugError?: string | null;
}) {
  return (
    <>
      <div className="field">
        <label className="label" htmlFor="f-name">Name</label>
        <input
          className="input"
          id="f-name"
          placeholder="Terminal window"
          autoComplete="off"
          spellCheck={false}
          maxLength={60}
          value={form.name}
          onChange={(e) => onName(e.target.value)}
        />
      </div>

      <div className="field">
        <div className="label">
          <label htmlFor="f-slug">Slug</label>
          <button className="hint btn-ghost" type="button" style={{ height: "auto", padding: 0 }} onClick={onRelink}>
            relink
          </button>
        </div>
        <input
          className={`input mono${slugError ? " is-bad" : ""}`}
          id="f-slug"
          placeholder="terminal-window"
          autoComplete="off"
          spellCheck={false}
          maxLength={60}
          value={form.slug}
          aria-invalid={Boolean(slugError)}
          aria-describedby={slugError ? "f-slug-error" : undefined}
          onChange={(e) => onSlug(e.target.value)}
        />
        {slugError ? <p className="field-error" id="f-slug-error">{slugError}</p> : null}
      </div>

      <div className="field">
        <div className="label">Category</div>
        <CategoryCombo value={form.category} onChange={(v) => set("category", v)} options={categories} />
      </div>

      <div className="field">
        <div className="label">
          <label htmlFor="f-tags">Keywords</label>
          <span className="hint">comma separated</span>
        </div>
        <input
          className="input"
          id="f-tags"
          placeholder="shell, console, prompt"
          autoComplete="off"
          spellCheck={false}
          value={form.tags}
          onChange={(e) => set("tags", e.target.value)}
        />
        <div className="tagline">
          {tagList.map((t) => (
            <span className="tag" key={t}>{t}</span>
          ))}
        </div>
      </div>
    </>
  );
}
