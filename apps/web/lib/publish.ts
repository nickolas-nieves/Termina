import "server-only";
import { glyphFile, manifestJSON, type PublicIcon } from "@termina/glyph";
import type { FileChange } from "./github";
import { gridSize } from "./published";

/**
 * Turn a publish plan into the exact files to commit.
 *
 * The output has to be byte-identical to what `npm run icons:write` produces
 * locally, because `npm run icons:check` runs in CI and compares them. If
 * these two ever disagree, the build breaks loudly instead of the repo
 * quietly drifting from the site.
 */

export function manifestFile(icons: PublicIcon[], publishedAt: string): string {
  return manifestJSON(icons, { publishedAt, grid: gridSize });
}

export function buildChanges(opts: {
  next: PublicIcon[];
  added: PublicIcon[];
  modified: PublicIcon[];
  removed: string[];
  publishedAt: string;
}): FileChange[] {
  const files: FileChange[] = [
    { path: "icons/icons.json", content: manifestFile(opts.next, opts.publishedAt) },
  ];
  for (const icon of [...opts.added, ...opts.modified]) {
    files.push({ path: `icons/svg/${icon.slug}.svg`, content: glyphFile(icon) });
  }
  for (const slug of opts.removed) {
    files.push({ path: `icons/svg/${slug}.svg`, content: null });
  }
  return files;
}

export function commitMessage(opts: {
  added: PublicIcon[];
  modified: PublicIcon[];
  removed: string[];
  login: string;
}): string {
  const parts: string[] = [];
  if (opts.added.length) parts.push(`add ${opts.added.length}`);
  if (opts.modified.length) parts.push(`update ${opts.modified.length}`);
  if (opts.removed.length) parts.push(`remove ${opts.removed.length}`);
  const summary = parts.join(", ") || "no changes";

  const lines = [`Publish icons: ${summary}`, ""];
  for (const i of opts.added) lines.push(`+ ${i.slug}${i.credit ? ` (by ${i.credit})` : ""}`);
  for (const i of opts.modified) lines.push(`~ ${i.slug}`);
  for (const slug of opts.removed) lines.push(`- ${slug}`);
  lines.push("", `Published from the Termina admin console by @${opts.login}.`);
  return lines.join("\n");
}
