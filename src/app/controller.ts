// Ilova boshqaruvi: oynalar o‘rtasidagi o‘tishlar (4.1), har bir tugma (3.x), Nazorat (6.x), sinov (13.x).
import morphdom from 'morphdom';
import { App } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import type { Listing, User, Kind, PayType, ForWhom, Gender } from '../core/types';
import * as U from '../views/user';
import * as AD from '../views/admin';
import { bg, row, I, esc, raw, lc, A } from '../ui/kit';
import { toCyrDom } from '../ui/cyr';
import { toRuDom, setRuPlaces } from '../ui/ru';
import * as N from './native';
import { db, load, save, flush, now, uid, me, owner, userById, listingById, isAdminPhone, audit, note, outbox, myListings, replace, TEST_BUILD, ADMIN, ensureAdmin } from './store';
import { REGIONS } from '../core/places';
import { freshDB, PAY_APPS, RADII, TRAITS, REASONS, REJECT_REASONS, JOB_TYPES } from '../core/seed';
import { search, title, jobIcon, jobName, isTop, suspicious, complaintTrigger, closeAt, pauseTop, resumeTop, extendTop, genderLabel, nearestDistrict, keepStep, norm, personTitle, isPublic, codeRules } from '../core/rules';
import { money, dayStart, DAY_MS, hhmm, weekday, dmy, normPhone, maskPhone, fullDate, ago } from '../core/format';
import { pbkdf2, randomSalt, same } from '../core/crypto';
import { lcFor, lcMine, payText, haqLabel, letter, payOn, radiusSub, traitTags, jobsLong, statusTags, whenText, daysText, locText } from './vm';
import * as XLSX from 'xlsx';

type Scr = { n: string; p?: any };
let stack: Scr[] = [{ n: 'home' }];
let sheetS: Scr | null = null;
const cur = () => stack[stack.length - 1];
const ui: Record<string, any> = { q: '', listKind: 'bor', homeKind: 'bor', fjobs: [] as string[], fgender: 'farqi', open: [] as number[], mic: false, page: 1 };
let adminLast = 0;
let adminIn = false;
let root: HTMLElement;
let lastBack = 0;

/* ---------- Qoralama (forma) ---------- */
interface BorDraft { job?: string; izoh: string; district?: string; lat?: number; lng?: number; radius?: number; when?: number; people: number; kim?: ForWhom; payType?: PayType; kun?: number; soat?: number; phone: boolean }
interface KerakDraft { jobs: string[]; any: boolean; days: number[]; district?: string; lat?: number; lng?: number; radius?: number; pay?: number; gender?: Gender; traits: number[]; extra: string; voice?: string; voiceSec?: number; phone: boolean }
interface Draft { kind: Kind; bor: BorDraft; kerak: KerakDraft }
const newDraft = (k: Kind = 'bor'): Draft => ({ kind: k, bor: { izoh: '', people: 1, phone: false }, kerak: { jobs: [], any: false, days: [], traits: [], extra: '', phone: false } });
function draft(): Draft {
  const u = me()!;
  if (!db.drafts[u.id]) db.drafts[u.id] = newDraft(u.lastKind || 'bor');
  return db.drafts[u.id] as Draft;
}

/* ---------- Yordamchilar ---------- */
const go = (n: string, p?: any) => { stack.push({ n, p }); sheetS = null; render(true); };
const swap = (n: string, p?: any) => { stack[stack.length - 1] = { n, p }; sheetS = null; render(true); };
const reset = (n: string, p?: any) => { stack = [{ n, p }]; sheetS = null; render(true); };
const openSheet = (n: string, p?: any) => { sheetS = { n, p }; render(); };
const closeSheet = () => { const r = pickResolve; pickResolve = null; sheetS = sheetS?.n === 'pick' ? sheetS.p.prev || null : null; render(); r?.(-1); };
/** Ro‘yxatdan tanlash ilovaning o‘z oynasida (orqaga tugmasi bilan yopiladi). Tanlanmasa -1. */
let pickResolve: ((i: number) => void) | null = null;
function choose(title: string, options: string[], icon = 'chev'): Promise<number> {
  pickResolve?.(-1);
  return new Promise((res) => { pickResolve = res; sheetS = { n: 'pick', p: { title, options, icon, prev: sheetS?.n === 'pick' ? sheetS.p.prev : sheetS } }; render(); });
}
function back() {
  if (sheetS) return closeSheet();
  if (cur().n === 'region' && cur().p.vil && !cur().p.q) { cur().p.vil = undefined; return render(); }
  if (stack.length > 1) { const top = stack.pop()!; if (top.n === 'aLogin') ui.acode = ''; render(true); return; }
  const t = Date.now();
  if (t - lastBack < 1500) { void App.exitApp(); return; }
  lastBack = t;
  if (cur().n !== 'home' && !cur().n.startsWith('a')) reset('home');
}
let ruMap: Record<string, string> | undefined, ruLen = 0;
const ruPlaces = () => {
  if (!ruMap || ruLen !== db.districts.length) { ruMap = {}; ruLen = db.districts.length; for (const d of db.districts) if (d.ru) ruMap[d.name] = d.ru; for (const r of REGIONS) ruMap[r.name] = r.ru; }
  return ruMap;
};
const vilOf = (n?: string) => db.districts.find((d) => d.name === n)?.region;
const usernameless = (u?: User) => !u?.username;
const phoneLocked = () => usernameless(me());
const flash = (sel: string) => {
  const el = root.querySelector(sel) as HTMLElement | null;
  if (!el) return;
  el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash');
  el.scrollIntoView({ block: 'center', behavior: 'smooth' });
};
const themeName = (t: string) => (t === 'light' ? 'Yorug‘' : t === 'auto' ? autoName() : 'Qorong‘i');
const autoName = () => (N.native ? 'Telefondagidek' : 'Telegramdagidek');

/* ---------- Ko‘rinish ---------- */
function screenHtml(s: Scr): string {
  const u = me();
  const t = now();
  switch (s.n) {
    case 'home': {
      const near = search(db, u, { kind: ui.homeKind }, t).slice(0, 3).map((l) => lcFor(l, u, 'home'));
      return U.home({ letter: letter(u), name: u?.name, kind: ui.homeKind, cntBor: money(count('bor')), cntKerak: money(count('kerak')), near });
    }
    case 'list': {
      const kind = ui.listKind as Kind;
      const f = { jobs: ui.fjobs, gender: ui.fgender, q: ui.q };
      const all = search(db, u, { kind, ...f }, t);
      const cnt = (k: Kind) => money(search(db, u, { kind: k, ...f }, t).length);
      const names = ui.fjobs.map((j: string) => jobName(db, j));
      return U.list({
        kind, cntBor: cnt('bor'), cntKerak: cnt('kerak'), q: esc(ui.q), mic: ui.mic,
        loc: u?.district && u.radius != null ? [`${u.district} · ${RADII[u.radius]}`, true] : ['Hudud', false],
        job: names.length ? [names.length > 1 ? `${names[0]} +${names.length - 1}` : names[0], true] : ['Ish turi', false],
        gender: ui.fgender !== 'farqi' ? [genderLabel(ui.fgender), true] : ['Erkak / Ayol', false],
        items: all.slice(0, ui.page * 20).map((l) => lcFor(l, u, 'list')),
      });
    }
    case 'bor': {
      const l = listingById(s.p)!;
      const o = userById(l.owner);
      const showPhone = (l.showPhone || usernameless(o)) && !!o?.phone;
      const d = locText(l, u).split(' · ')[1];
      return U.borDetail({
        icon: jobIcon(db, l.jobs[0]), title: title(db, l), haqL: haqLabel(l), haq: payText(l), kishi: `${l.people} ta`, kim: genderLabel(l.forWhom),
        when: whenText(l), addr: l.district, addrSub: d ? `Xaritada ko‘rish · ${d}` : 'Xaritada ko‘rish', izoh: l.izoh ? raw(l.izoh) : undefined,
        poster: { av: letter(o) || I('user'), name: personTitle(o), sub: showPhone ? `Ish beruvchi · ${db.listings.filter((x) => x.owner === l.owner && x.kind === 'bor' && x.status !== 'ochirilgan').length} ta e’lon` : 'Ish beruvchi · raqam yashirilgan', badge: o?.verified },
        call: showPhone, tg: !!o?.username, complained: complainedBy(l, u), closed: !isPublic(db, l, t),
      });
    }
    case 'kerak': {
      const l = listingById(s.p)!;
      const o = userById(l.owner);
      const showPhone = (l.showPhone || usernameless(o)) && !!o?.phone;
      return U.kerakDetail({
        letter: letter(o), name: personTitle(o) && o?.surname ? `${o.name} ${o.surname}` : o?.name || '', jobs: jobsLong(l), busy: !!l.busy, haq: payText(l), jinsi: genderLabel(l.gender),
        district: l.district, days: daysText(l), traits: traitTags(l), extra: l.extra ? raw(l.extra) : undefined, voice: l.voice ? `${l.voice}` : undefined,
        call: showPhone, tg: !!o?.username, complained: complainedBy(l, u),
      });
    }
    case 'post': return U.post(postVM());
    case 'done': {
      const l = listingById(s.p)!;
      return U.done({ kind: l.kind, icon: l.kind === 'bor' ? jobIcon(db, l.jobs[0]) : 'user', title: title(db, l), pay: payText(l), whenL: l.kind === 'bor' ? 'Qachon' : 'Bo‘sh kunlari', when: l.kind === 'bor' ? whenText(l) : daysText(l) });
    }
    case 'profile': {
      const sub = u?.username ? `@${u.username}${u.district ? ' · ' + u.district : ''}` : u?.district || 'Hudud tanlanmagan';
      return U.profile({ letter: letter(u), name: u?.name || 'Telegram ismingiz', sub, mine: u ? myListings(u).map(lcMine) : [], script: u?.script || 'lat', theme: themeName(u?.theme || 'dark'), admin: isAdminPhone(u) });
    }
    case 'tarif': {
      const l = listingById(s.p)!;
      const left = isTop(l, t) ? leftText(l.topUntil! - t) : undefined;
      return U.tarif({ price: money(db.settings.topPrice), days: db.settings.topDays, left });
    }
    case 'complain': {
      const l = listingById(s.p.id)!;
      const ex = s.p.voice ? `Ovoz 0:${String(s.p.voiceSec || 0).padStart(2, '0')}` : s.p.note ? 'Yozildi' : 'Ixtiyoriy';
      return U.complain({ about: l.kind === 'bor' ? `“${title(db, l)}” e’loni` : `${title(db, l)} haqida`, reason: s.p.reason, extra: ex, done: complainedBy(l, u) });
    }
    case 'thanks': return U.thanks();
    case 'region': {
      const r = s.p;
      const q = norm(r.q || '');
      const ds = db.districts.filter((d) => d.enabled && (q ? norm(d.name).includes(q) || (!!d.ru && norm(d.ru).includes(q)) : d.region === r.vil)).sort((a, b) => a.name.localeCompare(b.name, 'uz'));
      const regName = (id?: string) => REGIONS.find((x) => x.id === id)?.name || 'Boshqa';
      // Tuman tanlangach ro‘yxat yig‘iladi: faqat tanlangan tuman qoladi, masofa va “Tanlash” ko‘rinib turadi.
      const fold = !q && !!r.vil && r.fold !== false && ds.some((d) => d.name === r.district);
      if (fold) ds.splice(0, ds.length, ...ds.filter((d) => d.name === r.district));
      const regions = !q && !r.vil ? REGIONS.filter((g) => db.districts.some((d) => d.enabled && d.region === g.id)).map((g) => [g.id, g.name] as [string, string]) : undefined;
      return U.region({ q: esc(r.q || ''), regions, vil: !q && r.vil ? regName(r.vil) : undefined, districts: ds.map((d) => [d.name, r.district === d.name, q ? regName(d.region) : undefined]), radius: r.radius, denied: r.denied, ready: !!r.district && r.radius != null, fold });
    }
    case 'mybor': {
      const l = listingById(s.p)!;
      const st = statusTags(l).map(([x, c]) => `<span class="tag ${c || ''}">${x === 'Faol' ? 'Faol · qidiruvda ko‘rinadi' : x}</span>`);
      if (isTop(l, t)) st.push(`<span class="tag blue">${I('bolt')}TOP · ${Math.ceil((l.topUntil! - t) / DAY_MS)} kun</span>`);
      return U.myBor({ icon: jobIcon(db, l.jobs[0]), title: title(db, l), status: st, haqL: haqLabel(l), haq: payText(l), kishi: `${l.people} ta`, kim: genderLabel(l.forWhom), when: whenText(l), addr: l.district, addrSub: radiusSub(l), closed: l.status === 'yopilgan' || l.status === 'rad_etilgan', topOn: isTop(l, t), payOn: payOn() });
    }
    case 'mykerak': {
      const l = listingById(s.p)!;
      const o = userById(l.owner);
      const e = kedit(l);
      const shown = { ...l, ...e } as Listing;
      const st = statusTags(shown).filter(([x]) => x !== 'Faol').map(([x, c]) => `<span class="tag ${c || ''}">${x}</span>`);
      if (isTop(l, t)) st.push(`<span class="tag blue">${I('bolt')}TOP · ${Math.ceil((l.topUntil! - t) / DAY_MS)} kun</span>`);
      return U.myKerak({ letter: letter(o), name: o?.surname ? `${o.name} ${o.surname}` : o?.name || '', jobs: jobsLong(l), status: st, busy: !!e.busy, district: e.district, radius: radiusSub(shown), days: daysText(shown), closed: l.status === 'yopilgan' || l.status === 'rad_etilgan', topOn: isTop(l, t), payOn: payOn() });
    }
    case 'pay': {
      const l = listingById(s.p.id)!;
      return U.pay({ icon: l.kind === 'bor' ? jobIcon(db, l.jobs[0]) : 'user', title: title(db, l), days: db.settings.topDays, price: money(db.settings.topPrice), apps: PAY_APPS, app: s.p.app, state: s.p.state });
    }
    case 'paid': {
      const l = listingById(s.p.id)!;
      return U.paid({ icon: l.kind === 'bor' ? jobIcon(db, l.jobs[0]) : 'user', title: title(db, l), until: dmy(l.topUntil || t), price: money(s.p.amount || db.settings.topPrice) });
    }
    case 'help': return U.help(ui.open);
    case 'blocked': return U.blocked();
    case 'maint': return U.maintenance();
    default: return adminHtml(s);
  }
}

/** “Mening e’lonim · Ish kerak”dagi o‘zgarishlar “Saqlash” bosilguncha shu yerda turadi */
function kedit(l: Listing) {
  if (!ui.kedit || ui.kedit.id !== l.id) ui.kedit = { id: l.id, busy: !!l.busy, district: l.district, lat: l.lat, lng: l.lng, radius: l.radius, days: [...l.days] };
  return ui.kedit as { id: string; busy: boolean; district: string; lat: number; lng: number; radius: number; days: number[] };
}
const count = (k: Kind) => db.listings.filter((l) => l.kind === k && isPublic(db, l, now())).length;
const complainedBy = (l: Listing, u?: User) => !!u && db.complaints.some((c) => c.listingId === l.id && c.by === u.id);
const leftText = (ms: number) => (ms < DAY_MS ? 'bugun tugaydi' : `${Math.ceil(ms / DAY_MS)} kun qoldi`);

function postVM(): U.PostVM {
  const d = draft();
  const lockP = phoneLocked();
  if (d.kind === 'bor') {
    const b = d.bor;
    const ready = !!b.job && !!b.district && b.radius != null && !!b.when && !!b.kim && !!b.payType && (b.payType === 'kelishiladi' || !!(b.payType === 'kun' ? b.kun : b.soat));
    return {
      kind: 'bor', jobs: activeJobs().map((j) => ({ ...j, on: b.job === j.id })), izoh: esc(b.izoh),
      addr: b.district || 'Tanlang', addrSub: b.district && b.radius != null ? (b.radius === 4 ? 'Ishchilar istalgan joydan' : `Ishchilar ${RADII[b.radius].split('–').pop()}`.replace(' km', ' km gacha')) : undefined,
      when: b.when ? whenText({ when: b.when } as Listing) : 'Tanlang', people: b.people, kim: b.kim ? genderLabel(b.kim) : undefined,
      pay: { kun: b.kun ? money(b.kun) : '—', soat: b.soat ? money(b.soat) : '—', type: b.payType }, phone: b.phone || lockP, phoneLocked: lockP, ready,
    };
  }
  const k = d.kerak;
  const ready = (k.any || k.jobs.length > 0) && !!k.district && k.radius != null && !!k.pay && !!k.gender;
  return {
    kind: 'kerak', jobs: activeJobs().map((j) => ({ ...j, on: !k.any && k.jobs.includes(j.id) })), anyJob: k.any,
    days: [0, 1, 2, 3, 4, 5, 6].map((i) => k.days.includes(i)),
    addr: k.district || 'Tanlang', addrSub: k.district && k.radius != null ? (k.radius === 4 ? 'Uzoqqa ham boraman' : `${RADII[k.radius]} ichida ishlayman`) : undefined,
    payDay: k.pay ? money(k.pay) : 'Kiriting', gender: k.gender ? genderLabel(k.gender) : undefined,
    traits: TRAITS.map((t, i) => [t, k.traits.includes(i)]), extra: k.voice ? `Ovoz 0:${String(k.voiceSec || 0).padStart(2, '0')}` : k.extra ? 'Yozildi' : 'Ixtiyoriy',
    phone: k.phone || lockP, phoneLocked: lockP, ready,
  };
}
const activeJobs = () => db.jobTypes.filter((j) => !j.hidden);

function sheetHtml(under: string, s: Scr): string {
  const p = s.p || {};
  switch (s.n) {
    case 'when': {
      const t = now();
      const day = p.day;
      const base = day === 'Bugun' ? dayStart(t) : day === 'Ertaga' ? dayStart(t) + DAY_MS : day === 'Indinga' ? dayStart(t) + 2 * DAY_MS : p.other;
      const past = day === 'Bugun' ? ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00'].filter((h) => dayStart(t) + hm(h) <= t) : [];
      return U.whenSheet(under, { day, other: p.other ? dmy(p.other) : undefined, hour: p.hour, past, ready: !!base && !!p.hour && !past.includes(p.hour) });
    }
    case 'amount': {
      const quick = p.kind === 'soat' ? ['20 000', '30 000', '40 000', '50 000', '60 000'] : ['100 000', '150 000', '200 000', '250 000', '300 000'];
      return U.amountSheet(under, { title: p.kind === 'soat' ? 'Soatlik haq' : 'Mehnat haqqi', amount: money(Number(p.v || 0)), quick });
    }
    case 'extra': return U.extraSheet(under, { text: esc(p.text || ''), count: (p.text || '').length, mic: N.canRecord(), rec: p.rec, voice: p.voice ? `0:${String(p.voiceSec || 0).padStart(2, '0')}` : undefined, ready: !!(p.text || '').trim() || !!p.voice });
    case 'theme': return U.themeSheet(under, p.v, autoName());
    case 'fjob': return U.jobSheet(under, activeJobs().map((j) => ({ ...j, on: (p.v as string[]).includes(j.id) })));
    case 'fgender': return U.genderSheet(under, p.v);
    case 'kdays': return U.daysSheet(under, [0, 1, 2, 3, 4, 5, 6].map((i) => (p.v as number[]).includes(i)));
    case 'pick': return U.pickSheet(under, esc(p.title), p.options.map((o: string) => esc(o)), p.icon);
  }
  return under;
}
const hm = (h: string) => (Number(h.slice(0, 2)) * 60 + Number(h.slice(3))) * 60e3;

/* ---------- Nazorat ko‘rinishi ---------- */
function clock() {
  const left = Math.max(0, db.settings.sessionMin * 60e3 - (Date.now() - adminLast));
  return `${String(Math.floor(left / 60e3)).padStart(2, '0')}:${String(Math.floor((left % 60e3) / 1000)).padStart(2, '0')}`;
}

interface QEntry { id: string; type: 1 | 2 | 3 | 4; tag: [string, string]; title: string; sub: string; at: number }
function queueItems(): QEntry[] {
  const t = now();
  const out: QEntry[] = [];
  const byL = new Map<string, typeof db.complaints>();
  for (const c of db.complaints.filter((c) => !c.resolved)) { if (!byL.has(c.listingId)) byL.set(c.listingId, []); byL.get(c.listingId)!.push(c); }
  for (const [lid, cs] of byL) {
    const l = listingById(lid);
    if (!l) continue;
    const serious = complaintTrigger(db, lid);
    out.push({ id: 'c:' + lid, type: 1, tag: serious ? ['Jiddiy', 'red'] : ['Shikoyat', ''], title: REASONS[cs[0].reason], sub: `${esc(title(db, l))} · ${l.district}`, at: cs[0].at });
  }
  for (const p of db.payments.filter((p) => p.status === 'kutilmoqda' && t - p.at > 60e3)) out.push({ id: 'p:' + p.id, type: 2, tag: ['To‘lov · 60 s o‘tdi', 'blue2'], title: p.order, sub: `${money(p.amount)} so‘m · ${appName(p.app)}`, at: p.at });
  for (const l of db.listings.filter((l) => l.status === 'tekshirilmoqda' && l.reviewReason === 'shubhali')) out.push({ id: 'l:' + l.id, type: 3, tag: ['Shubhali e’lon', ''], title: esc(title(db, l)), sub: l.district, at: l.createdAt });
  for (const m of db.support.filter((m) => !m.answered)) out.push({ id: 's:' + m.id, type: 4, tag: ['Savol', 'blue2'], title: esc(m.text.slice(0, 40)), sub: esc(userById(m.userId)?.name || ''), at: m.at });
  return out.sort((a, b) => b.at - a.at);
}
const appName = (id: string) => PAY_APPS.find((a) => a[2] === id)?.[1] || id;

function adminHtml(s: Scr): string {
  const c = clock();
  const t = now();
  switch (s.n) {
    case 'aLogin': {
      const a = db.admin;
      const locked = a?.lockUntil && a.lockUntil > t ? mmss(a.lockUntil - t) : undefined;
      return AD.login({ script: me()?.script === 'cyr' ? 'Кирилл' : me()?.script === 'ru' ? 'Русский' : 'Lotin', theme: themeName(me()?.theme || 'dark'), filled: (ui.acode || '').length, left: Math.max(0, db.settings.maxAttempts - (a?.fails || 0)), locked, err: ui.aerr });
    }
    case 'aB': {
      const ds = dayStart(t);
      const q = queueItems();
      const newToday = db.listings.filter((l) => l.createdAt >= ds);
      const usersToday = db.users.filter((u) => u.createdAt >= ds).length;
      const usersY = db.users.filter((u) => u.createdAt >= ds - DAY_MS && u.createdAt < ds).length;
      const activeU = db.users.filter((u) => u.lastSeen && t - u.lastSeen < 15 * 60e3);
      const pays = db.payments.filter((p) => p.status === 'otdi' && p.at >= ds);
      const inc = pays.reduce((a, p) => a + p.amount, 0);
      const days = [6, 5, 4, 3, 2, 1, 0].map((i) => db.listings.filter((l) => l.createdAt >= ds - i * DAY_MS && l.createdAt < ds - (i - 1) * DAY_MS).length);
      const mx = Math.max(...days);
      const cnts = [q.filter((x) => x.type === 1).length, q.filter((x) => x.type === 2).length, q.filter((x) => x.type === 4).length];
      const topD = topDistrict(activeU);
      return AD.today({
        clock: c, problems: q.length, dateLine: db.users.length ? `${dmy(t)}, ${['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'][weekday(t)]}` : 'Hali hech kim yo‘q',
        waiting: String(q.length), waitingSub: q.length ? [`${cnts[0]} shikoyat`, `${cnts[1]} to‘lov`, `${cnts[2]} savol`].join(' · ') : 'Hech narsa kutmayapti',
        newL: String(newToday.length), newSub: `Ish bor ${newToday.filter((l) => l.kind === 'bor').length} · Ish kerak ${newToday.filter((l) => l.kind === 'kerak').length}`,
        found: String(db.listings.filter((l) => l.status === 'yopilgan' && (l.closedAt || 0) >= ds).length),
        users: String(usersToday), usersSub: usersToday || usersY ? `${usersToday - usersY >= 0 ? '+' : ''}${usersToday - usersY} kechaga nisbatan` : '—',
        active: String(activeU.length), activeSub: topD || '—',
        income: money(inc), incomeBar: inc ? 100 : 0, incomeSub: pays.length ? `${pays.length} ta TOP · ${money(db.settings.topPrice)} so‘mdan` : 'Hali TOP yo‘q',
        bars: days.map((d) => (mx ? Math.max(4, Math.round((d / mx) * 64)) : 4)), barsToday: mx > 0, barsSub: mx ? `Bugun ${days[6]} ta` : 'Ma’lumot hali yo‘q',
      });
    }
    case 'aC': {
      const all = queueItems();
      const tab = ui.qtab || 0;
      const counts = [all.length, ...[1, 2, 3, 4].map((k) => all.filter((x) => x.type === k).length)];
      return AD.queue({ clock: c, total: all.length, counts, tab, items: all.filter((x) => tab === 0 || x.type === tab) });
    }
    case 'aH': return qDetailHtml(s.p, c);
    case 'aD': {
      const tab = ui.ptab || 0;
      const q = norm(ui.pq || '');
      const ds = dayStart(t) - 7 * DAY_MS;
      const users = db.users.filter((u) => {
        if (tab === 1 && u.createdAt < ds) return false;
        if (tab === 2 && !db.complaints.some((c2) => listingById(c2.listingId)?.owner === u.id)) return false;
        if (tab === 3 && !u.blocked) return false;
        if (tab === 4 && !db.listings.some((l) => l.owner === u.id && isTop(l, t))) return false;
        if (q && !norm(`${u.name} ${u.surname || ''} ${u.phone || ''} ${u.id}`).includes(q)) return false;
        return true;
      });
      const rows = users.map((u) => `<div class="row"${A('uopen', u.id)}><div class="tile">${letter(u) || I('user')}</div><div class="rt"><b>${esc(u.name)}${db.listings.some((l) => l.owner === u.id && isTop(l, t)) ? ' <span class="tag blue">TOP</span>' : ''}${u.blocked ? ' <span class="tag red">Bloklangan</span>' : ''}</b><small>${maskPhone(u.phone)} · ${u.district || '—'} · ${roleName(u)}</small></div><div class="rv">${I('chev')}</div></div>`).join('');
      return AD.people({ clock: c, q: ui.pq || '', tab, total: db.users.length, rows });
    }
    case 'aI': {
      const u = userById(s.p)!;
      const ls = db.listings.filter((l) => l.owner === u.id && l.status !== 'ochirilgan');
      const cs = db.complaints.filter((x) => listingById(x.listingId)?.owner === u.id && t - x.at < DAY_MS).length;
      const ps = db.payments.filter((p) => p.userId === u.id && p.status === 'otdi');
      const top = ls.find((l) => isTop(l, t));
      const rows = [
        row('brief', 'E’lonlari', `${ls.filter((l) => l.status === 'faol').length} / ${ls.length}`, undefined, 'ulist', u.id),
        row('flag', 'Shikoyatlar', String(cs), 'Oxirgi 24 soat'),
        row('check', 'Odam topdim', String(ls.filter((l) => l.status === 'yopilgan' && l.kind === 'bor').length)),
        row('bolt', 'TOP', top ? dmy(top.topUntil!) : '—'),
        row('wallet', 'To‘lovlar', `${ps.length} · ${money(ps.reduce((a, p) => a + p.amount, 0))}`, ps.length ? [...new Set(ps.map((p) => appName(p.app)))].join(', ') : 'Qaysi ilova orqali'),
        row('clock', 'Qachondan beri', dmy(u.createdAt), `Roli: ${roleName(u)}`),
        row('phone', 'Telefon', ui.showPhone === u.id ? (u.phone || '—') : 'Ko‘rsatish', undefined, 'ushowphone', u.id),
      ].join('\n');
      return AD.person({ clock: c, letter: letter(u) || I('user'), name: esc(u.name + (u.surname ? ' ' + u.surname : '')), phone: `${maskPhone(u.phone)} · ${u.district || '—'}`, id: u.id, rows, blocked: !!u.blocked, verified: !!u.verified });
    }
    case 'aE': {
      const ms = new Date(t + 5 * 3600e3); ms.setUTCDate(1); ms.setUTCHours(0, 0, 0, 0);
      const from = ms.getTime() - 5 * 3600e3;
      const month = db.payments.filter((p) => p.at >= from);
      const ok = month.filter((p) => p.status === 'otdi');
      const ref = month.filter((p) => p.status === 'qaytarildi');
      const byApp = PAY_APPS.map(([, n, id]) => [n, ok.filter((p) => p.app === id).length] as [string, number]).filter(([, k]) => k);
      const colors = ['var(--gold2)', 'var(--blue)', 'var(--mint2)', '#c58cff', 'var(--danger)'];
      const bar = byApp.length ? `<div style="padding:0 15px 13px"><div class="bar">${byApp.map(([, k], i) => `<i style="width:${(k / ok.length) * 100}%;background:${colors[i]}"></i>`).join('')}</div><div class="legend">${byApp.map(([n, k], i) => `<span><i style="background:${colors[i]}"></i>${n} ${k}</span>`).join('')}</div></div>` : '';
      const st: [string, string, string] = db.settings.paymentsOff ? ['To‘lovlar o‘chirilgan', 'O‘chiq', 'grey'] : ['Sinov rejimi · haqiqiy pul yechilmaydi', '● Ishlayapti', 'mint'];
      const rows = db.payments.slice(0, 30).map((p) => `<div class="row"${A('popen', p.id)}><div class="tile">${I('bolt')}</div><div class="rt"><b>TOP · ${p.days} kun${p.test ? ' <span class="tag grey">Sinov</span>' : ''}</b><small>${p.order} · ${appName(p.app)} · ${ago(p.at, t)}</small></div><div class="rv"><span style="color:var(--text);font-weight:600">${money(p.amount)}</span> ${payStatus(p.status, true)}</div></div>`).join('');
      return AD.money({ clock: c, total: money(ok.reduce((a, p) => a + p.amount, 0)), sub: `${['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'][ms.getUTCMonth()]} · ${ok.length} to‘lov · ${ref.length} qaytarish`, status: st, bar, rows });
    }
    case 'aJ': {
      const p = db.payments.find((x) => x.id === s.p)!;
      const u = userById(p.userId);
      return AD.payDetail({ clock: c, amount: money(p.amount), plan: `TOP · ${p.days} kun${p.test ? ' · Sinov' : ''}`, order: p.order, status: payStatus(p.status), app: appName(p.app), time: fullDate(p.at), user: esc(u?.name || '—'), userId: p.userId, canRefund: p.status === 'otdi' });
    }
    case 'aF': {
      const act = db.listings.filter((l) => isPublic(db, l, t));
      const tops = act.filter((l) => isTop(l, t));
      const lastAuto = db.auto[0];
      return AD.more({ clock: c, active: String(act.length), activeSub: `Ish bor ${act.filter((l) => l.kind === 'bor').length} · Ish kerak ${act.filter((l) => l.kind === 'kerak').length}`, tops: String(tops.length), topsSub: tops.length ? `${tops.length} ta e’lon ro‘yxat boshida` : '—', autoSub: lastAuto ? `${ago(lastAuto.at, t)} · ${lastAuto.rule}` : 'Hali amal yo‘q', price: `${money(db.settings.topPrice)} so‘m / ${db.settings.topDays} kun`, test: TEST_BUILD });
    }
    case 'aG': {
      const r = codeRules(ui.gnew || '');
      const ok = [r[0], r[1], !!ui.gnew && ui.gnew === ui.grep];
      return AD.code({ clock: c, ok, ready: ok.every(Boolean) && (ui.gcur || '').length === 12, err: ui.gerr });
    }
    case 'aK': return AD.words(c, db.words, !!ui.kword);
    case 'aL': {
      const n = broadcastTargets().length;
      return AD.broadcast({ clock: c, to: ui.lto || 'all', script: ui.lscr || 'both', count: n, ready: !!(ui.ltext || '').trim() && n > 0, district: ui.ldist, districts: db.districts.filter((d) => d.enabled).map((d) => d.name) });
    }
    case 'aM': return AD.price(c, ui.mprice ?? String(db.settings.topPrice), ui.mdays ?? String(db.settings.topDays), (ui.mprice != null && Number(ui.mprice) !== db.settings.topPrice) || (ui.mdays != null && Number(ui.mdays) !== db.settings.topDays));
    case 'aN': return AD.emergency(c, db.settings);
    case 'aO': {
      const tab = ui.otab || 0;
      const rows = db.logins.filter((l) => tab === 0 || !l.ok).slice(0, 50).map((l) => `<div class="row"><div class="tile">${I(l.ok ? 'check' : 'info')}</div><div class="rt"><b>${l.ok ? 'Kirdi' : 'Xato kod'}</b><small>${fullDate(l.at)} · ${l.device}</small></div></div>`).join('');
      return AD.logins(c, tab, rows);
    }
    case 'aP': {
      const rows = db.auto.slice(0, 50).map((a) => { const l = listingById(a.listingId); return `<div class="row"><div class="tile">${I('chat')}</div><div class="rt"><b>${a.rule}</b><small>${esc(l ? title(db, l) : '—')} · ${ago(a.at, t)}</small></div><div class="rv">${a.undone ? 'Bekor qilindi' : `<span${A('pundo', a.id)} style="color:var(--bluetext)">↩ Bekor qilish</span>`}</div></div>`; }).join('');
      return AD.autoActs(c, rows);
    }
    case 'aQ': return AD.regions(c, db.districts.map((d) => [d.name, d.enabled]), !!ui.qall, db.jobTypes.map((j) => [j.id, j.name, !!j.hidden]));
    case 'aR': {
      const tab = ui.rtab ?? s.p ?? 0;
      const act = db.listings.filter((l) => isPublic(db, l, t));
      const q = norm(ui.rsq || '');
      const sel = act.filter((l) => (tab === 2 ? isTop(l, t) : l.kind === (tab === 0 ? 'bor' : 'kerak'))).filter((l) => !q || norm(title(db, l) + ' ' + l.district + ' ' + (l.izoh || '')).includes(q));
      const cards = sel.map((l) => lc({ ...lcFor(l, undefined, 'list'), a: 'ropen', v: l.id })).join('\n');
      return AD.actives(c, tab, [String(act.filter((l) => l.kind === 'bor').length), String(act.filter((l) => l.kind === 'kerak').length), String(act.filter((l) => isTop(l, t)).length)], ui.rsq || '', cards);
    }
    case 'aS': return AD.sinov(c, actingIndex());
  }
  return `${bg}`;
}
const mmss = (ms: number) => `${String(Math.floor(ms / 60e3)).padStart(2, '0')}:${String(Math.floor((ms % 60e3) / 1000)).padStart(2, '0')}`;
const roleName = (u: User) => { const k = db.listings.filter((l) => l.owner === u.id); return k.some((l) => l.kind === 'bor') ? (k.some((l) => l.kind === 'kerak') ? 'Ish beruvchi / Ishchi' : 'Ish beruvchi') : k.length ? 'Ishchi' : '—'; };
const payStatus = (s: string, short = false) => s === 'otdi' ? '<span class="tag mint">✓ o‘tdi</span>' : s === 'kutilmoqda' ? '<span class="tag">⏳ kutilmoqda</span>' : s === 'qaytarildi' ? '<span class="tag grey">↩ qaytarildi</span>' : `<span class="tag red">✕ o‘tmadi</span>${short ? '' : ''}`;
function topDistrict(us: User[]) {
  const m = new Map<string, number>();
  us.forEach((u) => u.district && m.set(u.district, (m.get(u.district) || 0) + 1));
  return [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
}
function actingIndex() { const u = me(); return u?.id === db.ownerId ? 0 : Number((u?.id || 't0').replace(/\D/g, '')) || 0; }

function qDetailHtml(id: string, c: string) {
  const [k, rid] = id.split(':');
  if (k === 'c') {
    const l = listingById(rid)!;
    const cs = db.complaints.filter((x) => x.listingId === rid && !x.resolved);
    const o = userById(l.owner);
    const serious = complaintTrigger(db, rid);
    const notes = cs.filter((x) => x.note).map((x) => esc(x.note!)).join(' · ');
    const voice = cs.find((x) => x.voice);
    return AD.qdetail({
      clock: c, head: 'Shikoyat', tag: serious ? ['Jiddiy', 'red'] : ['Shikoyat', ''], title: REASONS[cs[0]?.reason ?? 3], sub: `${esc(title(db, l))} · ${l.district}`,
      rows: [row('users', 'Shikoyat qilganlar', String(new Set(cs.map((x) => x.by)).size), 'Oxirgi 24 soat'), row('user', 'E’lon egasi', I('chev'), `${esc(o?.name || '')} · ${maskPhone(o?.phone)}`, 'uopen', o?.id), notes ? row('chat', 'Izoh', '', notes) : '', voice ? row('play', 'Ovozli izoh', I('chev'), 'Tinglash', 'qplay', voice.voice) : ''].join('\n'),
      actions: AD.complaintActions(true), note: 'Rad etish yoki bloklashda tayyor sabab tanlanadi. Xabar odamga uning yozuvida boradi.',
    });
  }
  if (k === 'p') {
    const p = db.payments.find((x) => x.id === rid)!;
    return AD.qdetail({ clock: c, head: 'To‘lov', tag: ['To‘lov · 60 s o‘tdi', 'blue2'], title: p.order, sub: `${money(p.amount)} so‘m · ${appName(p.app)}`, rows: row('user', 'Foydalanuvchi', I('chev'), esc(userById(p.userId)?.name || ''), 'uopen', p.userId), actions: AD.pbtns(`${'<span class="pbtn gold"' + A('jcheck', p.id) + '>Holatni tekshirish</span>'}<span class="pbtn"${A('mkab')}>Multicard kabineti</span>`) });
  }
  if (k === 'l') {
    const l = listingById(rid)!;
    const o = userById(l.owner);
    return AD.qdetail({ clock: c, head: 'E’lon', tag: ['Shubhali e’lon', ''], title: esc(title(db, l)), sub: l.district, rows: [row('user', 'E’lon egasi', I('chev'), `${esc(o?.name || '')} · ${maskPhone(o?.phone)}`, 'uopen', o?.id), row('chat', 'Izoh', '', esc([l.izoh, l.extra].filter(Boolean).join(' · ') || '—'))].join('\n'), actions: AD.pbtns(`<span class="pbtn gold"${A('qapprove')}>Tasdiqlash</span><span class="pbtn"${A('qreject')}>Rad etish</span>`) });
  }
  const m = db.support.find((x) => x.id === rid)!;
  return AD.qdetail({ clock: c, head: 'Savol', tag: ['Savol', 'blue2'], title: esc(userById(m.userId)?.name || ''), sub: fullDate(m.at), rows: row('chat', 'Xabar', '', esc(m.text)), reply: true, actions: AD.pbtns(`<span class="pbtn gold"${A('qanswer')}>${I('send')}Javob yozish</span>`) });
}

function broadcastTargets() {
  const to = ui.lto || 'all';
  return db.users.filter((u) => {
    if (u.blocked) return false;
    if (to === 'tuman') return !!ui.ldist && u.district === ui.ldist;
    if (to === 'beruvchi') return db.listings.some((l) => l.owner === u.id && l.kind === 'bor');
    if (to === 'ishchi') return db.listings.some((l) => l.owner === u.id && l.kind === 'kerak');
    return true;
  }).filter((u) => (ui.lscr === 'lat' ? u.script !== 'cyr' : ui.lscr === 'cyr' ? u.script === 'cyr' : true));
}

/* ---------- Chizish ---------- */
let pendingScrollTop = false;
export function render(scrollTop = false) {
  if (scrollTop) pendingScrollTop = true;
  const u = me();
  applyTheme();
  const s = cur();
  let html = screenHtml(s);
  if (sheetS) html = sheetHtml(html.replace(bg, '').replace(/<div class="spacer"><\/div><div class="nav[^]*$/, ''), sheetS);
  if (u && u.id !== db.ownerId && u.test) html = html.replace(bg, bg + U.testBar(esc(u.name)));
  const cls = 'phone' + (sheetS || s.n === 'aLogin' ? ' has-sheet' : '');
  const tpl = document.createElement('div');
  tpl.innerHTML = `<div class="${cls}" id="s-${s.n}">${html}</div>`;
  if (u?.script === 'cyr') toCyrDom(tpl);
  if (u?.script === 'ru' && !/^a[A-Z]/.test(s.n)) { setRuPlaces(ruPlaces()); toRuDom(tpl); } // Nazorat o‘zbekcha qoladi
  N.setScript(u?.script || 'lat');
  root.classList.toggle('ru', u?.script === 'ru');
  const next = tpl.firstElementChild as HTMLElement;
  if (!root.firstElementChild) root.appendChild(next);
  else morphdom(root.firstElementChild, next, {
    onBeforeElUpdated(from, to) {
      if ((from instanceof HTMLInputElement || from instanceof HTMLTextAreaElement) && from === document.activeElement) return false;
      if (from.isEqualNode(to)) return false;
      return true;
    },
  });
  if (pendingScrollTop) { window.scrollTo(0, 0); pendingScrollTop = false; }
  if (s.n === 'aLogin') {
    const inp = root.querySelector<HTMLInputElement>('[data-in="acode"]');
    if (inp && inp.value !== (ui.acode || '')) inp.value = ui.acode || '';
  }
}

function applyTheme() {
  const u = me();
  const th = u?.theme || 'dark';
  const light = th === 'light' || (th === 'auto' && window.matchMedia('(prefers-color-scheme: light)').matches);
  document.body.classList.toggle('light', light);
  if (N.native) {
    StatusBar.setBackgroundColor({ color: light ? '#f7f4ef' : '#0b0b0e' }).catch(() => {});
    StatusBar.setStyle({ style: light ? Style.Light : Style.Dark }).catch(() => {});
  }
}

/* ---------- Harakatlar ---------- */
async function act(a: string, v: string | undefined, el: HTMLElement) {
  const u = me();
  if (!u) return;
  const s = cur();
  if (s.n.startsWith('a') && s.n !== 'aLogin') {
    if (!adminAlive()) return;
    adminLast = Date.now();
  }
  if (el.getAttribute('style')?.includes('opacity:.45')) {
    N.haptic.warn();
    if (a === 'psubmit') return flashMissing();
    if (a === 'csend') return flash('.card.mt20');
    if (a === 'rpick') {
      if (!s.p.district) return flash('.card.mt14');
      flash('.chips'); return N.alert('Masofani belgilang.');
    }
    return;
  }
  switch (a) {
    case 'back': return back();
    case 'close': return closeSheet();
    case 'pickv': { const r = pickResolve; pickResolve = null; const prev = sheetS?.p?.prev; sheetS = prev || null; render(); r?.(Number(v)); return; }
    case 'nav':
      if (v === 'post') return startPost();
      return reset(v === 'list' ? 'list' : v === 'profile' ? 'profile' : 'home');
    case 'list': ui.listKind = v; ui.page = 1; return reset('list');
    case 'kind': ui.listKind = v; ui.page = 1; return render();
    // Bosh sahifa bo‘limi: birinchi bosish ro‘yxatni shu yerda almashtiradi, tanlangan bo‘limni qayta bosish E’lonlarga o‘tadi.
    case 'hkind': if (ui.homeKind === v) { ui.listKind = v; ui.page = 1; return reset('list'); } ui.homeKind = v; return render();
    case 'search': ui.listKind = ui.homeKind; reset('list'); setTimeout(() => root.querySelector<HTMLInputElement>('[data-in="q"]')?.focus(), 50); return;
    case 'mic': {
      const r = await N.listen();
      if (r) { ui.q = r; ui.page = 1; if (cur().n !== 'list') reset('list'); else render(); }
      return;
    }
    case 'region': return go('region', { target: 'search', q: '', vil: vilOf(u.district), district: u.district, lat: u.lat, lng: u.lng, radius: u.radius });
    case 'fjob': return openSheet('fjob', { v: [...ui.fjobs] });
    case 'fgender': return openSheet('fgender', { v: ui.fgender });
    case 'fj': { const p = sheetS!.p; p.v = p.v.includes(v) ? p.v.filter((x: string) => x !== v) : [...p.v, v]; return render(); }
    case 'fjall': sheetS!.p.v = []; return render();
    case 'fjok': ui.fjobs = sheetS!.p.v; ui.page = 1; return closeSheet();
    case 'fg': sheetS!.p.v = v; return render();
    case 'fgok': ui.fgender = sheetS!.p.v; ui.page = 1; return closeSheet();
    case 'open': return openListing(v!);
    case 'mine': { const l = listingById(v)!; ui.kedit = undefined; return go(l.kind === 'bor' ? 'mybor' : 'mykerak', l.id); }
    case 'map': { const l = listingById(s.p)!; return N.open(`https://maps.google.com/?q=${l.lat},${l.lng}`); }
    case 'call': {
      const l = listingById(s.p)!; const o = userById(l.owner);
      if (!o?.phone) return;
      l.calls++; save();
      return N.open(`tel:${o.phone}`);
    }
    case 'tg': { const o = userById(listingById(s.p)!.owner); if (o?.username) return N.open(`https://t.me/${o.username}`); return; }
    case 'complain': if (u.blocked) return go('blocked'); return go('complain', { id: s.p });
    case 'reason': if (s.n === 'complain' && !complainedBy(listingById(s.p.id)!, u)) { s.p.reason = Number(v); render(); } return;
    case 'cextra': return openSheet('extra', { target: 'complain', text: s.p.note || '', voice: s.p.voice, voiceSec: s.p.voiceSec });
    case 'csend': return sendComplaint();
    /* forma */
    case 'pkind': draft().kind = v as Kind; u.lastKind = v as Kind; save(); return render(true);
    case 'pjob': {
      const d = draft();
      if (d.kind === 'bor') d.bor.job = v;
      else { d.kerak.any = false; d.kerak.jobs = d.kerak.jobs.includes(v!) ? d.kerak.jobs.filter((x) => x !== v) : [...d.kerak.jobs, v!]; }
      save(); return render();
    }
    case 'pany': { const k = draft().kerak; k.any = !k.any; if (k.any) k.jobs = []; save(); return render(); }
    case 'pday': { const k = draft().kerak; const i = Number(v); k.days = k.days.includes(i) ? k.days.filter((x) => x !== i) : [...k.days, i]; save(); return render(); }
    case 'ptrait': { const k = draft().kerak; const i = Number(v); k.traits = k.traits.includes(i) ? k.traits.filter((x) => x !== i) : [...k.traits, i]; save(); return render(); }
    case 'ppeople': { const b = draft().bor; b.people = Math.max(1, Math.min(50, b.people + Number(v))); save(); return render(); }
    case 'pkim': { const b = draft().bor; b.kim = v === 'Erkak' ? 'erkak' : v === 'Ayol' ? 'ayol' : 'farqi'; save(); return render(); }
    case 'pgender': draft().kerak.gender = v === 'Erkak' ? 'erkak' : 'ayol'; save(); return render();
    case 'ppay': {
      const d = draft();
      if (d.kind === 'bor') {
        if (v === 'kelishiladi') { d.bor.payType = 'kelishiladi'; save(); return render(); }
        return openSheet('amount', { kind: v, v: String((v === 'kun' ? d.bor.kun : d.bor.soat) || '') });
      }
      return openSheet('amount', { kind: 'kun', v: String(d.kerak.pay || '') });
    }
    case 'paddr': {
      const d = draft(); const x = d.kind === 'bor' ? d.bor : d.kerak;
      return go('region', { target: d.kind, q: '', vil: vilOf(x.district ?? u.district), district: x.district ?? u.district, lat: x.district ? x.lat : u.lat, lng: x.district ? x.lng : u.lng, radius: x.radius });
    }
    case 'pwhen': { const b = draft().bor; return openSheet('when', whenInit(b.when)); }
    case 'pextra': { const k = draft().kerak; return openSheet('extra', { target: 'post', text: k.extra, voice: k.voice, voiceSec: k.voiceSec }); }
    case 'pphone': return togglePhone();
    case 'psubmit': return submitPost();
    /* qachon */
    case 'wday': sheetS!.p.day = v; sheetS!.p.other = undefined; return render();
    case 'wother': {
      const d = await pickDate();
      if (d) { sheetS!.p.day = 'other'; sheetS!.p.other = d; render(); }
      return;
    }
    case 'whour': sheetS!.p.hour = v; return render();
    case 'wok': {
      const p = sheetS!.p; const t = now();
      const base = p.day === 'Bugun' ? dayStart(t) : p.day === 'Ertaga' ? dayStart(t) + DAY_MS : p.day === 'Indinga' ? dayStart(t) + 2 * DAY_MS : p.other;
      const when = base + hm(p.hour);
      if (p.repost) { const l = listingById(p.repost)!; l.when = when; closeSheet(); return doRepost(l); }
      draft().bor.when = when; save(); return closeSheet();
    }
    /* summa */
    case 'key': {
      const p = sheetS!.p; let s2 = String(p.v || '');
      if (v === '⌫') s2 = s2.slice(0, -1); else s2 = (s2 === '0' ? '' : s2) + v;
      if (Number(s2) > 10_000_000) { N.haptic.warn(); return; }
      p.v = s2.replace(/^0+/, ''); return render();
    }
    case 'quick': sheetS!.p.v = v!.replace(/\s/g, ''); return render();
    case 'aok': {
      const p = sheetS!.p; const n = Number(p.v || 0); const d = draft();
      if (d.kind === 'bor') { if (p.kind === 'soat') d.bor.soat = n; else d.bor.kun = n; d.bor.payType = p.kind; } else d.kerak.pay = n;
      save(); return closeSheet();
    }
    /* qo‘shimcha */
    case 'vrec': return toggleRec();
    case 'vplay': { const p = sheetS!.p; if (p.voice) { const dU = p.voice.startsWith('data:') ? p.voice : await N.loadVoice(p.voice); if (dU) N.play(dU); } return; }
    case 'vdel': sheetS!.p.voice = undefined; sheetS!.p.voiceSec = undefined; return render();
    case 'eok': return extraOk();
    case 'play': { const dU = await N.loadVoice(v!); if (dU) N.play(dU); return; }
    /* hudud */
    case 'vil': s.p.vil = v; render(); return window.scrollTo(0, 0);
    case 'vilopen': s.p.vil = undefined; s.p.fold = false; render(); return window.scrollTo(0, 0);
    case 'district': s.p.district = v; s.p.lat = undefined; s.p.lng = undefined; s.p.fold = true; s.p.q = ''; render(); return window.scrollTo(0, 0);
    case 'unfold': s.p.fold = false; return render();
    case 'radius': s.p.radius = s.p.radius === Number(v) ? undefined : Number(v); return render();
    case 'locate': {
      const p = await N.locate();
      if (!p || p === 'fail') { s.p.denied = p ? 'fail' : true; return render(); }
      const d = nearestDistrict(db, p.lat, p.lng);
      s.p.district = d.name; s.p.vil = d.region; s.p.lat = p.lat; s.p.lng = p.lng; s.p.denied = false; s.p.fold = true; s.p.q = ''; render(); return window.scrollTo(0, 0);
    }
    case 'rpick': return pickRegion();
    /* profil */
    case 'script': u.script = v === 'cyr' || v === 'ru' ? v : 'lat'; save(); return render();
    case 'theme': return openSheet('theme', { v: u.theme || 'dark' });
    case 'tpick': sheetS!.p.v = v; return render();
    case 'tok': u.theme = sheetS!.p.v; save(); return closeSheet();
    case 'help': ui.open = []; return go('help');
    case 'hq': { const i = Number(v); ui.open = ui.open.includes(i) ? ui.open.filter((x: number) => x !== i) : [...ui.open, i]; return render(); }
    case 'ask': return askBot();
    case 'found': return foundIt(v || s.p);
    case 'busy': if (s.n === 'mykerak' && !v) { const e = kedit(listingById(s.p)!); e.busy = !e.busy; return render(); } return toggleBusy(v || s.p);
    case 'kaddr': { const e = kedit(listingById(s.p)!); return go('region', { target: 'kedit', q: '', vil: vilOf(e.district), district: e.district, lat: e.lat, lng: e.lng, radius: e.radius }); }
    case 'kdays': return openSheet('kdays', { v: [...kedit(listingById(s.p)!).days] });
    case 'kday': { const p = sheetS!.p; const i = Number(v); p.v = p.v.includes(i) ? p.v.filter((x: number) => x !== i) : [...p.v, i]; return render(); }
    case 'kdaysok': kedit(listingById(s.p)!).days = sheetS!.p.v; return closeSheet();
    case 'ksave': {
      const l = listingById(s.p)!; const e = kedit(l);
      l.busy = e.busy; l.district = e.district; l.lat = e.lat; l.lng = e.lng; l.radius = e.radius; l.days = e.days;
      ui.kedit = undefined; save(); N.haptic.ok(); stack.pop(); return render(true);
    }
    case 'ldel': {
      const l = listingById(s.p)!;
      if (!(await N.confirm('E’lonni o‘chirish', 'E’loningiz butunlay o‘chiriladi. Ishonchingiz komilmi?'))) return;
      deleteListing(l); N.haptic.ok(); stack.pop(); return render(true);
    }
    case 'repost': return repost(v || s.p);
    case 'top': return go('tarif', v || s.p);
    case 'topgo': return go('pay', { id: s.p, app: u.lastPayApp || 'payme', state: 'tanlash' });
    case 'payapp': if (s.p.state !== 'kutish') { s.p.app = v; render(); } return;
    case 'paygo': return payGo();
    case 'payreopen': return paySimulate(s.p.paymentId);
    case 'retry': return boot2();
    case 'admin': if (isAdminPhone(u)) { ui.acode = ''; ui.aerr = false; go('aLogin'); setTimeout(() => root.querySelector<HTMLInputElement>('[data-in="acode"]')?.focus(), 300); } return;
    case 'actown': return actAs(0);
  }
  return adminAct(a, v);
}

function flashMissing() {
  const d = draft();
  if (d.kind === 'bor') {
    const b = d.bor;
    if (!b.job) return flash('[data-f="jobs"]+.chips');
    if (!b.district || b.radius == null) return flash('[data-a="paddr"]');
    if (!b.when) return flash('[data-a="pwhen"]');
    if (!b.kim) return flash('[data-f="kim"]');
    return flash('[data-f="pay"]+.sels');
  }
  const k = d.kerak;
  if (!k.any && !k.jobs.length) return flash('[data-f="jobs"]+.chips');
  if (!k.district || k.radius == null) return flash('[data-a="paddr"]');
  if (!k.pay) return flash('[data-a="ppay"]');
  return flash('[data-f="kim"]');
}

function startPost() {
  const u = me()!;
  if (u.blocked) return go('blocked');
  return reset('post');
}

function openListing(id: string) {
  const l = listingById(id);
  const u = me();
  if (!l) return;
  if (l.owner === u?.id) { ui.kedit = undefined; return go(l.kind === 'bor' ? 'mybor' : 'mykerak', id); }
  l.views++; save();
  return go(l.kind === 'bor' ? 'bor' : 'kerak', id);
}

function whenInit(t?: number) {
  if (!t) return { day: undefined, hour: undefined };
  const n = now();
  const d = Math.round((dayStart(t) - dayStart(n)) / DAY_MS);
  return { day: d === 0 ? 'Bugun' : d === 1 ? 'Ertaga' : d === 2 ? 'Indinga' : 'other', other: d > 2 ? dayStart(t) : undefined, hour: hhmm(t) };
}

async function pickDate(): Promise<number | undefined> {
  const t = now();
  const days = Array.from({ length: 58 }, (_, i) => dayStart(t) + (i + 3) * DAY_MS);
  const i = await choose('Boshqa kun', days.map((d) => `${dmy(d)}, ${['dushanba', 'seshanba', 'chorshanba', 'payshanba', 'juma', 'shanba', 'yakshanba'][weekday(d)]}`), 'cal');
  return i >= 0 ? days[i] : undefined;
}

async function askPhone(u: User): Promise<boolean> {
  for (let i = 0; i < 2; i++) {
    const r = await N.prompt('Telefon raqami', 'Telefon raqamingiz (+998…)', u.phone || '+998', 'tel');
    if (r == null) return false;
    const p = normPhone(r);
    if (p) { u.phone = p; save(); return true; }
    await N.alert('Raqam noto‘g‘ri. Masalan: +998 90 123 45 67');
  }
  return false;
}

async function togglePhone() {
  const u = me()!; const d = draft(); const x = d.kind === 'bor' ? d.bor : d.kerak;
  if (phoneLocked()) { if (!u.phone) await askPhone(u); return render(); }
  if (!x.phone && !u.phone && !(await askPhone(u))) return render();
  x.phone = !x.phone; save(); render();
}

function pickRegion() {
  const s = cur(); const p = s.p; const u = me()!;
  const d = db.districts.find((x) => x.name === p.district)!;
  const lat = p.lat ?? d.lat, lng = p.lng ?? d.lng;
  if (p.target === 'kedit') { const e = ui.kedit; if (e) { e.district = p.district; e.lat = lat; e.lng = lng; e.radius = p.radius; } stack.pop(); return render(true); }
  if (p.target === 'search') { u.district = p.district; u.lat = p.lat; u.lng = p.lng; u.radius = p.radius; ui.page = 1; }
  else { const dr = draft(); const x = p.target === 'bor' ? dr.bor : dr.kerak; x.district = p.district; x.lat = lat; x.lng = lng; x.radius = p.radius; if (!u.district) { u.district = p.district; u.radius = p.radius; } }
  save();
  stack.pop(); render(true);
}

async function submitPost() {
  const u = me()!;
  if (u.blocked) return go('blocked');
  if (db.settings.stopPosting) return N.alert('Hozir yangi e’lon qabul qilinmayapti. Birozdan keyin urinib ko‘ring.');
  const d = draft(); const t = now();
  if (phoneLocked() && !u.phone && !(await askPhone(u))) return render();
  let l: Listing;
  if (d.kind === 'bor') {
    const b = d.bor;
    l = { id: uid('l'), kind: 'bor', owner: u.id, jobs: [b.job!], izoh: b.izoh.trim() || undefined, district: b.district!, lat: b.lat!, lng: b.lng!, radius: b.radius!, when: b.when, people: b.people, forWhom: b.kim, payType: b.payType!, pay: b.payType === 'kun' ? b.kun : b.payType === 'soat' ? b.soat : undefined, days: [], traits: [], showPhone: b.phone || phoneLocked(), status: 'faol', createdAt: t, calls: 0, views: 0 };
    db.listings.push(l);
  } else {
    const k = d.kerak;
    const old = db.listings.find((x) => x.owner === u.id && x.kind === 'kerak' && x.status !== 'ochirilgan');
    const fields = { jobs: k.any ? [] : k.jobs, anyJob: k.any, extra: k.extra.trim() || undefined, voice: k.voice, voiceSec: k.voiceSec, district: k.district!, lat: k.lat!, lng: k.lng!, radius: k.radius!, people: 1, gender: k.gender, payType: 'kun' as PayType, pay: k.pay, days: k.days, traits: k.traits.map(String), showPhone: k.phone || phoneLocked(), status: 'faol' as const, createdAt: t, confirmAt: t, askedAt: undefined, closedAt: undefined };
    if (old) { Object.assign(old, fields); resumeTop(old, t); l = old; }
    else { l = { id: uid('l'), kind: 'kerak', owner: u.id, izoh: undefined, calls: 0, views: 0, ...fields }; db.listings.push(l); }
    if (k.voice && k.voice.startsWith('data:')) { const vid = uid('v'); await N.saveVoice(vid, k.voice); l.voice = vid; }
  }
  if (suspicious([l.izoh, l.extra].filter(Boolean).join(' '), db.words)) { l.status = 'tekshirilmoqda'; l.reviewReason = 'shubhali'; }
  u.role = d.kind === 'bor' ? 'beruvchi' : 'ishchi';
  db.drafts[u.id] = newDraft(d.kind);
  save(); N.haptic.ok();
  stack = [{ n: 'home' }, { n: 'done', p: l.id }]; sheetS = null; render(true);
}

async function extraOk() {
  const p = sheetS!.p;
  if (N.recording()) N.recStop();
  if (p.target === 'post') { const k = draft().kerak; k.extra = (p.text || '').trim(); k.voice = p.voice; k.voiceSec = p.voiceSec; save(); }
  else { const s = cur(); s.p.note = (p.text || '').trim(); s.p.voice = p.voice; s.p.voiceSec = p.voiceSec; }
  closeSheet();
}

let recTimer: ReturnType<typeof setInterval> | undefined;
async function toggleRec() {
  const p = sheetS!.p;
  if (N.recording()) { N.recStop(); return; }
  const started = Date.now();
  const ok = await N.recStart((dataUrl, sec) => { clearInterval(recTimer); if (sheetS?.n === 'extra') { sheetS.p.voice = dataUrl; sheetS.p.voiceSec = sec; sheetS.p.rec = undefined; render(); } });
  if (!ok) return N.alert('Mikrofonga ruxsat berilmadi.');
  p.rec = '0:00'; render();
  recTimer = setInterval(() => {
    const s2 = Math.floor((Date.now() - started) / 1000);
    if (sheetS?.n === 'extra') { sheetS.p.rec = `0:${String(Math.min(60, s2)).padStart(2, '0')}`; render(); }
    if (s2 >= 60) N.recStop();
  }, 500);
}

async function sendComplaint() {
  const s = cur(); const u = me()!; const l = listingById(s.p.id)!;
  if (complainedBy(l, u)) return;
  let voice: string | undefined;
  if (s.p.voice) { voice = uid('v'); await N.saveVoice(voice, s.p.voice); }
  db.complaints.push({ id: uid('c'), listingId: l.id, by: u.id, reason: s.p.reason, note: s.p.note || undefined, voice, at: now() });
  if (l.status === 'faol' && complaintTrigger(db, l.id)) {
    db.auto.unshift({ id: uid('a'), at: now(), rule: `${db.settings.complaintThreshold} ta shikoyat → yashirildi`, listingId: l.id, prev: l.status });
    l.status = 'tekshirilmoqda'; l.reviewReason = 'shikoyat';
    audit('Avtomatik: e’lon yashirildi', l.id);
  }
  save(); N.haptic.ok();
  swap('thanks');
}

/** E’lonni butunlay o‘chiradi (ma’lumot to‘planib qolmasin) */
function deleteListing(l: Listing) {
  db.listings = db.listings.filter((x) => x.id !== l.id);
  db.complaints = db.complaints.filter((c) => c.listingId !== l.id);
  save();
}

function foundIt(id: string) {
  const l = listingById(id)!; const t = now();
  l.status = 'yopilgan'; l.closedAt = t; pauseTop(l, t); save(); N.haptic.ok();
  if (cur().n === 'mybor') stack.pop();
  render();
}
function toggleBusy(id: string) { const l = listingById(id)!; l.busy = !l.busy; save(); render(); }
function repost(id: string) {
  const l = listingById(id)!;
  if (l.kind === 'bor' && (!l.when || l.when < now())) return openSheet('when', { ...whenInit(), repost: l.id });
  doRepost(l);
}
function doRepost(l: Listing) {
  const t = now();
  l.status = suspicious([l.izoh, l.extra].filter(Boolean).join(' '), db.words) ? 'tekshirilmoqda' : 'faol';
  if (l.status === 'tekshirilmoqda') l.reviewReason = 'shubhali';
  l.createdAt = t; l.closedAt = undefined; l.confirmAt = t; l.askedAt = undefined; l.notified = {};
  resumeTop(l, t); save(); N.haptic.ok(); render();
}

async function askBot() {
  const r = await N.prompt('Botga yozish', 'Savolingizni yozing', '');
  if (!r || !r.trim()) return;
  db.support.unshift({ id: uid('s'), userId: me()!.id, text: r.trim(), at: now() });
  save(); await N.alert('Xabaringiz yuborildi. Javob bot orqali keladi.');
}

/* TOP to‘lovi: APK’da “Sinov to‘lovi” (13.2) */
async function payGo() {
  const s = cur(); const u = me()!; const t = now();
  if (db.settings.paymentsOff) return N.alert('To‘lovlar vaqtincha o‘chirilgan.');
  u.lastPayApp = s.p.app;
  db.orderSeq++;
  const pay = { id: uid('p'), order: `IB-${new Date(t).getUTCFullYear()}-${String(db.orderSeq).padStart(6, '0')}`, listingId: s.p.id, userId: u.id, app: s.p.app, amount: db.settings.topPrice, days: db.settings.topDays, status: 'kutilmoqda' as const, at: t, test: true };
  db.payments.unshift(pay);
  save();
  s.p.state = 'kutish'; s.p.paymentId = pay.id; render();
  await paySimulate(pay.id);
}
async function paySimulate(pid: string) {
  const p = db.payments.find((x) => x.id === pid);
  if (!p || p.status !== 'kutilmoqda') return;
  const ok = await N.confirm('Sinov to‘lovi', `${appName(p.app)} · ${money(p.amount)} so‘m. Haqiqiy pul yechilmaydi.`, 'O‘tdi', 'O‘tmadi');
  payResult(pid, ok);
}
/** Multicard callback o‘rnida: bir to‘lov faqat bir marta hisoblanadi (7.3) */
function payResult(pid: string, ok: boolean) {
  const p = db.payments.find((x) => x.id === pid);
  if (!p || p.status !== 'kutilmoqda') return;
  const t = now();
  const l = listingById(p.listingId);
  if (!l) { p.status = 'otmadi'; save(); return; }
  if (ok) {
    p.status = 'otdi';
    extendTop(l, p.days, t);
    l.notified = { ...(l.notified || {}), soon: 0, end: 0 };
    note(p.userId, `⚡ TOP yoqildi. ${p.days} kun ro‘yxat boshidasiz.`, ['Ilovani ochish'], 'my');
  } else p.status = 'otmadi';
  save();
  const s = cur();
  if (s.n === 'pay' && s.p.paymentId === pid) {
    if (ok) { N.haptic.ok(); stack.pop(); if (cur().n === 'tarif') stack.pop(); stack.push({ n: 'paid', p: { id: l.id, amount: p.amount } }); render(true); }
    else { s.p.state = 'otmadi'; render(); }
  }
  flushNotes();
}

/* ---------- Nazorat harakatlari ---------- */
function adminAlive() {
  if (Date.now() - adminLast > db.settings.sessionMin * 60e3) { exitAdmin(); return false; }
  return true;
}
function exitAdmin() {
  adminIn = false;
  while (stack.length && stack[stack.length - 1].n.startsWith('a')) stack.pop();
  if (!stack.length) stack = [{ n: 'profile' }];
  sheetS = null; render(true);
}
const goA = (n: string, p?: any) => go(n, p);
const ADMIN_ROOT: Record<string, string> = { b: 'aB', n: 'aC', o: 'aD', p: 'aE', y: 'aF' };

async function adminAct(a: string, v?: string) {
  const s = cur(); const t = now();
  switch (a) {
    case 'aclose': stack.pop(); ui.acode = ''; return render();
    case 'alogin': return adminLogin();
    case 'aexit': return exitAdmin();
    case 'anav': { while (stack.length && stack[stack.length - 1].n.startsWith('a') && stack[stack.length - 1].n !== 'aLogin') stack.pop(); stack.push({ n: ADMIN_ROOT[v!] }); render(true); return; }
    case 'go': if (v === 'T') { ui.rtab = 2; return goA('aR', 2); } if (v === 'R') ui.rtab = 0; if (v === 'G') { ui.gcur = ui.gnew = ui.grep = ''; ui.gerr = ''; } if (v === 'M') { ui.mprice = ui.mdays = undefined; } if (v === 'L') { ui.ltext = ''; } return goA('a' + v);
    case 'qtab': ui.qtab = Number(v); return render();
    case 'qopen': return goA('aH', v);
    case 'ptab': ui.ptab = Number(v); return render();
    case 'uopen': ui.showPhone = undefined; return goA('aI', v);
    case 'ushowphone': ui.showPhone = v; audit('Telefon ko‘rildi', v); save(); return render();
    case 'ulist': ui.rsq = userById(v)?.name || ''; ui.rtab = 0; return goA('aR', 0);
    case 'popen': return goA('aJ', v);
    case 'otab': ui.otab = Number(v); return render();
    case 'rtab': ui.rtab = Number(v); return render();
    case 'ropen': return listingMenu(v!);
    case 'qlisting': { const id = s.p.split(':')[1]; return listingMenu(id); }
    case 'qplay': { const dU = await N.loadVoice(v!); if (dU) N.play(dU); return; }
    case 'qwarn': { const l = listingById(s.p.split(':')[1])!; return warnUser(l.owner, l.id); }
    case 'qblock': { const l = listingById(s.p.split(':')[1])!; return blockUser(l.owner); }
    case 'qreject': return rejectListing(s.p.split(':')[1]);
    case 'qhide': return hideListing(s.p.split(':')[1]);
    case 'qapprove': {
      const l = listingById(s.p.split(':')[1])!;
      l.status = 'faol'; l.reviewReason = undefined; audit('E’lon tasdiqlandi', l.id, 'tekshirilmoqda', 'faol');
      note(l.owner, 'E’loningiz joylandi.', ['Ilovani ochish'], 'my');
      save(); stack.pop(); render(); return flushNotes();
    }
    case 'qanswer': {
      const m = db.support.find((x) => x.id === s.p.split(':')[1])!;
      const txt = (ui.reply || '').trim();
      if (!txt) return flash('.field.ta');
      m.answered = true; note(m.userId, txt); audit('Savolga javob', m.id); ui.reply = '';
      save(); stack.pop(); render(); return flushNotes();
    }
    case 'jcheck': {
      const pid = s.n === 'aJ' ? s.p : v!;
      const p = db.payments.find((x) => x.id === pid)!;
      if (p.status !== 'kutilmoqda') return N.alert(`Holati: ${p.status === 'otdi' ? 'o‘tdi' : p.status === 'qaytarildi' ? 'qaytarildi' : 'o‘tmadi'}`);
      const ok = await N.confirm('Sinov to‘lovi', 'Multicard javobi (sinov)', 'O‘tdi', 'O‘tmadi');
      payResult(pid, ok); audit('To‘lov holati tekshirildi', p.order); return render();
    }
    case 'mkab': return N.alert('Sinov APK’sida Multicard kabineti yo‘q. Shartnomadan keyin mini app’da ochiladi.');
    case 'receipt': return N.alert('Sinov to‘lovida chek bo‘lmaydi.');
    case 'jrefund': {
      const p = db.payments.find((x) => x.id === s.p)!;
      if (!(await N.confirm('Pulni qaytarish', 'Ishonchingiz komilmi?'))) return;
      p.status = 'qaytarildi';
      const l = listingById(p.listingId);
      if (l?.topUntil) { l.topUntil = Math.max(t, l.topUntil - p.days * DAY_MS); if (l.topUntil <= t) l.topUntil = undefined; }
      audit('Pul qaytarildi', p.order, 'otdi', 'qaytarildi'); save(); return render();
    }
    case 'excel': return exportExcel();
    case 'uwarn': return warnUser(s.p);
    case 'uhide': { const ls = db.listings.filter((l) => l.owner === s.p && l.status === 'faol'); const i = await choose('Yashirish', ['1 kun', '3 kun', '5 kun']); if (i < 0) return; ls.forEach((l) => { l.status = 'yashirin'; l.hiddenUntil = t + [1, 3, 5][i] * DAY_MS; }); audit(`Odam e’lonlari yashirildi (${[1, 3, 5][i]} kun)`, s.p); save(); return render(); }
    case 'utop': {
      const ls = db.listings.filter((l) => l.owner === s.p && l.status === 'faol');
      if (!ls.length) return N.alert('Faol e’loni yo‘q.');
      const li = ls.length > 1 ? await choose('Qaysi e’lon', ls.map((l) => title(db, l))) : 0;
      if (li < 0) return;
      const di = await choose('Necha kun', ['1 kun', '3 kun', '7 kun', '14 kun', '30 kun']);
      if (di < 0) return;
      const days = [1, 3, 7, 14, 30][di];
      extendTop(ls[li], days, t); audit(`TOP berildi (qo‘lda, ${days} kun)`, ls[li].id);
      note(s.p, `⚡ TOP yoqildi. ${days} kun ro‘yxat boshidasiz.`, ['Ilovani ochish'], 'my');
      save(); render(); return flushNotes();
    }
    case 'uverify': { const u = userById(s.p)!; u.verified = !u.verified; audit(u.verified ? 'Tasdiqlangan belgisi berildi' : 'Tasdiqlangan belgisi olindi', u.id); save(); return render(); }
    case 'ublock': return blockUser(s.p);
    case 'uunblock': {
      const u = userById(s.p)!;
      if (!(await N.confirm('Blokdan chiqarish', 'Ishonchingiz komilmi?'))) return;
      u.blocked = false; db.listings.filter((l) => l.owner === u.id && l.status === 'ochirilgan').forEach((l) => { l.status = 'yopilgan'; });
      audit('Blokdan chiqarildi', u.id); save(); return render();
    }
    case 'gsave': return changeCode();
    case 'kadd': {
      const w = (ui.kword || '').trim();
      if (!w) return flash('.field');
      if (!db.words.some((x) => norm(x) === norm(w))) { db.words.push(w); audit('Shubhali so‘z qo‘shildi', w); }
      ui.kword = ''; const inp = document.querySelector<HTMLInputElement>('[data-in="kword"]'); if (inp) inp.value = '';
      save(); return render();
    }
    case 'kdel': { const w = db.words[Number(v)]; db.words.splice(Number(v), 1); audit('Shubhali so‘z o‘chirildi', w); save(); return render(); }
    case 'lto': ui.lto = v; return render();
    case 'ldist': ui.ldist = v; return render();
    case 'lscr': ui.lscr = v; return render();
    case 'lsend': {
      const to = broadcastTargets();
      if (!(await N.confirm('Botdan xabar', `${to.length} kishiga yuborilsinmi? Ishonchingiz komilmi?`))) return;
      const txt = ui.ltext.trim();
      to.forEach((u) => note(u.id, txt));
      audit('Botdan xabar', `${to.length} kishi`, undefined, txt);
      save(); await flushNotes();
      await N.alert(`${to.length} ta yetdi, 0 ta yetmadi`);
      ui.ltext = ''; stack.pop(); return render();
    }
    case 'msave': {
      const p = Number(ui.mprice ?? db.settings.topPrice), d = Number(ui.mdays ?? db.settings.topDays);
      if (!(p >= 1000 && p <= 1_000_000 && d >= 1 && d <= 60)) return N.alert('Narx 1 000 – 1 000 000 so‘m, muddat 1–60 kun bo‘lsin.');
      audit('TOP narxi o‘zgardi', undefined, `${db.settings.topPrice} / ${db.settings.topDays}`, `${p} / ${d}`);
      db.settings.topPrice = p; db.settings.topDays = d; ui.mprice = ui.mdays = undefined; save(); stack.pop(); return render();
    }
    case 'ntog': {
      const k = v as 'stopPosting' | 'paymentsOff' | 'maintenance';
      if (!(await N.confirm('Favqulodda', 'Ishonchingiz komilmi?'))) return;
      db.settings[k] = !db.settings[k]; audit(`Favqulodda: ${k}`, undefined, String(!db.settings[k]), String(db.settings[k])); save(); return render();
    }
    case 'oall': if (!(await N.confirm('Hamma joydan chiqish', 'Boshqa barcha Nazorat sessiyalari yopiladi. Ishonchingiz komilmi?'))) return; audit('Hamma joydan chiqish'); save(); return N.alert('Boshqa sessiyalar yopildi.');
    case 'pundo': {
      const x = db.auto.find((y) => y.id === v)!; const l = listingById(x.listingId);
      if (l && x.prev) { l.status = x.prev; l.reviewReason = undefined; }
      x.undone = true; audit('Avtomatik amal bekor qilindi', x.listingId); save(); return render();
    }
    case 'qdist': { const d = db.districts.find((x) => x.name === v)!; d.enabled = !d.enabled; audit(`Tuman ${d.enabled ? 'yoqildi' : 'o‘chirildi'}`, d.name); save(); return render(); }
    case 'qmore': if (!ui.qall) { ui.qall = true; render(); } return;
    case 'qaddd': return addDistrict();
    case 'qjob': {
      const j = db.jobTypes.find((x) => x.id === v)!;
      const used = db.listings.some((l) => l.jobs.includes(j.id));
      const i = await choose(j.name, [j.hidden ? 'Ko‘rsatish' : 'Yashirish', ...(used ? [] : ['O‘chirish'])]);
      if (i === 0) { j.hidden = !j.hidden; audit(`Ish turi ${j.hidden ? 'yashirildi' : 'ko‘rsatildi'}`, j.name); }
      if (i === 1) { db.jobTypes = db.jobTypes.filter((x) => x.id !== j.id); audit('Ish turi o‘chirildi', j.name); }
      save(); return render();
    }
    case 'qaddj': {
      const n = await N.prompt('Ish turi', 'Yangi ish turi nomi', '');
      if (!n?.trim()) return;
      const icons = ['truck', 'build', 'spark', 'chef', 'leaf', 'wrench', 'dots', 'brief', 'users', 'heart', 'star', 'tag'];
      const i = await choose('Belgi', icons);
      db.jobTypes.splice(db.jobTypes.length - 1, 0, { id: uid('j'), name: n.trim(), icon: icons[Math.max(0, i)] || 'dots' });
      audit('Ish turi qo‘shildi', n.trim()); save(); return render();
    }
    case 'act': return actAs(Number(v));
    case 'shift': {
      db.timeOffset += Number(v) * DAY_MS; audit(`Sinov: vaqt +${v} kun`); save();
      await tick(); return render();
    }
    case 'wipe': {
      if (!(await N.confirm('Hammasini tozalash', 'Barcha sinov ma’lumoti o‘chadi va ilova bo‘sh holatdan boshlanadi. Ishonchingiz komilmi?'))) return;
      const keep = db.admin;
      await N.wipeFiles();
      replace(freshDB()); if (keep) db.admin = { ...keep, fails: 0, lockUntil: undefined };
      await flush();
      stack = [{ n: 'home' }]; adminIn = false; sheetS = null;
      return firstRun();
    }
  }
}

async function adminLogin() {
  const a = db.admin; const t = now();
  const code = ui.acode || '';
  if (!a) { await N.alert('Nazorat kodi APK yig‘ilganda berilmagan (ADMIN_INITIAL_CODE).'); return; }
  if (a.lockUntil && a.lockUntil > t) return render();
  const h = await pbkdf2(code, a.salt, a.iter);
  const dev = N.native ? 'Android ilova' : 'Brauzer';
  if (same(h, a.hash)) {
    a.fails = 0; a.lockUntil = undefined; db.logins.unshift({ at: t, device: dev, ok: true });
    ui.acode = ''; ui.aerr = false; adminLast = Date.now(); adminIn = true; save();
    stack.pop(); stack.push({ n: 'aB' }); render(true); return;
  }
  a.fails++; db.logins.unshift({ at: t, device: dev, ok: false });
  N.haptic.warn();
  if (a.fails >= db.settings.maxAttempts) {
    a.lockUntil = t + db.settings.lockMin * 60e3; a.fails = 0;
    note(db.ownerId!, `Nazoratga ${db.settings.maxAttempts} marta xato kod kiritildi. ${db.settings.lockMin} daqiqa qulflandi.`);
    audit('Nazorat qulflandi');
  }
  ui.acode = ''; ui.aerr = true; save(); render(); void flushNotes();
  const inp = root.querySelector<HTMLInputElement>('[data-in="acode"]'); if (inp) { inp.value = ''; inp.focus(); }
}

async function changeCode() {
  const a = db.admin!;
  const h = await pbkdf2(ui.gcur || '', a.salt, a.iter);
  if (!same(h, a.hash)) {
    a.fails++;
    if (a.fails >= db.settings.maxAttempts) { a.lockUntil = now() + db.settings.lockMin * 60e3; a.fails = 0; note(db.ownerId!, `Nazoratga ${db.settings.maxAttempts} marta xato kod kiritildi. ${db.settings.lockMin} daqiqa qulflandi.`); save(); void flushNotes(); return exitAdmin(); }
    ui.gerr = 'Hozirgi kod noto‘g‘ri'; save(); return render();
  }
  const salt = randomSalt();
  db.admin = { salt, hash: await pbkdf2(ui.gnew, salt, a.iter), iter: a.iter, fails: 0 };
  audit('Kod o‘zgartirildi');
  note(db.ownerId!, 'Nazorat kodi o‘zgartirildi.');
  ui.gcur = ui.gnew = ui.grep = ''; ui.gerr = '';
  save(); void flushNotes();
  await N.alert('Kod o‘zgartirildi.');
  stack.pop(); render();
}

async function warnUser(uidv: string, lid?: string) {
  const texts = ['E’loningiz qoidaga to‘g‘ri kelmadi.', 'Ish uchun oldindan pul so‘ramang.', 'Yolg‘on ma’lumot yozmang.', 'Haqoratli so‘z ishlatmang.'];
  const i = await choose('Ogohlantirish', texts);
  if (i < 0) return;
  note(uidv, `Ogohlantirish: e’loningiz qoidaga to‘g‘ri kelmadi.${i ? ' ' + texts[i] : ''}`);
  audit('Ogohlantirish', uidv, undefined, texts[i]);
  if (lid) db.complaints.filter((c) => c.listingId === lid).forEach((c) => { c.resolved = true; });
  save(); await flushNotes(); render();
}
async function blockUser(uidv: string) {
  const i = await choose('Bloklash sababi', REJECT_REASONS);
  if (i < 0) return;
  if (!(await N.confirm('Bloklash', 'Ishonchingiz komilmi?'))) return;
  const u = userById(uidv)!;
  u.blocked = true; u.blockReason = REJECT_REASONS[i];
  db.listings.filter((l) => l.owner === u.id && l.status !== 'ochirilgan').forEach((l) => { l.status = 'ochirilgan'; pauseTop(l, now()); });
  db.complaints.filter((c) => listingById(c.listingId)?.owner === u.id).forEach((c) => { c.resolved = true; });
  note(u.id, 'Qoidalar buzilgani uchun hisobingiz cheklandi.');
  audit('Bloklandi', u.id, undefined, REJECT_REASONS[i]);
  save(); await flushNotes();
  if (cur().n === 'aH') stack.pop();
  render();
}
async function rejectListing(lid: string) {
  const i = await choose('Rad etish sababi', REJECT_REASONS);
  if (i < 0) return;
  const l = listingById(lid)!;
  const prev = l.status;
  l.status = 'rad_etilgan'; l.rejectReason = REJECT_REASONS[i]; pauseTop(l, now());
  db.complaints.filter((c) => c.listingId === lid).forEach((c) => { c.resolved = true; });
  note(l.owner, `E’loningiz chiqmadi. Sabab: ${REJECT_REASONS[i].toLowerCase()}.`, ['Ilovani ochish'], 'my');
  audit('E’lon rad etildi', lid, prev, REJECT_REASONS[i]);
  save(); await flushNotes();
  if (cur().n === 'aH') stack.pop();
  render();
}
async function hideListing(lid: string) {
  const i = await choose('Yashirish', ['1 kun', '3 kun', '5 kun']);
  if (i < 0) return;
  const l = listingById(lid)!;
  l.status = 'yashirin'; l.hiddenUntil = now() + [1, 3, 5][i] * DAY_MS;
  db.complaints.filter((c) => c.listingId === lid).forEach((c) => { c.resolved = true; });
  audit(`E’lon yashirildi (${[1, 3, 5][i]} kun)`, lid);
  save();
  if (cur().n === 'aH') stack.pop();
  render();
}
async function listingMenu(lid: string) {
  const l = listingById(lid)!;
  const i = await choose(title(db, l), ['Yashirish 1/3/5 kun', 'Rad etish', 'Egasini ochish']);
  if (i === 0) return hideListing(lid);
  if (i === 1) return rejectListing(lid);
  if (i === 2) return goA('aI', l.owner);
}
async function addDistrict() {
  const name = await N.prompt('Hudud qo‘shish', 'Hudud nomi (lotin)', '');
  if (!name?.trim()) return;
  const cyr = await N.prompt('Hudud qo‘shish', 'Hudud nomi (kirill)', '');
  const coords = await N.prompt('Hudud qo‘shish', 'Markaz: kenglik, uzunlik (masalan 41.31, 69.27). Bo‘sh qoldirsangiz, hozirgi joylashuv olinadi.', '');
  let lat: number | undefined, lng: number | undefined;
  const m = (coords || '').match(/(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)/);
  if (m) { lat = Number(m[1]); lng = Number(m[2]); } else { const p = await N.locate(); if (p && p !== 'fail') { lat = p.lat; lng = p.lng; } }
  if (lat == null || lng == null) return N.alert('Markaz nuqtasi topilmadi.');
  db.districts.push({ name: name.trim(), cyr: (cyr || '').trim() || name.trim(), lat, lng, enabled: true, region: nearestDistrict(db, lat, lng).region });
  audit('Hudud qo‘shildi', name.trim()); save(); render();
}

async function exportExcel() {
  const rows = db.payments.map((p) => ({ Sana: fullDate(p.at), Buyurtma: p.order, 'Odam ID': p.userId, 'E’lon': listingById(p.listingId) ? title(db, listingById(p.listingId)!) : p.listingId, Ilova: appName(p.app), Summa: p.amount, Holat: p.status, Sinov: p.test ? 'ha' : '' }));
  const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Sana: '', Buyurtma: '', 'Odam ID': '', 'E’lon': '', Ilova: '', Summa: '', Holat: '' }]);
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'To‘lovlar');
  const b64 = XLSX.write(wb, { type: 'base64', bookType: 'xlsx' });
  audit('Excel yuklab olindi'); save();
  await N.shareFile(`ish-bor-tolovlar-${dmy(now())}.xlsx`, b64, 'To‘lovlar');
}

/* ---------- Sinov odamlari (13.3) ---------- */
async function actAs(i: number) {
  if (i === 0) { db.acting = db.ownerId; }
  else {
    const id = `test${i}`;
    if (!userById(id)) db.users.push({ id, name: `Sinov odam ${i}`, createdAt: now(), script: owner()?.script || 'lat', theme: owner()?.theme || 'dark', test: true });
    db.acting = id;
  }
  save(); adminIn = false; stack = [{ n: 'home' }]; sheetS = null; render(true);
}

/* ---------- Vaqt bo‘yicha qoidalar (5.3, 5.4, 4.3, 3.13) ---------- */
const KEEP_Q = 'E’loningiz tursinmi, yangilaysizmi yoki o‘chirilsinmi?';
const KEEP_WARN = 'Bugun e’loningizni yangilang, bo‘lmasa kechqurun ro‘yxatdan o‘chib ketadi.';
const KEEP_BTNS = ['Tursin', 'Yangilash', 'O‘chirish'];

export async function tick() {
  const t = now();
  const gone: Listing[] = [];
  for (const l of [...db.listings]) {
    const n = (l.notified ||= {});
    if (N.native) for (const k of ['ks0', 'ks1', 'ks2']) { const at = n[k]; if (at && at <= t && at > (n.keepAsk || 0)) n.keepAsk = at; }
    if (l.status === 'yashirin' && l.hiddenUntil && l.hiddenUntil <= t) { l.status = 'faol'; l.hiddenUntil = undefined; }
    if (l.kind === 'bor' && l.status === 'faol' && l.when && t >= closeAt(l)!) {
      l.status = 'yopilgan'; l.closedAt = t; pauseTop(l, t);
      db.auto.unshift({ id: uid('a'), at: t, rule: '“Qachon” o‘tdi → yopildi', listingId: l.id, prev: 'faol' });
      note(l.owner, 'E’loningiz yopildi. Hali kerak bo‘lsa — qayta joylang.', ['Qayta joylash'], 'my');
    }
    if (l.topUntil && l.status === 'faol') {
      if (l.topUntil > t && l.topUntil - t <= DAY_MS && n.soon !== l.topUntil) { n.soon = l.topUntil; note(l.owner, 'TOP ertaga tugaydi. Uzaytirasizmi?', ['Uzaytirish'], `top_${l.id}`); }
      if (l.topUntil <= t && n.end !== l.topUntil) {
        n.end = l.topUntil;
        db.auto.unshift({ id: uid('a'), at: t, rule: 'TOP muddati tugadi', listingId: l.id });
        note(l.owner, 'TOP muddati tugadi. E’loningiz oddiy tartibda turibdi.');
      }
    }
    if (l.kind === 'kerak' && l.status === 'faol') {
      const today = dayStart(t);
      if (l.busy && (l.days.length === 0 || l.days.includes(weekday(t))) && t >= today + 8 * 3600e3 && (n.busyAsk || 0) < today) {
        n.busyAsk = t; note(l.owner, 'Bugun bo‘shmisiz?', ['Ha', 'Yo‘q'], `busy_${l.id}`);
      }
      if (l.keep && t - l.createdAt >= 7 * DAY_MS) l.createdAt = t;
    }
    const k = keepStep(l, t);
    if (k === 'delete') { gone.push(l); continue; }
    if (k) { n.keepAsk = t; note(l.owner, k === 'warn' ? KEEP_WARN : KEEP_Q, KEEP_BTNS, `keep_${l.id}`); }
  }
  if (gone.length) {
    gone.forEach((l) => { db.auto.unshift({ id: uid('a'), at: t, rule: '3 kun yangilanmadi → o‘chirildi', listingId: l.id }); deleteListing(l); });
    note(gone[0].owner, 'E’loningiz yangilanmagani uchun ro‘yxatdan o‘chirildi. Kerak bo‘lsa, yangi e’lon joylang.');
  }
  const a = db.admin;
  if (a?.lockUntil && a.lockUntil <= t) a.lockUntil = undefined;
  save();
  await flushNotes();
  scheduleFuture();
}

/** Bot xabarlarini bildirishnoma qilib chiqarish */
export async function flushNotes() {
  while (outbox.length) {
    const n = outbox.shift()!;
    const to = userById(n.to);
    const who = to && to.id !== db.ownerId ? ` · ${to.name}` : '';
    const yesno = !n.btns ? false : n.btns[0] === 'Ha' ? true : n.btns[0] === 'Tursin' ? 'keep' as const : false;
    await N.notify(`Ish bor${who}`, n.text, { p: n.p || '', to: n.to }, yesno);
  }
}

/** Ilova yopiq bo‘lganda ham keladigan oldindan rejalangan xabarlar */
let scheduled: number[] = [];
function scheduleFuture() {
  if (!N.native) return;
  void N.cancelNotify(scheduled);
  scheduled = [];
  const t = now(); const off = db.timeOffset || 0;
  let id = 500;
  for (const l of db.listings.filter((x) => x.status === 'faol')) {
    const add = (at: number, text: string, p?: string) => { if (at > t && at - t < 60 * DAY_MS) { const nid = id++; scheduled.push(nid); void N.notify('Ish bor', text, { p: p || '', to: l.owner }, false, at - off, nid); } };
    if (l.kind === 'bor' && l.when) add(closeAt(l)!, 'E’loningiz yopildi. Hali kerak bo‘lsa — qayta joylang.', 'my');
    if (l.topUntil && l.topUntil > t) { add(l.topUntil - DAY_MS, 'TOP ertaga tugaydi. Uzaytirasizmi?', `top_${l.id}`); add(l.topUntil, 'TOP muddati tugadi. E’loningiz oddiy tartibda turibdi.'); }
    // “Tursinmi?” savollari ilova yopiq bo‘lsa ham keladi; keyin ilova ularni qayta yubormaydi (ks0..ks2).
    const n = (l.notified ||= {});
    const asks: [number, string][] = l.kind === 'bor'
      ? [1, 2, 3].map((d) => [dayStart(l.confirmAt || l.createdAt) + d * DAY_MS + 9 * 3600e3, d === 3 ? KEEP_WARN : KEEP_Q] as [number, string])
      : [[(n.keepAsk || l.confirmAt || l.createdAt) + 3 * DAY_MS, KEEP_Q]];
    asks.forEach(([at, text], i) => { n['ks' + i] = at; if (at > t && at - t < 60 * DAY_MS) { const nid = id++; scheduled.push(nid); void N.notify('Ish bor', text, { p: `keep_${l.id}`, to: l.owner }, 'keep', at - off, nid); } });
  }
  save();
}

function onNotification(p?: string, actionId?: string, extra?: Record<string, string>) {
  if (extra?.to && userById(extra.to) && db.acting !== extra.to) { db.acting = extra.to; save(); }
  const [k, id] = (p || '').split('_');
  if (k === 'busy' && (actionId === 'ha' || actionId === 'yoq')) { const l = listingById(id); if (l && actionId === 'ha') { l.busy = false; save(); } return render(); }
  if (k === 'keep' && actionId && ['tursin', 'yangila', 'ochir'].includes(actionId)) {
    const l = listingById(id);
    if (l) keepAnswer(l, actionId);
    return render();
  }
  if (p === 'my') return reset('profile');
  if (k === 'top' && listingById(id)) { stack = [{ n: 'profile' }, { n: 'tarif', p: id }]; return render(true); }
  if (k === 'listing' && listingById(id)) return openListing(id);
  if (k === 'busy' && listingById(id)) { stack = [{ n: 'profile' }, { n: 'mykerak', p: id }]; return render(true); }
  if (k === 'keep' && listingById(id)) { const l = listingById(id)!; stack = [{ n: 'profile' }, { n: l.kind === 'bor' ? 'mybor' : 'mykerak', p: id }]; return render(true); }
  reset('home');
}

/** “Tursin / Yangilash / O‘chirish” javobi */
function keepAnswer(l: Listing, a: string) {
  const t = now(); const n = (l.notified ||= {});
  if (a === 'ochir') { deleteListing(l); return; }
  if (a === 'yangila') { l.createdAt = t; l.confirmAt = t; n.keepAsk = t; if (l.status === 'yopilgan' && l.kind === 'bor') return save(); }
  if (a === 'tursin') {
    if (l.kind === 'kerak') l.keep = true;
    // Ish beruvchi oxirgi kuni “Tursin” desa ham javob berdi: yana 3 kun turadi.
    else if (Math.round((dayStart(t) - dayStart(l.confirmAt || l.createdAt)) / DAY_MS) >= 3) l.confirmAt = t;
  }
  save();
}

/* ---------- Boshlash ---------- */
async function firstRun() {
  render();
  let name: string | null = null;
  while (!name || !name.trim()) name = await N.prompt('Ish bor', 'Ismingiz', '');
  const u: User = { id: 'owner', name: name.trim().replace(/\s+/g, ' ').split(' ')[0], surname: name.trim().split(/\s+/)[1], createdAt: now(), script: /^ru/.test(navigator.language || '') ? 'ru' : navigator.language?.match(/^(uk|be|kk|ky|tg)/) ? 'cyr' : 'lat', theme: 'auto' };
  db.users.push(u); db.ownerId = u.id; db.acting = u.id;
  await askPhone(u);
  save(); render(true);
}

async function boot2() {
  if (db.settings.maintenance && !isAdminPhone(me())) { stack = [{ n: 'maint' }]; render(); return false; }
  if (cur().n === 'maint') reset('home');
  return true;
}

export async function start(el: HTMLElement) {
  root = el;
  await load();
  ensureAdmin();
  ui.mic = await N.speechAvailable();
  el.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-a]') as HTMLElement | null;
    if (!t) return;
    e.preventDefault();
    void act(t.dataset.a!, t.dataset.v, t);
  });
  el.addEventListener('input', (e) => {
    const t = e.target as HTMLInputElement;
    const k = t.dataset.in;
    if (!k) return;
    if (cur().n.startsWith('a')) adminLast = Date.now();
    if (k === 'q') { ui.q = t.value; ui.page = 1; debounce(render, 300); return; }
    if (k === 'rq') { cur().p.q = t.value; cur().p.fold = false; return render(); }
    if (k === 'izoh') { draft().bor.izoh = t.value.slice(0, 300); save(); return; }
    if (k === 'extra') { sheetS!.p.text = t.value.slice(0, 300); const c = root.querySelector('[data-count]'); if (c) c.textContent = `${t.value.length} / 300`; return render(); }
    if (k === 'acode') { ui.acode = t.value.slice(0, 12); ui.aerr = false; return render(); }
    if (k === 'mprice' || k === 'mdays') { t.value = t.value.replace(/\D/g, ''); t.size = Math.max(1, t.value.length); ui[k] = t.value; return render(); }
    ui[k] = t.value;
    if (['gcur', 'gnew', 'grep'].includes(k)) ui.gerr = '';
    render();
  });
  el.addEventListener('keydown', (e) => {
    const t = e.target as HTMLInputElement;
    if (e.key === 'Enter' && t.dataset.in === 'acode') void act('alogin', undefined, root.querySelector('[data-a="alogin"]') as HTMLElement || t);
    if (e.key === 'Enter' && t.dataset.in === 'q') t.blur();
  });
  window.addEventListener('scroll', () => {
    if (cur().n === 'list' && window.innerHeight + window.scrollY > document.body.scrollHeight - 300) {
      const total = search(db, me(), { kind: ui.listKind, jobs: ui.fjobs, gender: ui.fgender, q: ui.q }, now()).length;
      if (ui.page * 20 < total) { ui.page++; render(); }
    }
  }, { passive: true });
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => render());
  await N.notifyInit(onNotification);
  if (N.native) {
    void App.addListener('backButton', () => back());
    void App.addListener('appStateChange', (s) => { if (s.isActive) { void tick().then(() => render()); } else void flush(); });
  }
  setInterval(() => {
    const s = cur();
    if (s.n.startsWith('a') && s.n !== 'aLogin') {
      if (Date.now() - adminLast > db.settings.sessionMin * 60e3) return exitAdmin();
      const c = root.querySelector('[data-clock]'); if (c) c.textContent = clock();
    }
    if (s.n === 'aLogin' && db.admin?.lockUntil) render();
  }, 1000);
  setInterval(() => { void tick().then(() => render()); }, 60e3);
  if (!db.ownerId) await firstRun();
  const u = me(); if (u) { u.lastSeen = now(); save(); }
  await tick();
  if (await boot2()) render(true);
}

let dT: ReturnType<typeof setTimeout> | undefined;
function debounce(f: () => void, ms: number) { clearTimeout(dT); dT = setTimeout(f, ms); }

export const _test = { act, ui, get stack() { return stack; }, set stack(v) { stack = v; }, get sheet() { return sheetS; }, set sheet(v) { sheetS = v; }, render, db: () => db, tick, payResult, JOB_TYPES, ADMIN };
