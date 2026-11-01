// Umumiy baza bilan almashish (faqat Telegram Mini App’da, server ulangan bo‘lsa).
// O‘z e’lonlari serverga yuboriladi, boshqalarning faol e’lonlari va ochiq ma’lumoti olinadi.
// Boshqalarning e’lonlari va odamlari “tg” bilan boshlanadigan egasi bilan saqlanadi va har safar yangilanadi.
import type { Listing, User } from '../core/types';
import { db, save, now } from './store';

interface Tg { server?: string }
const tg = () => (globalThis as { __tg?: Tg }).__tg;
const initData = () => (globalThis as { Telegram?: { WebApp?: { initData?: string } } }).Telegram?.WebApp?.initData || '';
const url = () => { const s = tg()?.server || ''; return /^https:\/\//.test(s) ? s.replace(/\/$/, '') : ''; };

/** Server ulanganmi (Telegram ichida va server manzili bor) */
export const serverOn = () => !!url() && !!initData();
export const isRemote = (owner?: string) => !!owner && owner.startsWith('tg');

const FIELDS: (keyof Listing)[] = ['id', 'kind', 'status', 'jobs', 'anyJob', 'izoh', 'extra', 'district', 'lat', 'lng', 'radius', 'when', 'people', 'forWhom', 'gender', 'payType', 'pay', 'days', 'traits', 'showPhone', 'busy', 'createdAt', 'confirmAt'];
const pick = (l: Listing) => Object.fromEntries(FIELDS.map((k) => [k, l[k]]));

const own = () => db.listings.filter((l) => l.owner === db.ownerId && l.status !== 'ochirilgan');
function payload() {
  const u = db.users.find((x) => x.id === db.ownerId);
  return { me: { name: u?.name, surname: u?.surname, phone: u?.phone, script: u?.script }, listings: own().map(pick) };
}

let lastSent = '';
let busy: Promise<boolean> | null = null;
let again = false;

/** Hozir almashish. Natija: o‘zgarish bo‘ldimi */
export function syncNow(): Promise<boolean> {
  if (!serverOn()) return Promise.resolve(false);
  if (busy) { again = true; return busy; }
  busy = run().finally(() => { busy = null; if (again) { again = false; void syncNow().then((ch) => ch && onChange()); } });
  return busy;
}

async function run(): Promise<boolean> {
  const p = payload();
  const sig = JSON.stringify(p);
  const body = { initData: initData(), ...p };
  let r: Response;
  try { r = await fetch(url() + '/api/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); } catch { return false; }
  if (!r.ok) return false;
  const j = await r.json().catch(() => null) as { me?: { username?: string }; users?: Partial<User>[]; listings?: Listing[] } | null;
  if (!j || !Array.isArray(j.listings) || !Array.isArray(j.users)) return false;
  lastSent = sig;
  const t = now();
  const before = JSON.stringify([db.users.filter((u) => isRemote(u.id)), db.listings.filter((l) => isRemote(l.owner))]);
  const old = new Map(db.listings.filter((l) => isRemote(l.owner)).map((l) => [l.id, l]));
  const users: User[] = j.users.filter((u) => isRemote(u.id)).map((u) => ({ id: u.id!, name: u.name || '', surname: u.surname || undefined, username: u.username || undefined, phone: u.phone || undefined, createdAt: t, script: 'lat', theme: 'auto' }));
  const ls: Listing[] = j.listings.filter((l) => isRemote(l.owner)).map((l) => ({ ...l, calls: old.get(l.id)?.calls || 0, views: old.get(l.id)?.views || 0, notified: old.get(l.id)?.notified }));
  db.users = db.users.filter((u) => !isRemote(u.id)).concat(users);
  db.listings = db.listings.filter((l) => !isRemote(l.owner)).concat(ls);
  const me = db.users.find((x) => x.id === db.ownerId);
  let changed = before !== JSON.stringify([users, ls]);
  if (me && j.me && (j.me.username || undefined) !== me.username) { me.username = j.me.username || undefined; changed = true; }
  if (changed) save();
  return changed;
}

let onChange: () => void = () => {};
let timer: ReturnType<typeof setTimeout> | undefined;
/** O‘z e’lonlari yoki ismi/raqami o‘zgargan bo‘lsa, biroz kutib serverga yuboradi */
export function watch(changed: () => void) {
  onChange = changed;
}
export function queue() {
  if (!serverOn() || JSON.stringify(payload()) === lastSent) return;
  clearTimeout(timer);
  timer = setTimeout(() => { void syncNow().then((ch) => ch && onChange()); }, 800);
}
