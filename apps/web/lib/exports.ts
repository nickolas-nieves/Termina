import { N, glyphFile, groupByCategory, rectsFor, type PublicIcon } from "@termina/glyph";
import { makeZip, type ZipFile } from "./zip";

/**
 * Every download the site offers, built in the browser from data it already
 * has. Nothing here calls the server, so a whole-set download costs one static
 * page load and no function invocations.
 */

function escapeXML(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!
  );
}

export function manifestJSON(icons: PublicIcon[]): string {
  return JSON.stringify(
    {
      format: "termina-iconset",
      version: 1,
      grid: N,
      exportedAt: new Date().toISOString(),
      count: icons.length,
      icons,
    },
    null,
    2
  );
}

/** A zip of one SVG per glyph, plus the manifest and the licence. */
export function setZip(icons: PublicIcon[], folder = "termina"): Blob {
  const files: ZipFile[] = icons.map((i) => ({
    name: `${folder}/${i.slug}.svg`,
    text: glyphFile(i),
  }));
  files.push({ name: `${folder}/termina-iconset.json`, text: manifestJSON(icons) });
  files.push({ name: `${folder}/LICENSE`, text: MIT_LICENSE });
  return makeZip(files);
}

/**
 * Contact sheet: every glyph rendered large in a labelled grid.
 *
 * The <symbol> definitions are kept and referenced with <use>, so the file is
 * still a usable sprite — #termina-<slug> resolves from outside — while also
 * rendering as something you can actually look at.
 */
export function sheetSVG(icons: PublicIcon[]): string {
  const COLS = 6, GLYPH = 104, CELL_W = 150, CELL_H = 182;
  const BOX_H = CELL_H - 14;
  const PAD = 36, HEAD = 110, SECTION_H = 38, GROUP_GAP = 20;

  const groups = groupByCategory(icons);
  const trunc = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
  const width = PAD * 2 + COLS * CELL_W;
  const body: string[] = [];
  let y = HEAD;

  for (const [cat, items] of groups) {
    body.push(
      `  <text x="${PAD}" y="${y}" class="cat">${escapeXML(cat.toUpperCase())} · ${items.length}</text>`,
      `  <line x1="${PAD}" y1="${y + 12}" x2="${width - PAD}" y2="${y + 12}" class="rule"/>`
    );
    y += SECTION_H;

    items.forEach((icon, idx) => {
      const cx = PAD + (idx % COLS) * CELL_W;
      const cy = y + Math.floor(idx / COLS) * CELL_H;
      const gx = cx + (CELL_W - GLYPH) / 2;
      body.push(
        `  <g>`,
        `    <rect x="${cx + 3}" y="${cy}" width="${CELL_W - 6}" height="${BOX_H}" rx="8" class="cell"/>`,
        `    <use href="#termina-${icon.slug}" xlink:href="#termina-${icon.slug}" x="${gx}" y="${cy + 16}" width="${GLYPH}" height="${GLYPH}"/>`,
        `    <text x="${cx + CELL_W / 2}" y="${cy + GLYPH + 38}" class="name">${escapeXML(trunc(icon.name, 19))}</text>`,
        `    <text x="${cx + CELL_W / 2}" y="${cy + GLYPH + 54}" class="slug">${escapeXML(trunc(icon.slug, 22))}</text>`,
        `  </g>`
      );
    });

    y += Math.ceil(items.length / COLS) * CELL_H + GROUP_GAP;
  }

  const height = y - GROUP_GAP + PAD;
  // fill on the symbol so the rects inherit it — currentColor keeps the
  // definitions reusable by anything that <use>s them from outside.
  const symbols = icons
    .map((i) => `    <symbol id="termina-${i.slug}" viewBox="0 0 ${N} ${N}" fill="currentColor">${rectsFor(i.pixels)}</symbol>`)
    .join("\n");
  const stamp = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"
     shape-rendering="crispEdges" color="#111111">
  <style>
    /* crispEdges on the root keeps the pixel art hard; everything that is
       not pixel art has to opt back out of it */
    .bg   { fill: #FFFFFF }
    .cell { fill: #FBFBFA; stroke: #EAEAEA; stroke-width: 1; shape-rendering: auto }
    .rule { stroke: #EAEAEA; stroke-width: 1; shape-rendering: auto }
    text  { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; shape-rendering: auto }
    .title{ font-size: 26px; font-weight: 700; letter-spacing: -.8px; fill: #111111 }
    .meta { font-size: 12px; fill: #787774 }
    .cat  { font-size: 10px; letter-spacing: 1.2px; fill: #9B9A97;
            font-family: ui-monospace, 'SF Mono', Menlo, monospace }
    .name { font-size: 12.5px; fill: #111111; text-anchor: middle }
    .slug { font-size: 10px; fill: #9B9A97; text-anchor: middle;
            font-family: ui-monospace, 'SF Mono', Menlo, monospace }
  </style>
  <defs>
${symbols}
  </defs>
  <rect class="bg" x="0" y="0" width="${width}" height="${height}"/>
  <text class="title" x="${PAD}" y="${PAD + 24}">Termina</text>
  <text class="meta" x="${PAD}" y="${PAD + 46}">${icons.length} glyph${icons.length === 1 ? "" : "s"} · 13×13 · ${escapeXML(stamp)}</text>
${body.join("\n")}
</svg>
`;
}

export const MIT_LICENSE = `MIT License

Copyright (c) ${new Date().getFullYear()} Termina Icons contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
