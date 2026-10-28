// Dizayn yordamchilari: design/html/*.html dagi funksiyalar bilan bir xil belgi (HTML) chiqaradi.
// Farqi faqat bosiladigan joylarga qo‘shilgan data-a / data-v atributlari (ular ko‘rinishga ta’sir qilmaydi).
import { I, IF } from './icons';

export { I, IF };

export const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** data-a="..." data-v="..." */
export const A = (a?: string, v?: string | number) =>
  a ? ` data-a="${a}"${v !== undefined && v !== '' ? ` data-v="${esc(v)}"` : ''}` : '';

/** Foydalanuvchi yozgan matn: kirillga o‘girilmaydi */
export const raw = (s: string) => `<span data-raw>${esc(s)}</span>`;

export const bg = '<div class="glow"></div><div class="pat"></div>';

export const hdr = (t: string, act?: string, back = 'back') =>
  `<div class="hdr"><div class="back"${A(back)}>${I('back', 2.2)}</div>${t}${act ? `<div class="act">${act}</div>` : ''}</div>`;

export const row = (ic: string, t: string, v?: string, s?: string, a?: string, av?: string | number) =>
  `<div class="row"${A(a, av)}><div class="tile">${I(ic)}</div><div class="rt"><b>${t}</b>${s ? `<small>${s}</small>` : ''}</div><div class="rv">${v || ''}</div></div>`;

export const rings = (inner: string, badge: string, cls?: string) =>
  `<div class="rings"><i style="width:68px;height:68px;border-color:rgba(47,125,246,.0)"></i><i style="width:96px;height:96px"></i><i style="width:128px;height:128px;opacity:.75"></i><i style="width:162px;height:162px;opacity:.5"></i><div class="av ${cls || ''}">${inner}${badge ? `<span class="badge">${badge}</span>` : ''}</div></div>`;

export const nav = (on: string) => `<div class="spacer"></div><div class="nav">
 <a class="${on == 'h' ? 'on' : ''}"${A('nav', 'home')}>${I('home')}Bosh sahifa</a>
 <a class="${on == 'e' ? 'on' : ''}"${A('nav', 'list')}>${I('grid')}E’lonlar</a>
 <div class="plus"${A('nav', 'post')}>${I('plus')}</div>
 <a class="${on == 'p' ? 'on' : ''}"${A('nav', 'profile')}>${I('user')}Profil</a></div>`;

export interface LcData {
  ic: string; t: string; loc: string; p: string; u: string; top?: boolean;
  tags?: [string, string?][]; tm: string; a?: string; v?: string | number;
}
export const lc = (o: LcData) => `<div class="lc ${o.top ? 'top' : ''}"${A(o.a, o.v)}><div class="t"><div class="tile">${I(o.ic)}</div><div class="tt"><b>${o.t}</b><small>${I('pin')}${o.loc}</small></div><div class="pr"><b>${o.p}</b><small>${o.u}</small></div></div>
 <div class="bt">${o.top ? `<span class="tag blue">${IF('bolt')}TOP</span>` : ''}${(o.tags || []).map((x) => `<span class="tag ${x[1] || ''}">${x[0]}</span>`).join('')}<span class="tm">${o.tm}</span></div></div>`;

export const empty = (ic: string, t: string, s: string) =>
  `<div class="card"><div style="padding:30px 20px 26px;text-align:center"><div class="tile" style="width:52px;height:52px;border-radius:15px;margin:0 auto">${I(ic)}</div><div style="font-size:16px;font-weight:600;margin-top:14px">${t}</div><div class="note" style="padding:0;margin-top:5px">${s}</div></div></div>`;

export const pb = (t: string, c?: string, ic?: string, a?: string, v?: string | number) =>
  `<span class="pbtn ${c || ''}"${A(a, v)}>${ic ? I(ic) : ''}${t}</span>`;

export const off = 'style="opacity:.45;box-shadow:none"';
/** Faol emas tugma uchun atribut */
export const offIf = (cond: boolean) => (cond ? ' ' + off : '');

export const dim = (h: string) => `<div class="dimw" style="opacity:.3"${A('close')}>${h}</div>`;
export const sheet = (h: string) => `<div class="sheet"><div class="grab"${A('close')}></div>${h}<div style="height:22px"></div></div>`;
export const sh = (t: string) => `<div style="font-size:19px;font-weight:700;letter-spacing:-.4px;padding:14px 22px 4px">${t}</div>`;
export const minty = `" style="background:radial-gradient(circle at 35% 30%,#b9ffd9,#3fcf8e 75%);color:#0c3a25;box-shadow:0 0 0 4px rgba(126,234,181,.45),0 0 0 7px rgba(126,234,181,.15),0 0 40px rgba(126,234,181,.55)`;
export const kp = `<div class="keys">${['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', '⌫'].map((k) => `<span${A('key', k)}>${k}</span>`).join('')}</div>`;

export const lock = (t = '10:00') => `<span class="lockchip">${I('shield')}<span data-clock>${t}</span></span>`;
export const ah = (t: string, clock?: string) => hdr(t, lock(clock));
export const xhdr = (t: string, act?: string, clock?: string, close = 'aexit') =>
  `<div class="hdr"><div class="back"${A(close)}>${I('plus', 2.2).replace('<svg', '<svg style="transform:rotate(45deg)"')}</div>${t}<div class="act">${act || lock(clock)}</div></div>`;
export const anav = (on: string) =>
  `<div class="spacer"></div><div class="nav anav">${[['b', 'home', 'Bugun'], ['n', 'bell', 'Navbat'], ['o', 'users', 'Odamlar'], ['p', 'wallet', 'Pul'], ['y', 'filter', 'Yana']]
    .map(([k, ic, t]) => (k === on ? `<a class="pill"${A('anav', k)}>${I(ic)}${t}</a>` : `<a${A('anav', k)}>${I(ic)}</a>`)).join('')}</div>`;

export const bub = (t: string, btns?: string[]) =>
  `<div style="margin:0 50px 10px 16px;background:var(--card);border:1px solid var(--line);border-radius:18px 18px 18px 6px;padding:11px 14px;font-size:14.5px;line-height:1.45">${t}</div>${btns ? `<div style="display:flex;gap:6px;margin:-4px 50px 14px 16px">${btns.map((b) => `<span style="flex:1;height:38px;border-radius:12px;background:var(--tile);color:var(--tileic);display:flex;align-items:center;justify-content:center;font-size:13.5px;font-weight:600">${b}</span>`).join('')}</div>` : ''}`;

export const sw = (on: boolean, a?: string, v?: string | number) => `<div class="sw${on ? '' : ' off'}"${A(a, v)}></div>`;
export const radio = (on: boolean) => `<div class="radio${on ? ' on' : ''}"></div>`;
export const chip = (t: string, on: boolean, a?: string, v?: string | number, style = '') =>
  `<span class="chip${on ? ' on' : ''}"${A(a, v)}${style ? ` style="${style}"` : ''}>${t}</span>`;
export const seg = (items: [string, boolean, string?, (string | number)?][], style = '') =>
  `<div class="seg"${style ? ` style="${style}"` : ''}>${items.map(([t, on, a, v]) => `<span${on ? ' class="on"' : ''}${A(a, v)}>${t}</span>`).join('')}</div>`;
export const sel = (small: string, big: string, on: boolean, a?: string, v?: string | number, bstyle = '') =>
  `<div class="sel${on ? ' on' : ''}"${A(a, v)}><small>${small}</small><b${bstyle ? ` style="${bstyle}"` : ''}>${big}</b></div>`;
export const tile = (l: string) => `<div class="tile" style="font-weight:700;font-size:16px">${l}</div>`;
