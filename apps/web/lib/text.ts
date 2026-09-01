/**
 * Text safety checks for anything a stranger can type.
 *
 * The ranges are compared numerically rather than written as a regex literal,
 * because a character class of control and bidi-override codepoints is itself
 * unreadable in a diff — which is exactly the property that makes those
 * characters worth rejecting.
 */

const ASCII_CONTROL_END = 0x1f;
const DELETE = 0x7f;
const C1_START = 0x80;
const C1_END = 0x9f;

/** Zero-width, bidi-override, and byte-order-mark ranges. */
const INVISIBLE_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x200b, 0x200f], // zero-width space through right-to-left mark
  [0x202a, 0x202e], // embedding and override controls
  [0x2066, 0x2069], // isolate controls
  [0xfeff, 0xfeff], // zero-width no-break space / BOM
];

/**
 * True when the string carries anything invisible or control-like. Such
 * characters can make a rendered label read differently from its stored
 * value, so a name containing one is rejected rather than silently cleaned.
 */
export function hasUnsafeChars(input: string): boolean {
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (code <= ASCII_CONTROL_END) return true;
    if (code === DELETE) return true;
    if (code >= C1_START && code <= C1_END) return true;
    for (const [lo, hi] of INVISIBLE_RANGES) {
      if (code >= lo && code <= hi) return true;
    }
  }
  return false;
}

/** Collapse runs of whitespace and trim. Applied before every length check. */
export function tidy(input: unknown): string {
  return String(input ?? "").replace(/\s+/g, " ").trim();
}
