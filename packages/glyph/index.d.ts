export type Status = "draft" | "review" | "final";
export type SubmissionStatus = "pending" | "accepted" | "rejected";

/** A glyph as stored in the working set and in `icons/icons.json`. */
export interface Icon {
  id: string;
  name: string;
  slug: string;
  category: string;
  tags: string[];
  status: Status;
  version: number;
  /** 169 characters of "0"/"1", row-major from the top-left. */
  pixels: string;
  /** Optional public credit for a community-contributed glyph. */
  credit: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The shape published to `icons/icons.json`, the feed and the npm package. */
export interface PublicIcon {
  name: string;
  slug: string;
  category: string;
  tags: string[];
  version: number;
  pixels: string;
  credit?: string;
}

export interface Bounds {
  x0: number; y0: number; x1: number; y1: number; w: number; h: number;
}

export const N: 13;
export const CELLS: 169;
export const STATUSES: readonly Status[];
export const SUBMISSION_STATUSES: readonly SubmissionStatus[];

export const MAX_NAME: number;
export const MAX_SLUG: number;
export const MAX_CATEGORY: number;
export const MAX_TAGS: number;
export const MAX_TAG: number;
export const MAX_CREDIT: number;
export const MAX_NOTE: number;

export function normalizePixels(input: unknown): string;
export function isValidPixels(input: unknown): input is string;
export function toCells(bits: string): Uint8Array;
export function fromCells(cells: Uint8Array | number[]): string;
export function countOn(bits: string): number;
export function isBlank(bits: string): boolean;
export function bounds(bits: string): Bounds | null;

export function shift(bits: string, dx: number, dy: number): string;
export function flipH(bits: string): string;
export function flipV(bits: string): string;
export function rotate(bits: string): string;
export function invert(bits: string): string;

export interface Run { x: number; y: number; w: number }
export function rects(bits: string): Run[];
export function rectList(bits: string): string[];
export function rectsFor(bits: string): string;
export function glyphSVG(bits: string, size?: number, color?: string): string;
export function glyphFile(icon: { slug: string; pixels: string; version?: number }): string;
export function pixelsFromSVG(svg: string): string | null;
export function spriteSVG(icons: Array<{ slug: string; pixels: string }>, prefix?: string): string;

export function slugify(s: unknown): string;
export function isValidSlug(s: unknown): s is string;
export function pascalCase(slug: string): string;
export function componentName(slug: string): string;
export function parseTags(input: unknown): string[];

export function normalizeIcon(raw: unknown, opts?: { now?: string }): Icon | null;
export function publicIcon(icon: Icon | PublicIcon): PublicIcon;
export function uid(): string;
export function groupByCategory<T extends { category?: string; name: string }>(
  icons: T[],
  unfiled?: string
): Map<string, T[]>;
export function matchesQuery(
  icon: { name: string; slug: string; category?: string; tags?: string[] },
  query: string
): boolean;

export interface ManifestDoc {
  format: string;
  version: number;
  grid: number;
  publishedAt: string | null;
  count: number;
  icons: PublicIcon[];
}
export function manifestDoc(
  icons: Array<Icon | PublicIcon>,
  opts?: { publishedAt?: string | null; grid?: number }
): ManifestDoc;
export function manifestJSON(
  icons: Array<Icon | PublicIcon>,
  opts?: { publishedAt?: string | null; grid?: number }
): string;
