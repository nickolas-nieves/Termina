import manifest from "../../../icons/icons.json";
import { groupByCategory, publicIcon, type PublicIcon } from "@termina/glyph";

/**
 * The published set, read from the repo at build time.
 *
 * This is a static import on purpose: the public pages have no runtime data
 * dependency at all, so they prerender, cache at the edge, and stay up even if
 * every backing service is down. Publishing is a commit plus a redeploy.
 */

export interface Manifest {
  format: string;
  version: number;
  grid: number;
  publishedAt: string | null;
  count: number;
  icons: PublicIcon[];
}

const doc = manifest as unknown as Manifest;

export const publishedIcons: PublicIcon[] = doc.icons
  .map((i) => publicIcon(i))
  .sort((a, b) => a.slug.localeCompare(b.slug));

export const publishedAt = doc.publishedAt;
export const gridSize = doc.grid;

export function findIcon(slug: string): PublicIcon | undefined {
  return publishedIcons.find((i) => i.slug === slug);
}

export function publishedCategories(): string[] {
  return Array.from(groupByCategory(publishedIcons).keys());
}

export function iconsInCategory(category: string): PublicIcon[] {
  const unfiled = category === "Unfiled";
  return publishedIcons.filter((i) => (unfiled ? !i.category : i.category === category));
}

/** What the public JSON feed serves. Kept identical to the on-disk manifest. */
export function feed(): Manifest {
  return {
    format: "termina-iconset",
    version: 1,
    grid: gridSize,
    publishedAt,
    count: publishedIcons.length,
    icons: publishedIcons,
  };
}
