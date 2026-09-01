"use client";

import { useEffect } from "react";
import { Board } from "./Board";
import { Previews } from "./Previews";
import { Toolbar } from "./Toolbar";
import type { GlyphEditor } from "./useGlyphEditor";

/**
 * The studio shell: stage on the left, whatever sidebar the caller supplies on
 * the right. Exactly one viewport tall — the editor never scrolls the page.
 */
export function Studio({
  editor,
  guides,
  onToggleGuides,
  onClear,
  onSave,
  sidebar,
}: {
  editor: GlyphEditor;
  guides: boolean;
  onToggleGuides: () => void;
  onClear: () => void;
  onSave?: () => void;
  sidebar: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement;
      const typing = el instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        onSave?.();
        return;
      }
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) editor.redo();
        else editor.undo();
        return;
      }
      if (typing) {
        if (e.key === "Escape") el.blur();
        return;
      }
      // A dialog is open: leave its own key handling alone.
      if (document.querySelector(".scrim.is-open")) return;

      switch (e.key) {
        case "ArrowLeft": e.preventDefault(); editor.shift(-1, 0); break;
        case "ArrowRight": e.preventDefault(); editor.shift(1, 0); break;
        case "ArrowUp": e.preventDefault(); editor.shift(0, -1); break;
        case "ArrowDown": e.preventDefault(); editor.shift(0, 1); break;
        case "h": case "H": editor.flipH(); break;
        case "v": case "V": editor.flipV(); break;
        case "r": case "R": editor.rotate(); break;
        case "i": case "I": editor.invert(); break;
        case "g": case "G": onToggleGuides(); break;
        case "C": onClear(); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editor, onToggleGuides, onClear, onSave]);

  return (
    <div className="studio">
      <section className="stage">
        <Toolbar editor={editor} guides={guides} onToggleGuides={onToggleGuides} onClear={onClear} />
        <Board editor={editor} guides={guides} />
        <Previews pixels={editor.pixels} />
      </section>
      <aside className="sidebar">{sidebar}</aside>
    </div>
  );
}
