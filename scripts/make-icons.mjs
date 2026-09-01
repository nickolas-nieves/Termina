/**
 * Renders the app icon PNGs from apps/web/public/icon.svg.
 *
 * iOS home-screen icons and the web manifest need real rasters, and every
 * pixel must land on an exact boundary, so this scales the 13×13 mark by whole
 * integers and centres it — no resampling, no soft edges.
 *
 *   node scripts/make-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "apps", "web", "public", "icon.svg");
const OUT = path.join(ROOT, "apps", "web", "public");

const N = 13;
const INK = [0x11, 0x11, 0x11];
const PAPER = [0xFB, 0xFB, 0xFA];

/* ── read the mark ─────────────────────────────────────── */
function parseGlyph(svg) {
  const grid = new Uint8Array(N * N);
  const re = /<rect\s+x="(\d+)"\s+y="(\d+)"\s+width="(\d+)"\s+height="(\d+)"/g;
  let m, found = 0;
  while ((m = re.exec(svg))) {
    const x = +m[1], y = +m[2], w = +m[3], h = +m[4];
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        const px = x + dx, py = y + dy;
        if (px < N && py < N) grid[py * N + px] = 1;
      }
    }
    found++;
  }
  if (!found) throw new Error("No <rect> elements found in " + SRC);
  return grid;
}

/* ── PNG encoder (RGBA, no dependencies) ───────────────── */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePNG(size, pixelAt) {
  // Each scanline is prefixed with filter byte 0 (None).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  let p = 0;
  for (let y = 0; y < size; y++) {
    raw[p++] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y);
      raw[p++] = r; raw[p++] = g; raw[p++] = b; raw[p++] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

/**
 * @param inset fraction of the canvas kept clear around the mark. Android
 *   maskable icons crop to a circle, so those need a much bigger margin.
 */
function render(grid, size, { fg, bg, inset = 0.08 }) {
  const scale = Math.max(1, Math.floor((size * (1 - inset * 2)) / N));
  const drawn = scale * N;
  const off = Math.floor((size - drawn) / 2);
  return encodePNG(size, (x, y) => {
    const gx = Math.floor((x - off) / scale);
    const gy = Math.floor((y - off) / scale);
    if (x < off || y < off || gx >= N || gy >= N) return bg;
    return grid[gy * N + gx] ? fg : bg;
  });
}

/* ── go ────────────────────────────────────────────────── */
const grid = parseGlyph(fs.readFileSync(SRC, "utf8"));
const dark = { fg: PAPER, bg: INK };

const targets = [
  ["icon-32.png", 32, dark, 0.06],
  ["icon-180.png", 180, dark, 0.10],   // apple-touch-icon
  ["icon-192.png", 192, dark, 0.10],
  ["icon-512.png", 512, dark, 0.10],
  ["icon-512-maskable.png", 512, dark, 0.20]
];

for (const [name, size, colors, inset] of targets) {
  const buf = render(grid, size, { ...colors, inset });
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`${name.padEnd(24)} ${size}×${size}  ${String(buf.length).padStart(6)} bytes`);
}
console.log("\nDone. Icons written to apps/web/public/");
