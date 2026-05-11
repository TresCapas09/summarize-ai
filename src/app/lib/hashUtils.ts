/**
 * Generates a SHA-256 hash (fingerprint) of the provided text.
 * Uses the browser's native Web Crypto API.
 */
export async function generateHash(text: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(text);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
  return hashHex;
}
