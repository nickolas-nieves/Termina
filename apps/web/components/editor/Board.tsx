"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CELLS, N } from "@termina/glyph";
import type { GlyphEditor } from "./useGlyphEditor";

/**
 * The 13×13 drawing surface.
 *
 * Painting reads the cell under the pointer rather than tracking enter events
 * per cell, so a fast drag never skips a cell — the same approach the original
 * took, and the reason the grid feels continuous on a tablet.
 */
export function Board({ editor, guides }: { editor: GlyphEditor; guides: boolean }) {
  const board = useRef<HTMLDivElement>(null);
  const painting = useRef(false);
  const paintValue = useRef<0 | 1>(1);
  const [live, setLive] = useState("");

  const cellAt = useCallback((clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY);
    if (!(el instanceof HTMLElement) || !el.classList.contains("px")) return -1;
    return Number(el.dataset.i ?? -1);
  }, []);

  const endStroke = useCallback(() => {
    painting.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("pointerup", endStroke);
    window.addEventListener("pointercancel", endStroke);
    return () => {
      window.removeEventListener("pointerup", endStroke);
      window.removeEventListener("pointercancel", endStroke);
    };
  }, [endStroke]);

  return (
    <div className="board-wrap">
      <div className="ruler top" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <div key={i}>{i % 2 === 0 ? i + 1 : "·"}</div>
        ))}
      </div>
      <div className="ruler left" aria-hidden="true">
        {Array.from({ length: N }, (_, i) => (
          <div key={i}>{i % 2 === 0 ? i + 1 : "·"}</div>
        ))}
      </div>

      <div
        ref={board}
        className={`board${guides ? "" : " no-guides no-grid"}`}
        role="grid"
        aria-label="13 by 13 pixel grid"
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={(e) => {
          const i = cellAt(e.clientX, e.clientY);
          if (i < 0) return;
          e.preventDefault();
          editor.beginStroke();
          painting.current = true;
          // Right-drag and ctrl-drag erase without toggling, so you can clean
          // up an area without flipping cells back on as you cross them.
          paintValue.current =
            e.button === 2 || e.ctrlKey ? 0 : editor.pixels[i] === "1" ? 0 : 1;
          try {
            // Capture keeps the stroke alive when the pointer leaves the board.
            // It throws if the pointer is already gone, which must not cost the
            // stroke — painting works without it, just not past the edge.
            board.current?.setPointerCapture(e.pointerId);
          } catch {
            /* no capture; the window-level pointerup still ends the stroke */
          }
          editor.paint(i, paintValue.current);
        }}
        onPointerMove={(e) => {
          if (!painting.current) return;
          const i = cellAt(e.clientX, e.clientY);
          if (i >= 0) editor.paint(i, paintValue.current);
        }}
        onPointerUp={endStroke}
      >
        {Array.from({ length: CELLS }, (_, i) => {
          const x = i % N;
          const y = Math.floor(i / N);
          const on = editor.pixels[i] === "1";
          return (
            <button
              key={i}
              type="button"
              data-i={i}
              className={`px${on ? " on" : ""}${x === 6 || y === 6 ? " axis" : ""}`}
              role="gridcell"
              // gridcell takes aria-selected, not aria-pressed; the label
              // carries the fill state so it is spoken either way.
              aria-selected={on}
              aria-label={`column ${x + 1}, row ${y + 1}, ${on ? "filled" : "empty"}`}
              tabIndex={-1}
              // Keyboard users get the grid through the roving cell below
              // rather than 169 tab stops.
              onClick={(e) => {
                // A pointer stroke already handled this; only a real keyboard
                // or assistive-tech activation reaches here with detail 0.
                if (e.detail !== 0) return;
                editor.beginStroke();
                editor.paint(i, on ? 0 : 1);
              }}
            />
          );
        })}
      </div>

      <div className={`safe-area${guides ? "" : " is-off"}`} aria-hidden="true" />

      {/* A keyboard-reachable equivalent of the grid: move with the arrow keys,
          toggle with space. The board itself is a pointer surface. */}
      <KeyboardCell editor={editor} onAnnounce={setLive} />
      <span className="sr-only" role="status" aria-live="polite">
        {live}
      </span>
    </div>
  );
}

function KeyboardCell({
  editor,
  onAnnounce,
}: {
  editor: GlyphEditor;
  onAnnounce: (s: string) => void;
}) {
  const [cursor, setCursor] = useState(6 * N + 6);

  return (
    <button
      type="button"
      className="sr-only"
      onKeyDown={(e) => {
        const x = cursor % N;
        const y = Math.floor(cursor / N);
        let next = cursor;
        if (e.key === "ArrowLeft") next = y * N + Math.max(0, x - 1);
        else if (e.key === "ArrowRight") next = y * N + Math.min(N - 1, x + 1);
        else if (e.key === "ArrowUp") next = Math.max(0, y - 1) * N + x;
        else if (e.key === "ArrowDown") next = Math.min(N - 1, y + 1) * N + x;
        else if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          e.stopPropagation();
          editor.beginStroke();
          const on = editor.pixels[cursor] === "1";
          editor.paint(cursor, on ? 0 : 1);
          onAnnounce(`column ${x + 1}, row ${y + 1} ${on ? "cleared" : "filled"}`);
          return;
        } else return;
        e.preventDefault();
        e.stopPropagation();
        setCursor(next);
        onAnnounce(
          `column ${(next % N) + 1}, row ${Math.floor(next / N) + 1}, ${
            editor.pixels[next] === "1" ? "filled" : "empty"
          }`
        );
      }}
    >
      Draw with the keyboard: arrow keys move, space toggles a pixel
    </button>
  );
}
