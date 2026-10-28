// LocalApi: hamma ma’lumot telefonning o‘zida (SPEC 13.1).
import type { DB, Listing, User, Note } from '../core/types';
import { freshDB } from '../core/seed';
import { loadText, saveText } from './native';

declare const __ADMIN__: { salt: string; hash: string; iter: number } | null;
declare const __TEST_BUILD__: boolean;
export const ADMIN = typeof __ADMIN__ === 'undefined' ? null : __ADMIN__;
export const TEST_BUILD = typeof __TEST_BUILD__ === 'undefined' ? true : __TEST_BUILD__;
export const ADMIN_PHONE = '+998993200253';

const KEY = 'ishbor_db';
export let db: DB = freshDB();

export async function load() {
  const s = await loadText(KEY);
  if (s) { try { db = { ...freshDB(), ...JSON.parse(s) }; } catch { db = freshDB(); } }
  ensureAdmin();
}
export function ensureAdmin() {
  if (!db.admin && ADMIN) db.admin = { ...ADMIN, fails: 0 };
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveText(KEY, JSON.stringify(db)); }, 150);
}
export async function flush() { clearTimeout(saveTimer); await saveText(KEY, JSON.stringify(db)); }
export function replace(d: DB) { db = d; ensureAdmin(); }

export const now = () => Date.now() + (db.timeOffset || 0);
export const uid = (p: string) => `${p}${(db.seq++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const me = (): User | undefined => db.users.find((u) => u.id === db.acting);
export const owner = (): User | undefined => db.users.find((u) => u.id === db.ownerId);
export const userById = (id?: string) => db.users.find((u) => u.id === id);
export const listingById = (id?: string) => db.listings.find((l) => l.id === id);
export const isAdminPhone = (u?: User) => !!u && u.phone === ADMIN_PHONE && u.id === db.ownerId;

export function audit(action: string, obj?: string, before?: string, after?: string) {
  db.audit.unshift({ at: now(), action, obj, before, after });
  if (db.audit.length > 2000) db.audit.length = 2000;
}

/** Bot xabari: APK’da bildirishnoma bo‘lib chiqadi */
export const outbox: Note[] = [];
export function note(to: string, text: string, btns?: string[], p?: string) {
  const n: Note = { id: uid('n'), to, text, btns, p, at: now() };
  db.notes.unshift(n);
  if (db.notes.length > 300) db.notes.length = 300;
  outbox.push(n);
}

export function myListings(u: User): Listing[] {
  return db.listings.filter((l) => l.owner === u.id && l.status !== 'ochirilgan').sort((a, b) => b.createdAt - a.createdAt);
}
