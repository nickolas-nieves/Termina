import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/** Repo root, resolved from this file rather than from process.cwd(), so the
 *  scripts behave the same whether npm runs them from the root or a workspace. */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const ICONS_DIR = join(ROOT, "icons");
export const SVG_DIR = join(ICONS_DIR, "svg");
export const MANIFEST = join(ICONS_DIR, "icons.json");
