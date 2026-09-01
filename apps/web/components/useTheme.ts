"use client";

import { useCallback, useEffect, useState } from "react";
import { THEME_CANVAS, THEME_KEY, THEMES, type Theme } from "./ThemeScript";

/**
 * Every colour is a light-dark() pair, so the whole palette turns on the root
 * `color-scheme` — which is what [data-theme] sets. Removing the attribute
 * hands the decision back to the OS.
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(THEME_KEY);
      if (stored && (THEMES as readonly string[]).includes(stored)) setTheme(stored as Theme);
    } catch {
      /* private mode — stay on the system setting */
    }
  }, []);

  const apply = useCallback((next: Theme) => {
    if (next === "system") delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = next;

    // The two theme-colour tags are scoped to prefers-color-scheme, which no
    // longer tracks the page once a theme is forced — so pin both to one value.
    const light = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="light"]');
    const dark = document.querySelector<HTMLMetaElement>('meta[name="theme-color"][media*="dark"]');
    if (light && dark) {
      if (next === "system") {
        light.content = THEME_CANVAS.light;
        dark.content = THEME_CANVAS.dark;
      } else {
        light.content = dark.content = THEME_CANVAS[next];
      }
    }
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* best effort */
    }
    setTheme(next);
  }, []);

  const cycle = useCallback(() => {
    apply(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]!);
  }, [theme, apply]);

  return { theme, setTheme: apply, cycle };
}

/** Shared with the hero reel and the card cascade, both of which hold still. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}
