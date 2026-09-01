import "server-only";

/**
 * HMAC helpers over Web Crypto, so the same code runs in the Node and Edge
 * runtimes. Used to sign session cookies and the OAuth `state` parameter.
 */

const enc = new TextEncoder();

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;

  // A weak or missing secret in production would let anyone mint an admin
  // cookie, so refuse to start rather than degrade quietly.
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET is missing or shorter than 32 characters. " +
        "Generate one with `openssl rand -base64 48` and set it in the site environment."
    );
  }
  return "dev-only-insecure-secret-dev-only-insecure-secret";
}

async function key(): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

function toBase64Url(bytes: ArrayBuffer): string {
  return Buffer.from(bytes).toString("base64url");
}

export async function sign(value: string): Promise<string> {
  const mac = await crypto.subtle.sign("HMAC", await key(), enc.encode(value));
  return `${value}.${toBase64Url(mac)}`;
}

/** @returns the original value, or null if the signature does not verify. */
export async function unsign(signed: string | undefined | null): Promise<string | null> {
  if (!signed) return null;
  const dot = signed.lastIndexOf(".");
  if (dot <= 0) return null;
  const value = signed.slice(0, dot);
  const mac = signed.slice(dot + 1);
  let macBytes: Uint8Array<ArrayBuffer>;
  try {
    // Copied into an ArrayBuffer we own: a Node Buffer may be a view onto a
    // pooled (possibly shared) buffer, which Web Crypto's BufferSource
    // signature does not accept.
    const decoded = Buffer.from(mac, "base64url");
    macBytes = new Uint8Array(new ArrayBuffer(decoded.length));
    macBytes.set(decoded);
  } catch {
    return null;
  }
  // crypto.subtle.verify is constant-time, unlike comparing the strings.
  const ok = await crypto.subtle.verify("HMAC", await key(), macBytes, enc.encode(value));
  return ok ? value : null;
}

export function randomId(bytes = 32): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Buffer.from(buf).toString("base64url");
}

/** Length-independent equality, for comparing anything secret. */
export function timingSafeEqual(a: string, b: string): boolean {
  const enc2 = new TextEncoder();
  const ab = enc2.encode(a);
  const bb = enc2.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}
