// Nazorat kodi: faqat PBKDF2-SHA256 xeshi saqlanadi (SPEC 13.3).
const enc = new TextEncoder();
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (h: string) => new Uint8Array(h.match(/../g)!.map((x) => parseInt(x, 16)));

export async function pbkdf2(code: string, saltHex: string, iter: number) {
  const key = await crypto.subtle.importKey('raw', enc.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: unhex(saltHex), iterations: iter }, key, 256);
  return hex(bits);
}

export function randomSalt() {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return hex(b.buffer);
}

/** Vaqt bo‘yicha teng solishtirish */
export function same(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
