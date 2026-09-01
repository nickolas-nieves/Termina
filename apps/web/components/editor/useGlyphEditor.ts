"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CELLS,
  countOn,
  flipH as doFlipH,
  flipV as doFlipV,
  invert as doInvert,
  normalizePixels,
  rotate as doRotate,
  shift as doShift,
} from "@termina/glyph";

/**
 * The drawing surface's state: the bitmap, its undo history, and the
 * transforms. Kept apart from the form so the board can be reused by the
 * public editor and the admin console without either knowing about the other.
 */

const HISTORY_LIMIT = 120;

export interface GlyphEditor {
  pixels: string;
  setPixels: (bits: string, opts?: { resetHistory?: boolean }) => void;
  paint: (index: number, value: 0 | 1) => void;
  beginStroke: () => void;
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
  shift: (dx: number, dy: number) => void;
  flipH: () => void;
  flipV: () => void;
  rotate: () => void;
  invert: () => void;
  clear: () => boolean;
  isBlank: boolean;
}

export function useGlyphEditor(initial = "0".repeat(CELLS)): GlyphEditor {
  const [pixels, setPixelsRaw] = useState(() => normalizePixels(initial));
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);
  const [, forceHistoryRender] = useState(0);

  /**
   * A mirror of the current bitmap, so the history operations can read it
   * without doing their work inside a state updater. Updaters must be pure —
   * React calls them twice in development — and pushing a history entry from
   * inside one produced two entries per stroke.
   */
  const pixelsRef = useRef(pixels);
  pixelsRef.current = pixels;

  const bumpHistoryUI = useCallback(() => forceHistoryRender((n) => n + 1), []);

  const pushHistory = useCallback(
    (snapshot: string) => {
      undoStack.current.push(snapshot);
      if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      redoStack.current.length = 0;
      bumpHistoryUI();
    },
    [bumpHistoryUI]
  );

  const setPixels = useCallback(
    (bits: string, opts?: { resetHistory?: boolean }) => {
      if (opts?.resetHistory) {
        undoStack.current.length = 0;
        redoStack.current.length = 0;
        bumpHistoryUI();
      }
      setPixelsRaw(normalizePixels(bits));
    },
    [bumpHistoryUI]
  );

  /**
   * One history entry per stroke, not per cell — dragging across twenty cells
   * should undo as one action, which is what the original's pointerdown-only
   * push achieved.
   */
  const beginStroke = useCallback(() => {
    pushHistory(pixelsRef.current);
  }, [pushHistory]);

  /**
   * The one operation that legitimately uses an updater: it is called many
   * times per frame during a drag, it is pure, and it must not miss a cell to
   * a stale closure.
   */
  const paint = useCallback((index: number, value: 0 | 1) => {
    if (index < 0 || index >= CELLS) return;
    setPixelsRaw((current) => {
      if (current[index] === String(value)) return current;
      return current.slice(0, index) + String(value) + current.slice(index + 1);
    });
  }, []);

  const undo = useCallback(() => {
    const prev = undoStack.current.pop();
    if (prev === undefined) return;
    redoStack.current.push(pixelsRef.current);
    setPixelsRaw(prev);
    bumpHistoryUI();
  }, [bumpHistoryUI]);

  const redo = useCallback(() => {
    const next = redoStack.current.pop();
    if (next === undefined) return;
    undoStack.current.push(pixelsRef.current);
    setPixelsRaw(next);
    bumpHistoryUI();
  }, [bumpHistoryUI]);

  const mutate = useCallback(
    (fn: (bits: string) => string) => {
      pushHistory(pixelsRef.current);
      setPixelsRaw(fn(pixelsRef.current));
    },
    [pushHistory]
  );

  const clear = useCallback(() => {
    if (countOn(pixelsRef.current) === 0) return false;
    pushHistory(pixelsRef.current);
    setPixelsRaw("0".repeat(CELLS));
    return true;
  }, [pushHistory]);

  return {
    pixels,
    setPixels,
    paint,
    beginStroke,
    canUndo: undoStack.current.length > 0,
    canRedo: redoStack.current.length > 0,
    undo,
    redo,
    shift: useCallback((dx, dy) => mutate((b) => doShift(b, dx, dy)), [mutate]),
    flipH: useCallback(() => mutate(doFlipH), [mutate]),
    flipV: useCallback(() => mutate(doFlipV), [mutate]),
    rotate: useCallback(() => mutate(doRotate), [mutate]),
    invert: useCallback(() => mutate(doInvert), [mutate]),
    clear,
    isBlank: countOn(pixels) === 0,
  };
}

/**
 * Best-effort local draft.
 *
 * Losing an in-progress drawing to a refresh is the one failure this app
 * cannot make acceptable, so the draft is written on every change — debounced,
 * and wrapped, because private-mode storage throws on write.
 */
export function useDraft<T>(key: string, value: T, enabled = true) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        /* private mode, or the quota is full — the draft is a convenience */
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [key, value, enabled]);
}

export function readDraft<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function clearDraft(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    /* nothing to do */
  }
}
