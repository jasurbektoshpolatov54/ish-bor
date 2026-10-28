// Lotindan kirillga o‘girish: design/html/cyr.js qoidalari bilan bir xil.
const M: Record<string, string> = { _: '_', a: 'а', b: 'б', d: 'д', f: 'ф', g: 'г', h: 'ҳ', i: 'и', j: 'ж', k: 'к', l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', q: 'қ', r: 'р', s: 'с', t: 'т', u: 'у', v: 'в', x: 'х', y: 'й', z: 'з', c: 'с', w: 'в' };
const V = 'aeiouAEIOUаеиоуўэяёюАЕИОУЎЭЯЁЮ';
const BR = ['Payme', 'Click', 'Uzum', 'Bank', 'Paynet', 'Multicard', 'Excel', 'PaymeGo', 'ClickPass'];

export function word(w: string): string {
  if (/^[A-Z]{2,}$/.test(w) || w.includes('@') || BR.includes(w)) return w;
  if (w === 'km') return 'км';
  let o = '';
  for (let i = 0; i < w.length; i++) {
    const c = w[i], n = w[i + 1] || '', L = c.toLowerCase(), up = c !== L;
    const U = (x: string) => (up ? x.toUpperCase() : x);
    const apo = /[‘ʻ'`]/.test(n);
    if ((L === 'o' || L === 'g') && apo) { o += U(L === 'o' ? 'ў' : 'ғ'); i++; continue; }
    if (L === 's' && n.toLowerCase() === 'h') { o += U('ш'); i++; continue; }
    if (L === 'c' && n.toLowerCase() === 'h') { o += U('ч'); i++; continue; }
    if (L === 'y' && n && 'aoue'.includes(n.toLowerCase()) && !/[‘ʻ'`]/.test(w[i + 2] || '')) {
      const m = ({ a: 'я', o: 'ё', u: 'ю', e: 'е' } as Record<string, string>)[n.toLowerCase()];
      o += U(m); i++; continue;
    }
    if (L === 'e') { const prev = o[o.length - 1]; o += U(!prev || V.includes(prev) ? 'э' : 'е'); continue; }
    if (c === '’') { o += 'ъ'; continue; }
    o += M[L] ? U(M[L]) : c;
  }
  return o;
}

export const toCyrText = (s: string) => s.replace(/[A-Za-z][A-Za-z‘ʻ’'`]*/g, word);

/** Tayyor DOM ichidagi matnni kirillga o‘giradi (cyr.js toCyr bilan bir xil, data-raw ichidagi matndan tashqari). */
export function toCyrDom(root: Element) {
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const ns: Text[] = [];
  let nd: Node | null;
  while ((nd = tw.nextNode())) ns.push(nd as Text);
  for (const t of ns) {
    const p = t.parentElement;
    if (!p || p.closest('script,style,[data-raw]')) continue;
    if (t.nodeValue === 'Lotin' || t.nodeValue === 'Кирилл') continue;
    if (/^[A-Z]$/.test(t.nodeValue || '') && p.closest('.tile')) continue;
    t.nodeValue = toCyrText(t.nodeValue || '');
  }
  root.querySelectorAll<HTMLElement>('[placeholder]').forEach((el) => {
    if (!el.closest('[data-raw]')) el.setAttribute('placeholder', toCyrText(el.getAttribute('placeholder') || ''));
  });
}
