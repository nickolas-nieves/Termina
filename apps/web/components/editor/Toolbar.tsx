"use client";

import {
  ArrowDown, ArrowLeft, ArrowRight, ArrowUp, MirrorHorizontal, MirrorVertical,
  Marquee, Invert, RoundArrowUpRight, ArrowCounterClockwise, Trash, RoundArrowUpLeft,
} from "termina-icons/react";
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
      <button className="tool" type="button" title="Undo (⌘Z)" aria-label="Undo" disabled={!editor.canUndo} onClick={editor.undo}><RoundArrowUpLeft size={13} /></button>
      <button className="tool" type="button" title="Redo (⇧⌘Z)" aria-label="Redo" disabled={!editor.canRedo} onClick={editor.redo}><RoundArrowUpRight size={13} /></button>
      <div className="tool-sep" />
      <button className="tool" type="button" title="Nudge left (←)" aria-label="Nudge left" onClick={() => editor.shift(-1, 0)}><ArrowLeft size={13} /></button>
      <button className="tool" type="button" title="Nudge down (↓)" aria-label="Nudge down" onClick={() => editor.shift(0, 1)}><ArrowDown size={13} /></button>
      <button className="tool" type="button" title="Nudge up (↑)" aria-label="Nudge up" onClick={() => editor.shift(0, -1)}><ArrowUp size={13} /></button>
      <button className="tool" type="button" title="Nudge right (→)" aria-label="Nudge right" onClick={() => editor.shift(1, 0)}><ArrowRight size={13} /></button>
      <div className="tool-sep" />
      <button className="tool" type="button" title="Mirror horizontally (H)" aria-label="Mirror horizontally" onClick={editor.flipH}><MirrorHorizontal size={13} /></button>
      <button className="tool" type="button" title="Mirror vertically (V)" aria-label="Mirror vertically" onClick={editor.flipV}><MirrorVertical size={13} /></button>
      <button className="tool" type="button" title="Rotate 90° (R)" aria-label="Rotate 90 degrees" onClick={editor.rotate}><ArrowCounterClockwise size={13} /></button>
      <button className="tool" type="button" title="Invert (I)" aria-label="Invert" onClick={editor.invert}><Invert size={13} /></button>
      <div className="tool-sep" />
      <button
        className={`tool${guides ? " is-on" : ""}`}
        type="button"
        title="Toggle guides (G)"
        aria-label="Toggle guides"
        aria-pressed={guides}
        onClick={onToggleGuides}
      >
        <Marquee size={13} />
      </button>
      <button className="tool" type="button" title="Clear grid (⇧C)" aria-label="Clear grid" onClick={onClear}><Trash size={13} /></button>
    </div>
  );
}
