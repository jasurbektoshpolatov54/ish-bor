// Rus tili: tayyor DOM va tizim oynalaridagi o‘zbekcha (lotin) matnni ruschaga almashtiradi.
// Lug‘at ru-dict.ts da; topilmagan matn o‘zgarmay qoladi (sinovda window.__ruMiss ga yoziladi).
import { RU, RU_T, RU_P } from './ru-dict';

let places: Record<string, string> = {};
/** Tuman/shahar va viloyat nomlari (ma’lumotlar bazasidan) */
export const setRuPlaces = (m: Record<string, string>) => { places = m; };

const NUM = /\d+(?:[  ]\d{3})*(?:[.,]\d+)?/g;
const miss = (s: string) => { const w = globalThis as { __ruMiss?: Set<string> }; w.__ruMiss?.add(s); };

function one(s: string): string | undefined {
  if (RU[s] != null) return RU[s];
  if (places[s] != null) return places[s];
  const nums: string[] = [];
  const key = s.replace(NUM, (m) => { nums.push(m); return '#'; });
  if (nums.length && RU_T[key] != null) { let i = 0; return RU_T[key].replace(/#/g, () => nums[i++]); }
  for (const [re, f] of RU_P) { const m = s.match(re); if (m) { const r = f(m, tr); if (r != null) return r; } }
  return undefined;
}

/** Bitta matn bo‘lagi. Topilmasa — “ · ”, “, ” bo‘yicha bo‘lib ko‘radi. */
export function tr(s: string): string {
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/)!;
  const body = m[2];
  if (!body || !/[A-Za-z]/.test(body) || /^[A-Z]$/.test(body)) return s;
  let r = one(body);
  if (r == null) {
    for (const sep of [' · ', ' — ', ': ', ', ', ' / ']) {
      if (!body.includes(sep)) continue;
      const parts = body.split(sep);
      const out = parts.map((p) => (/[A-Za-z]/.test(p) ? one(p) ?? trInner(p) : p));
      if (out.every((x) => x != null)) { r = out.join(sep); break; }
    }
  }
  if (r == null) { miss(body); return s; }
  return m[1] + r + m[3];
}
const trInner = (p: string) => { const r = tr(p); return r === p && /[A-Za-z]/.test(p) && !/^[A-Z0-9-]+$/.test(p) ? undefined : r; };

export const toRuText = tr;

export function toRuDom(root: Element) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const ns: Text[] = [];
  let nd: Node | null;
  while ((nd = tw.nextNode())) ns.push(nd as Text);
  for (const t of ns) {
    const p = t.parentElement;
    if (!p || p.closest('script,style,[data-raw]')) continue;
    const v = t.nodeValue || '';
    if (v === 'Lotin' || v === 'Кирилл' || v === 'Русский') continue;
    if (/^[A-Z]$/.test(v) && p.closest('.tile')) continue;
    t.nodeValue = tr(v);
  }
  root.querySelectorAll<HTMLElement>('[placeholder]').forEach((el) => {
    if (!el.closest('[data-raw]')) el.setAttribute('placeholder', tr(el.getAttribute('placeholder') || ''));
  });
}
