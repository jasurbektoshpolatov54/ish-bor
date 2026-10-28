// Ilova qoidalari (SPEC 4–5). Faqat sof funksiyalar: APK’dagi LocalApi ham, keyingi server ham shularni ishlatadi.
import type { DB, Listing, User, ForWhom, Gender } from './types';
import { RADIUS_KM } from './seed';
import { DAY_MS, dayStart } from './format';
import { word } from '../ui/cyr';

export function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371, r = Math.PI / 180;
  const dLat = (lat2 - lat1) * r, dLng = (lng2 - lng1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export const jobName = (db: DB, id: string) => db.jobTypes.find((j) => j.id === id)?.name ?? id;
export const jobIcon = (db: DB, id: string) => db.jobTypes.find((j) => j.id === id)?.icon ?? 'dots';

/** 4.2: e’lon nomi o‘zi yasaladi */
export function title(db: DB, l: Listing) {
  if (l.kind === 'bor') return `${jobName(db, l.jobs[0])}, ${l.people} ta ishchi`;
  const u = db.users.find((x) => x.id === l.owner);
  return personTitle(u);
}
export const personTitle = (u?: User) => (u ? (u.surname ? `${u.name} ${u.surname[0]}.` : u.name) : '');

export const isTop = (l: Listing, now: number) => !!l.topUntil && l.topUntil > now && l.status === 'faol';

/** Matnni qidiruv uchun bir xil ko‘rinishga keltiradi: kichik harf, kirill */
export function norm(s: string) {
  const t = (s || '').replace(/[ʻ'`’]/g, '‘').toLowerCase();
  return t.replace(/[a-z][a-z‘]*/g, (w) => word(w)).replace(/ъ/g, '');
}

export interface Filter {
  kind: 'bor' | 'kerak';
  jobs?: string[];
  gender?: 'farqi' | 'erkak' | 'ayol';
  q?: string;
}

/** Ko‘ruvchi nuqtasi: lokatsiya yoki tuman markazi */
export function viewerPoint(db: DB, u?: User): { lat: number; lng: number } | undefined {
  if (!u) return;
  if (u.lat != null && u.lng != null) return { lat: u.lat, lng: u.lng };
  const d = db.districts.find((x) => x.name === u.district);
  return d ? { lat: d.lat, lng: d.lng } : undefined;
}

export function distanceTo(db: DB, viewer: User | undefined, l: Listing) {
  const p = viewerPoint(db, viewer);
  return p ? haversine(p.lat, p.lng, l.lat, l.lng) : undefined;
}

export function isPublic(db: DB, l: Listing, now: number) {
  if (l.status !== 'faol') return false;
  if (l.hiddenUntil && l.hiddenUntil > now) return false;
  const o = db.users.find((u) => u.id === l.owner);
  return !!o && !o.blocked;
}

export function matches(db: DB, l: Listing, viewer: User | undefined, f: Filter, now: number) {
  if (l.kind !== f.kind || !isPublic(db, l, now)) return false;
  if (f.jobs && f.jobs.length) {
    if (l.kind === 'bor' && !l.jobs.some((j) => f.jobs!.includes(j))) return false;
    if (l.kind === 'kerak' && !l.anyJob && !l.jobs.some((j) => f.jobs!.includes(j))) return false;
  }
  if (f.gender && f.gender !== 'farqi') {
    if (l.kind === 'bor' && !(l.forWhom === f.gender || l.forWhom === 'farqi')) return false;
    if (l.kind === 'kerak' && l.gender !== f.gender) return false;
  }
  if (viewer && viewer.radius != null && (viewer.district || viewer.lat != null)) {
    const d = distanceTo(db, viewer, l);
    if (d != null) {
      if (d > RADIUS_KM[viewer.radius]) return false;
      if (d > RADIUS_KM[l.radius]) return false;
    }
  }
  if (f.q && f.q.trim()) {
    const o = db.users.find((u) => u.id === l.owner);
    const hay = norm([title(db, l), l.izoh, l.extra, l.district, ...l.jobs.map((j) => jobName(db, j)), l.anyJob ? 'Istalgan ish' : '', l.kind === 'kerak' ? o?.name : ''].join(' '));
    if (!norm(f.q).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** 4.3: avval filtrga mos TOP (yoqilgan vaqti bo‘yicha), keyin yangisidan eskisiga */
export function sortListings(ls: Listing[], now: number) {
  return [...ls].sort((a, b) => {
    const ta = isTop(a, now), tb = isTop(b, now);
    if (ta !== tb) return ta ? -1 : 1;
    if (ta && tb) return (b.topStarted || 0) - (a.topStarted || 0);
    return b.createdAt - a.createdAt;
  });
}

export function search(db: DB, viewer: User | undefined, f: Filter, now: number) {
  return sortListings(db.listings.filter((l) => matches(db, l, viewer, f, now)), now);
}

/** 5.5: shubhali so‘z, karta raqami yoki telefon raqami */
export function suspicious(text: string, words: string[]) {
  if (!text) return false;
  const n = norm(text);
  if (words.some((w) => w && n.includes(norm(w)))) return true;
  const digits = text.replace(/[\s\-()]/g, '');
  if (/\d{16}/.test(digits)) return true;
  if (/(\+?998)?\d{9}/.test(digits)) return true;
  return false;
}

/** 5.5: avtomatik yashirish chegarasi */
export function complaintTrigger(db: DB, listingId: string) {
  const cs = db.complaints.filter((c) => c.listingId === listingId && !c.resolved);
  const people = new Set(cs.map((c) => c.by)).size;
  const money = new Set(cs.filter((c) => c.reason === 0).map((c) => c.by)).size;
  return people >= db.settings.complaintThreshold || money >= db.settings.moneyThreshold;
}

/** 5.3: “Qachon” kunining ertasi 00:00 */
export const closeAt = (l: Listing) => (l.when ? dayStart(l.when) + DAY_MS : undefined);

/** 4.3: TOP to‘xtatish va davom ettirish */
export function pauseTop(l: Listing, now: number) {
  if (l.topUntil && l.topUntil > now) l.topPausedLeft = l.topUntil - now;
  l.topUntil = undefined;
}
export function resumeTop(l: Listing, now: number) {
  if (l.topPausedLeft) { l.topUntil = now + l.topPausedLeft; l.topStarted = now; l.topPausedLeft = undefined; }
}
export function extendTop(l: Listing, days: number, now: number) {
  const base = Math.max(now, l.topUntil || 0);
  if (!l.topUntil || l.topUntil <= now) l.topStarted = now;
  l.topUntil = base + days * DAY_MS;
}

export const genderLabel = (g?: ForWhom | Gender) => (g === 'erkak' ? 'Erkak' : g === 'ayol' ? 'Ayol' : 'Farqi yo‘q');

export function nearestDistrict(db: DB, lat: number, lng: number) {
  let best = db.districts[0], bd = Infinity;
  for (const d of db.districts.filter((x) => x.enabled)) {
    const k = haversine(lat, lng, d.lat, d.lng);
    if (k < bd) { bd = k; best = d; }
  }
  return best;
}

/** G: yangi kod shartlari */
export const codeRules = (c: string) => [c.length === 12, /[A-Za-z]/.test(c) && /\d/.test(c) && /^[A-Za-z0-9]*$/.test(c)];
