"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

/**
 * The single transient-message channel. Everything that used to call the
 * global `toast()` in the old single-file app goes through this context now,
 * so there is still exactly one at a time.
 */

type ToastFn = (message: string) => void;
const ToastContext = createContext<ToastFn>(() => {});

export function useToast(): ToastFn {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [up, setUp] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((next: string) => {
    setMessage(next);
    setUp(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setUp(false), 2200);
  }, []);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* aria-live rather than a role=alert: these are confirmations, and
          should not interrupt whatever a screen reader is already saying. */}
      <div className={`toast${up ? " is-up" : ""}`} role="status" aria-live="polite">
        <span>{message}</span>
      </div>
    </ToastContext.Provider>
  );
}
