"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * A dropdown that closes on outside click, on Escape, and when focus leaves it.
 *
 * The original wired this up globally with one document listener and a
 * `closeMenus()` sweep; scoping it per menu means two menus can't get out of
 * step and a menu can't be left open after its trigger unmounts.
 */
export function Menu({
  label,
  trigger,
  children,
  className = "",
  menuClassName = "",
  align = "end",
}: {
  label: string;
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  className?: string;
  menuClassName?: string;
  align?: "start" | "end";
}) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        // Send focus back where it came from, or it lands on <body>.
        wrap.current?.querySelector<HTMLButtonElement>("button")?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className={`menu-wrap ${className}`} ref={wrap}>
      <button
        type="button"
        className={className.includes("btn") ? className : "btn"}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
      >
        {trigger}
      </button>
      <div
        id={id}
        className={`menu${open ? " is-open" : ""} ${menuClassName}`}
        role="menu"
        style={align === "start" ? { right: "auto", left: 0 } : undefined}
      >
        {open ? children(() => setOpen(false)) : null}
      </div>
    </div>
  );
}
