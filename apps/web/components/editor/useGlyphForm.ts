"use client";

import { useCallback, useMemo, useState } from "react";
import { parseTags, slugify, type Status } from "@termina/glyph";

/**
 * The metadata beside the board. Separate from the drawing state because the
 * public editor and the admin console show different subsets of it — the
 * public form has no status or version, because a stranger does not get to
 * decide either.
 */

export interface GlyphForm {
  name: string;
  slug: string;
  category: string;
  tags: string;
  status: Status;
  version: number;
  credit: string;
}

export const EMPTY_FORM: GlyphForm = {
  name: "",
  slug: "",
  category: "",
  tags: "",
  status: "draft",
  version: 1,
  credit: "",
};

export function useGlyphForm(initial: GlyphForm = EMPTY_FORM) {
  const [form, setForm] = useState<GlyphForm>(initial);
  // The slug follows the name until someone types their own, and `relink`
  // puts it back — a renamed glyph should not silently keep a stale filename.
  const [slugLinked, setSlugLinked] = useState(
    () => !initial.slug || initial.slug === slugify(initial.name)
  );

  const setName = useCallback(
    (name: string) => {
      setForm((f) => ({ ...f, name, ...(slugLinked ? { slug: slugify(name) } : null) }));
    },
    [slugLinked]
  );

  const setSlug = useCallback((slug: string) => {
    setSlugLinked(false);
    setForm((f) => ({ ...f, slug: slug.toLowerCase().replace(/[^a-z0-9-]/g, "-") }));
  }, []);

  const relinkSlug = useCallback(() => {
    setSlugLinked(true);
    setForm((f) => ({ ...f, slug: slugify(f.name) }));
  }, []);

  const set = useCallback(<K extends keyof GlyphForm>(key: K, value: GlyphForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  }, []);

  const reset = useCallback((next: GlyphForm = EMPTY_FORM) => {
    setForm(next);
    setSlugLinked(!next.slug || next.slug === slugify(next.name));
  }, []);

  const tagList = useMemo(() => parseTags(form.tags), [form.tags]);

  return { form, setForm, set, setName, setSlug, relinkSlug, reset, slugLinked, tagList };
}
