"use client";

import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, FlipH, FlipV,
  Guides, Invert, Redo, Rotate, Trash, Undo,
} from "../Icons";
import type { GlyphEditor } from "./useGlyphEditor";

export function Toolbar({
  editor,
  guides,
  onToggleGuides,
  onClear,
}: {
  editor: GlyphEditor;
  guides: boolean;
  onToggleGuides: () => void;
  onClear: () => void;
}) {
  return (
    <div className="toolbar" role="toolbar" aria-label="Glyph tools">
      <button className="tool" type="button" title="Undo (⌘Z)" aria-label="Undo" disabled={!editor.canUndo} onClick={editor.undo}><Undo /></button>
      <button className="tool" type="button" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={!editor.canRedo} onClick={editor.redo}><Redo /></button>
      <div className="tool-sep" />
      <button className="tool" type="button" title="Nudge left (←)" aria-label="Nudge left" onClick={() => editor.shift(-1, 0)}><ArrowLeft /></button>
      <button className="tool" type="button" title="Nudge down (↓)" aria-label="Nudge down" onClick={() => editor.shift(0, 1)}><ArrowDown /></button>
      <button className="tool" type="button" title="Nudge up (↑)" aria-label="Nudge up" onClick={() => editor.shift(0, -1)}><ArrowUp /></button>
      <button className="tool" type="button" title="Nudge right (→)" aria-label="Nudge right" onClick={() => editor.shift(1, 0)}><ArrowRight /></button>
      <div className="tool-sep" />
      <button className="tool" type="button" title="Mirror horizontally (H)" aria-label="Mirror horizontally" onClick={editor.flipH}><FlipH /></button>
      <button className="tool" type="button" title="Mirror vertically (V)" aria-label="Mirror vertically" onClick={editor.flipV}><FlipV /></button>
      <button className="tool" type="button" title="Rotate 90° (R)" aria-label="Rotate 90 degrees" onClick={editor.rotate}><Rotate /></button>
      <button className="tool" type="button" title="Invert (I)" aria-label="Invert" onClick={editor.invert}><Invert /></button>
      <div className="tool-sep" />
      <button
        className={`tool${guides ? " is-on" : ""}`}
        type="button"
        title="Toggle guides (G)"
        aria-label="Toggle guides"
        aria-pressed={guides}
        onClick={onToggleGuides}
      >
        <Guides />
      </button>
      <button className="tool" type="button" title="Clear grid (⇧C)" aria-label="Clear grid" onClick={onClear}><Trash size={15} /></button>
    </div>
  );
}
