import "server-only";
import { normalizeIcon, publicIcon, type Icon, type PublicIcon } from "@termina/glyph";
import { store } from "./store";
import { publishedIcons } from "./published";

/**
 * The admin working set: glyphs that are not in the repo yet, plus pending
 * edits to and removals of glyphs that are.
 *
 * The published set in `icons/` is always the truth about what is live. This
 * store only ever holds the delta, which is what makes "Publish" a legible
 * diff instead of a wholesale overwrite.
 */

const WORKING_KEY = "working";
const admin = () => store("termina-admin");

export interface WorkingDoc {
  icons: Record<string, Icon>;
  /** Slugs of published glyphs staged for removal on the next publish. */
  removed: string[];
  updatedAt: string | null;
}

const EMPTY: WorkingDoc = { icons: {}, removed: [], updatedAt: null };

export async function readWorking(): Promise<WorkingDoc> {
  const doc = (await admin().get<WorkingDoc>(WORKING_KEY)) ?? EMPTY;
  return { icons: doc.icons ?? {}, removed: doc.removed ?? [], updatedAt: doc.updatedAt ?? null };
}

async function writeWorking(doc: WorkingDoc): Promise<WorkingDoc> {
  const next = { ...doc, updatedAt: new Date().toISOString() };
  await admin().set(WORKING_KEY, next);
  return next;
}

/** True when a glyph with this slug is already live in the repo. */
export function slugIsPublished(slug: string): boolean {
  return publishedIcons.some((i) => i.slug === slug);
}

/**
 * Write a glyph into the working set.
 *
 * A working entry that shares a slug with a published glyph is not a conflict
 * — that *is* how an edit is staged, and `mergedEntries` renders it as one.
 * The only real collision is two working entries claiming the same slug, since
 * only one of them could ever become `icons/svg/<slug>.svg`.
 *
 * Callers that mean "this is a brand-new glyph" should check
 * `slugIsPublished` first; the store cannot tell the difference between a
 * deliberate edit and an accidental collision, but the caller can.
 */
export async function upsertIcon(raw: unknown): Promise<Icon> {
  const icon = normalizeIcon(raw);
  if (!icon) throw new Error("not a glyph");

  const doc = await readWorking();

  if (Object.values(doc.icons).some((i) => i.slug === icon.slug && i.id !== icon.id)) {
    throw new SlugTakenError(icon.slug);
  }

  doc.icons[icon.id] = { ...icon, updatedAt: new Date().toISOString() };
  // Staging an edit to a glyph that was staged for removal cancels the removal.
  doc.removed = doc.removed.filter((s) => s !== icon.slug);
  await writeWorking(doc);
  return doc.icons[icon.id]!;
}

export class SlugTakenError extends Error {
  constructor(readonly slug: string) {
    super(`The slug "${slug}" is already in use.`);
    this.name = "SlugTakenError";
  }
}

export async function deleteWorkingIcon(id: string): Promise<boolean> {
  const doc = await readWorking();
  if (!doc.icons[id]) return false;
  delete doc.icons[id];
  await writeWorking(doc);
  return true;
}

/** Stage a published glyph for removal from the repo on the next publish. */
export async function stageRemoval(slug: string, remove: boolean): Promise<WorkingDoc> {
  const doc = await readWorking();
  const set = new Set(doc.removed);
  if (remove) set.add(slug);
  else set.delete(slug);
  doc.removed = [...set].filter((s) => publishedIcons.some((i) => i.slug === s));
  return writeWorking(doc);
}

/* ── the merged view the console renders ─────────────────── */

export type EntryState = "published" | "edited" | "new" | "removing";

export interface Entry extends Icon {
  state: EntryState;
  /** The live version, when this entry is a pending edit of one. */
  publishedPixels?: string;
}

/** Everything the admin can see, published set overlaid with the working set. */
export async function mergedEntries(): Promise<Entry[]> {
  const doc = await readWorking();
  const working = Object.values(doc.icons);
  const bySlug = new Map(working.map((i) => [i.slug, i]));
  const out: Entry[] = [];

  for (const live of publishedIcons) {
    const pending = bySlug.get(live.slug);
    if (pending) {
      out.push({
        ...pending,
        state: differs(pending, live) ? "edited" : "published",
        publishedPixels: live.pixels,
      });
      bySlug.delete(live.slug);
      continue;
    }
    out.push({
      ...fromPublished(live),
      state: doc.removed.includes(live.slug) ? "removing" : "published",
    });
  }

  for (const pending of bySlug.values()) out.push({ ...pending, state: "new" });

  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}

function fromPublished(live: PublicIcon): Icon {
  return {
    id: `published:${live.slug}`,
    name: live.name,
    slug: live.slug,
    category: live.category ?? "",
    tags: live.tags ?? [],
    status: "final",
    version: live.version ?? 1,
    pixels: live.pixels,
    credit: live.credit ?? null,
    createdAt: "",
    updatedAt: "",
  };
}

function differs(a: Icon, b: PublicIcon): boolean {
  return (
    a.pixels !== b.pixels ||
    a.name !== b.name ||
    (a.category ?? "") !== (b.category ?? "") ||
    (a.version ?? 1) !== (b.version ?? 1) ||
    (a.credit ?? null) !== (b.credit ?? null) ||
    JSON.stringify(a.tags ?? []) !== JSON.stringify(b.tags ?? [])
  );
}

/* ── publishing ──────────────────────────────────────────── */

export interface PublishPlan {
  added: PublicIcon[];
  modified: PublicIcon[];
  removed: string[];
  /** What `icons/icons.json` will contain afterwards. */
  next: PublicIcon[];
  /** Working glyphs held back because they are not marked final. */
  held: Icon[];
}

/**
 * Work out exactly what a publish would change. The console shows this before
 * anything is committed — publishing should never be a surprise.
 */
export async function planPublish(): Promise<PublishPlan> {
  const doc = await readWorking();
  const working = Object.values(doc.icons);
  const finals = working.filter((i) => i.status === "final");
  const held = working.filter((i) => i.status !== "final");

  const liveBySlug = new Map(publishedIcons.map((i) => [i.slug, i]));
  const added: PublicIcon[] = [];
  const modified: PublicIcon[] = [];

  for (const icon of finals) {
    const live = liveBySlug.get(icon.slug);
    if (!live) added.push(publicIcon(icon));
    else if (differs(icon, live)) modified.push(publicIcon(icon));
  }

  const removed = doc.removed.filter(
    (slug) => liveBySlug.has(slug) && !finals.some((i) => i.slug === slug)
  );

  const next = new Map(publishedIcons.map((i) => [i.slug, i]));
  for (const icon of [...added, ...modified]) next.set(icon.slug, icon);
  for (const slug of removed) next.delete(slug);

  return {
    added,
    modified,
    removed,
    next: [...next.values()].sort((a, b) => a.slug.localeCompare(b.slug)),
    held,
  };
}

/**
 * Drop the working entries a publish has just written to the repo. They are in
 * git now; keeping them would show every published glyph as a pending edit
 * forever.
 */
export async function clearPublished(slugs: string[]): Promise<WorkingDoc> {
  const doc = await readWorking();
  const gone = new Set(slugs);
  for (const [id, icon] of Object.entries(doc.icons)) {
    if (gone.has(icon.slug)) delete doc.icons[id];
  }
  doc.removed = doc.removed.filter((s) => !gone.has(s));
  return writeWorking(doc);
}
