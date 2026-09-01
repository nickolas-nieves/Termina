import "server-only";
import {
  MAX_CREDIT,
  MAX_NAME,
  MAX_NOTE,
  isValidPixels,
  isValidSlug,
  normalizePixels,
  parseTags,
  slugify,
  countOn,
  type SubmissionStatus,
} from "@termina/glyph";
import { store } from "./store";
import { sign } from "./crypto";
import { publishedIcons } from "./published";
import { hasUnsafeChars, tidy } from "./text";

/**
 * The public submission queue.
 *
 * Submissions are written by anyone, so nothing in here is trusted: every
 * field is validated and clamped on the way in, the queue is stored apart from
 * both the working set and the published set, and no submission can reach the
 * public site without an admin explicitly accepting it.
 */

const submissions = () => store("termina-submissions");

export interface Submission {
  id: string;
  kind: "new" | "edit";
  /** For an edit, the published slug being proposed against. */
  targetSlug: string | null;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  pixels: string;
  note: string;
  /** Optional public credit. Rendered, so validated tightly. */
  credit: string | null;
  status: SubmissionStatus;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  /**
   * A one-way HMAC of the submitter's address. Enough to group a flood from a
   * single source during review; not reversible into an address, and never
   * sent to the client.
   */
  sourceHash: string;
}

/** What the admin console is allowed to see — everything but the source hash. */
export type SubmissionView = Omit<Submission, "sourceHash"> & { sourceGroup: string };

export class ValidationError extends Error {
  constructor(
    message: string,
    readonly field?: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Turn an untrusted request body into a Submission, or throw.
 *
 * Credit is the only free text that is ever rendered publicly, so it is held
 * to a much tighter character set than the rest — no URLs, no markup, nothing
 * that could read as a link or an instruction.
 */
export async function validateSubmission(body: unknown, address: string): Promise<Submission> {
  if (!body || typeof body !== "object") throw new ValidationError("Expected a JSON object.");
  const b = body as Record<string, unknown>;

  const pixels = normalizePixels(b.pixels);
  if (!isValidPixels(pixels)) throw new ValidationError("The glyph is malformed.", "pixels");
  if (countOn(pixels) === 0) {
    throw new ValidationError("The glyph is blank — draw something first.", "pixels");
  }

  const name = tidy(b.name);
  if (!name) throw new ValidationError("Give the glyph a name.", "name");
  if (name.length > MAX_NAME) {
    throw new ValidationError(`Names are limited to ${MAX_NAME} characters.`, "name");
  }
  if (hasUnsafeChars(name)) {
    throw new ValidationError("That name contains characters we can't accept.", "name");
  }

  const slug = slugify(b.slug || name);
  if (!isValidSlug(slug)) throw new ValidationError("That slug isn't usable as a filename.", "slug");

  const kind = b.kind === "edit" ? "edit" : "new";
  let targetSlug: string | null = null;
  if (kind === "edit") {
    const target = String(b.targetSlug ?? "");
    if (!publishedIcons.some((i) => i.slug === target)) {
      throw new ValidationError("That glyph isn't in the published set.", "targetSlug");
    }
    targetSlug = target;
  }

  const category = tidy(b.category).slice(0, 40);
  if (hasUnsafeChars(category)) {
    throw new ValidationError("That category contains characters we can't accept.", "category");
  }

  const note = String(b.note ?? "").trim().slice(0, MAX_NOTE);
  if (hasUnsafeChars(note.replace(/\n/g, " "))) {
    throw new ValidationError("That note contains characters we can't accept.", "note");
  }

  let credit: string | null = null;
  const rawCredit = tidy(b.credit);
  if (rawCredit) {
    if (rawCredit.length > MAX_CREDIT) {
      throw new ValidationError(`Credit names are limited to ${MAX_CREDIT} characters.`, "credit");
    }
    // Letters, digits, spaces and a few name punctuation marks. Anything that
    // could render as a link, a tag or a directive is rejected rather than
    // stripped, so the submitter is told why instead of being quietly edited.
    if (!/^[\p{L}\p{N} .'’_-]+$/u.test(rawCredit)) {
      throw new ValidationError(
        "Credit names can only contain letters, numbers, spaces, and . ' - _",
        "credit"
      );
    }
    credit = rawCredit;
  }

  if (b.license !== true) {
    throw new ValidationError("You need to confirm the glyph is yours and MIT-licensed.", "license");
  }

  return {
    id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`,
    kind,
    targetSlug,
    name,
    slug,
    category,
    tags: parseTags(b.tags),
    pixels,
    note,
    credit,
    status: "pending",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    reviewedBy: null,
    sourceHash: await hashSource(address),
  };
}

async function hashSource(address: string): Promise<string> {
  const signed = await sign(`submitter:${address}`);
  return signed.slice(signed.lastIndexOf(".") + 1);
}

export async function saveSubmission(sub: Submission): Promise<void> {
  await submissions().set(sub.id, sub);
}

export async function listSubmissions(): Promise<Submission[]> {
  const s = submissions();
  const keys = await s.list("sub_");
  const records = await Promise.all(keys.map((k) => s.get<Submission>(k)));
  return records
    .filter((r): r is Submission => Boolean(r))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSubmission(id: string): Promise<Submission | null> {
  if (!/^sub_[a-z0-9_]+$/.test(id)) return null;
  return submissions().get<Submission>(id);
}

export async function setSubmissionStatus(
  id: string,
  status: SubmissionStatus,
  reviewer: string
): Promise<Submission | null> {
  const sub = await getSubmission(id);
  if (!sub) return null;
  const next: Submission = {
    ...sub,
    status,
    reviewedAt: new Date().toISOString(),
    reviewedBy: reviewer,
  };
  await submissions().set(id, next);
  return next;
}

export async function deleteSubmission(id: string): Promise<boolean> {
  const sub = await getSubmission(id);
  if (!sub) return false;
  await submissions().delete(id);
  return true;
}

/** Strip the source hash and reduce it to a short opaque group label. */
export function toView(sub: Submission): SubmissionView {
  const { sourceHash, ...rest } = sub;
  return { ...rest, sourceGroup: sourceHash.slice(0, 6) };
}

export async function pendingCount(): Promise<number> {
  const all = await listSubmissions();
  return all.filter((s) => s.status === "pending").length;
}

/** How many submissions this source already has sitting unreviewed. */
export async function pendingFromSource(address: string): Promise<number> {
  const hash = await hashSource(address);
  const all = await listSubmissions();
  return all.filter((s) => s.status === "pending" && s.sourceHash === hash).length;
}
