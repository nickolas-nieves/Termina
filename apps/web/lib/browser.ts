/** Small browser-only helpers shared by every download and copy affordance. */

export function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export function downloadText(filename: string, text: string, type: string) {
  download(filename, new Blob([text], { type }));
}

/**
 * Copy text, with a fallback for browsers that refuse the async clipboard
 * outside a secure context. Returns whether it landed, so the caller can say
 * so rather than claiming success it did not verify.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

export function relTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (!Number.isFinite(diff)) return "—";
  if (diff < 45) return "just now";
  if (diff < 3600) return Math.round(diff / 60) + "m ago";
  if (diff < 86400) return Math.round(diff / 3600) + "h ago";
  if (diff < 604800) return Math.round(diff / 86400) + "d ago";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
