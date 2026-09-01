"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Chevron } from "../Icons";

/**
 * Category is a combobox: free text (categories are user-defined) plus a
 * dropdown of everything already in use, so you don't retype or fork a
 * near-duplicate name by hand.
 */
export function CategoryCombo({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const q = value.trim().toLowerCase();
  const matches = q ? options.filter((c) => c.toLowerCase().includes(q)) : options;

  return (
    <div className="combo menu-wrap" ref={wrap}>
      <input
        ref={input}
        className="input"
        placeholder="Unfiled"
        autoComplete="off"
        spellCheck={false}
        role="combobox"
        aria-expanded={open}
        aria-controls={id}
        aria-autocomplete="list"
        aria-label="Category"
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
      />
      <button
        className="combo-toggle"
        type="button"
        tabIndex={-1}
        aria-label="Show categories"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          setOpen((v) => !v);
          input.current?.focus();
        }}
      >
        <Chevron />
      </button>
      <div className={`menu category-menu${open ? " is-open" : ""}`} id={id} role="listbox">
        {!options.length ? (
          <div className="combo-empty">No categories yet — type a name to create one</div>
        ) : !matches.length ? (
          <div className="combo-empty">
            No match — saving will make “{value.trim()}” a new category
          </div>
        ) : (
          matches.map((c) => (
            <button
              key={c}
              type="button"
              role="option"
              aria-selected={c === value}
              // Keep focus on the input through the click — otherwise blur
              // fires first and the menu is gone before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(c);
                setOpen(false);
              }}
            >
              {c}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
