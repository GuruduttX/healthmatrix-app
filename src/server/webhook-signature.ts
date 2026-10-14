// Mobilab signs each webhook with a secret only it and we know: X-Signature-SHA256 is
// "sha256=" + the lowercase hex HMAC-SHA256 of the raw body, keyed with the secret as plain UTF-8
// (never hex- or base64-decoded). Web Crypto only, so it runs the same on the dev server and on
// EAS Hosting. No imports, so it can be checked on its own with Node.

const encoder = new TextEncoder();

/** "sha256=<hex>" for `body`, as Mobilab computes it. */
export async function signBody(secret: string, body: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
  const hex = Array.from(new Uint8Array(mac), (b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256=${hex}`;
}

/** Compares in time that doesn't depend on where the strings first differ. */
function equalInConstantTime(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * Whether `header` is Mobilab's signature of `rawBody`. The body must be the bytes as received:
 * parsing the JSON and writing it back changes spacing or escaping, and the signature never matches.
 */
export async function verifySignature(secret: string, rawBody: string, header: string | null) {
  if (!header || !/^sha256=[0-9a-f]{64}$/.test(header)) return false;
  return equalInConstantTime(await signBody(secret, rawBody), header);
}
