import { describe, it, expect } from 'vitest';
import { freshDB } from '../../src/core/seed';
import { keepStep, search, suspicious, complaintTrigger, extendTop, isTop, codeRules, title, haversine } from '../../src/core/rules';
import { money, dist, dayName, ago, daysLabel, normPhone, maskPhone, dayStart, DAY_MS, hhmm } from '../../src/core/format';
import { pbkdf2, same } from '../../src/core/crypto';
import type { Listing, User } from '../../src/core/types';

const T = Date.UTC(2026, 9, 28, 7, 0); // 28-oktabr, Toshkent 12:00
const user = (id: string, extra: Partial<User> = {}): User => ({ id, name: id, createdAt: T, script: 'lat', theme: 'dark', ...extra } as User);
const bor = (id: string, extra: Partial<Listing> = {}): Listing => ({
  id, kind: 'bor', owner: 'o', jobs: ['yuk'], district: 'Chilonzor', lat: 41.2756, lng: 69.2034, radius: 4, people: 1, forWhom: 'farqi',
  payType: 'kun', pay: 250000, days: [], traits: [], showPhone: true, status: 'faol', createdAt: T, calls: 0, views: 0, ...extra,
} as Listing);

describe('format', () => {
  it('pul va masofa', () => {
    expect(money(250000)).toBe('250 000');
    expect(money(5000)).toBe('5 000');
    expect(dist(0.8)).toBe('800 m');
    expect(dist(1.24)).toBe('1,2 km');
  });
  it('kun nomlari (Toshkent vaqti)', () => {
    expect(dayName(T, T)).toBe('Bugun');
    expect(dayName(T + DAY_MS, T)).toBe('Ertaga');
    expect(dayName(T + 2 * DAY_MS, T)).toBe('Indinga');
    expect(hhmm(T)).toBe('12:00');
    expect(dayStart(T) + 5 * 3600e3).toBe(Date.UTC(2026, 9, 28));
  });
  it('o‘tgan vaqt', () => {
    expect(ago(T, T)).toBe('hozir');
    expect(ago(T - 5 * 60e3, T)).toBe('5 daq');
    expect(ago(T - 3 * 3600e3, T)).toBe('3 soat');
    expect(ago(T - 3 * DAY_MS, T)).toBe('3 kun');
  });
  it('bo‘sh kunlar', () => {
    expect(daysLabel([0, 1, 2, 3, 4, 5])).toBe('Du–Sha');
    expect(daysLabel([])).toBe('Har kuni');
    expect(daysLabel([0, 2, 4])).toBe('Du, Ch, Ju');
  });
  it('telefon', () => {
    expect(normPhone('90 123 45 67')).toBe('+998901234567');
    expect(normPhone('+998 (99) 320-02-53')).toBe('+998993200253');
    expect(normPhone('123')).toBeUndefined();
    expect(maskPhone('+998901234567')).toBe('+998 90 *** ** 67');
  });
});

describe('qidiruv', () => {
  it('TOP faqat mos e’lonlar ichida birinchi turadi', () => {
    const db = freshDB();
    db.users.push(user('o'));
    const a = bor('a', { createdAt: T - 1000 });
    const b = bor('b', { createdAt: T - 5000, topUntil: T + DAY_MS, topStarted: T - 4000 });
    const c = bor('c', { jobs: ['oshxona'], topUntil: T + DAY_MS, topStarted: T - 4000 });
    db.listings.push(a, b, c);
    expect(search(db, undefined, { kind: 'bor', jobs: ['yuk'] }, T).map((l) => l.id)).toEqual(['b', 'a']);
  });
  it('masofa: ko‘ruvchi va e’lon radiusi ikkalasi hisobga olinadi', () => {
    const db = freshDB();
    db.users.push(user('o'));
    const far = bor('far', { lat: 41.0, lng: 69.0 });
    const near = bor('near', { radius: 0 });
    db.listings.push(far, near);
    const v = user('v', { lat: 41.2756, lng: 69.2034, radius: 1 });
    expect(search(db, v, { kind: 'bor' }, T).map((l) => l.id)).toEqual(['near']);
    const v2 = user('v2', { lat: 41.33, lng: 69.30, radius: 4 });
    expect(haversine(41.33, 69.30, 41.2756, 69.2034)).toBeGreaterThan(5);
    expect(search(db, v2, { kind: 'bor' }, T).map((l) => l.id)).toEqual(['far']);
  });
  it('bloklangan egasi va yopilgan e’lon ko‘rinmaydi', () => {
    const db = freshDB();
    db.users.push(user('o', { blocked: true } as Partial<User>), user('p'));
    db.listings.push(bor('a'), bor('b', { owner: 'p', status: 'yopilgan' }), bor('c', { owner: 'p' }));
    expect(search(db, undefined, { kind: 'bor' }, T).map((l) => l.id)).toEqual(['c']);
  });
  it('lotin va kirill qidiruv bir xil topadi', () => {
    const db = freshDB();
    db.users.push(user('o'));
    db.listings.push(bor('a', { izoh: 'Mebel tashish kerak' }));
    expect(search(db, undefined, { kind: 'bor', q: 'mebel' }, T)).toHaveLength(1);
    expect(search(db, undefined, { kind: 'bor', q: 'мебел' }, T)).toHaveLength(1);
    expect(search(db, undefined, { kind: 'bor', q: 'oshpaz' }, T)).toHaveLength(0);
  });
  it('sarlavha', () => {
    const db = freshDB();
    expect(title(db, bor('a', { people: 3 }))).toBe('Yuk tashish, 3 ta ishchi');
  });
});

describe('xavfsizlik', () => {
  it('shubhali matn', () => {
    expect(suspicious('Oldindan 50 ming o‘tkazing', ['oldindan'])).toBe(true);
    expect(suspicious('karta 8600 1234 5678 9012', [])).toBe(true);
    expect(suspicious('qo‘ng‘iroq qiling 90 123 45 67', [])).toBe(true);
    expect(suspicious('Mebel tashish, 2 soat', ['oldindan'])).toBe(false);
  });
  it('shikoyat chegarasi: 3 kishi yoki 2 ta “pul so‘rashdi”', () => {
    const db = freshDB();
    const add = (by: string, reason: number) => db.complaints.push({ id: by + reason, listingId: 'x', by, reason, at: T } as never);
    add('u1', 1); add('u2', 2);
    expect(complaintTrigger(db, 'x')).toBe(false);
    add('u3', 3);
    expect(complaintTrigger(db, 'x')).toBe(true);
    const db2 = freshDB();
    db2.complaints.push({ id: '1', listingId: 'y', by: 'a', reason: 0, at: T } as never, { id: '2', listingId: 'y', by: 'b', reason: 0, at: T } as never);
    expect(complaintTrigger(db2, 'y')).toBe(true);
  });
  it('TOP muddati qo‘shiladi', () => {
    const l = bor('a');
    extendTop(l, 7, T);
    expect(l.topUntil).toBe(T + 7 * DAY_MS);
    expect(isTop(l, T + 6 * DAY_MS)).toBe(true);
    extendTop(l, 7, T + DAY_MS);
    expect(l.topUntil).toBe(T + 14 * DAY_MS);
    expect(l.topStarted).toBe(T);
  });
  it('Nazorat kodi qoidalari va xesh', async () => {
    expect(codeRules('abcdef123456')).toEqual([true, true]);
    expect(codeRules('abcdefghijkl')).toEqual([true, false]);
    expect(codeRules('abc12')).toEqual([false, true]);
    const h1 = await pbkdf2('Sinov1234567', '00112233445566778899aabbccddeeff', 1000);
    const h2 = await pbkdf2('Sinov1234567', '00112233445566778899aabbccddeeff', 1000);
    const h3 = await pbkdf2('Sinov1234568', '00112233445566778899aabbccddeeff', 1000);
    expect(same(h1, h2)).toBe(true);
    expect(same(h1, h3)).toBe(false);
    expect(h1).toHaveLength(64);
  });
});

describe('e’lon muddati (7-band)', () => {
  const H = 3600e3;
  const d0 = dayStart(T); // 28-oktabr 00:00 (Toshkent)
  it('ish beruvchi: har kuni bir marta so‘raladi, 3-kuni ogohlantiriladi, 4-kuni o‘chiriladi', () => {
    const l = bor('b', { createdAt: d0 + 10 * H, when: undefined });
    expect(keepStep(l, d0 + 20 * H)).toBeUndefined(); // joylangan kuni so‘ralmaydi
    expect(keepStep(l, d0 + DAY_MS + 8 * H)).toBeUndefined(); // 09:00 gacha kutadi
    expect(keepStep(l, d0 + DAY_MS + 9 * H)).toBe('ask');
    l.notified = { keepAsk: d0 + DAY_MS + 9 * H };
    expect(keepStep(l, d0 + DAY_MS + 15 * H)).toBeUndefined(); // kuniga bir marta
    expect(keepStep(l, d0 + 2 * DAY_MS + 9 * H)).toBe('ask');
    l.notified = { keepAsk: d0 + 2 * DAY_MS + 9 * H };
    expect(keepStep(l, d0 + 3 * DAY_MS + 9 * H)).toBe('warn');
    l.notified = { keepAsk: d0 + 3 * DAY_MS + 9 * H };
    expect(keepStep(l, d0 + 3 * DAY_MS + 23 * H)).toBeUndefined(); // 3-kun oxirigacha turadi
    expect(keepStep(l, d0 + 4 * DAY_MS + 1)).toBe('delete');
  });
  it('ish beruvchi yangilasa hisob qaytadan boshlanadi', () => {
    const l = bor('b', { createdAt: d0, confirmAt: d0 + 3 * DAY_MS + 10 * H });
    expect(keepStep(l, d0 + 5 * DAY_MS)).toBeUndefined();
    expect(keepStep(l, d0 + 7 * DAY_MS + 1)).toBe('delete');
  });
  it('ishchi: har 3 kunda so‘raladi, o‘zi o‘chmaydi', () => {
    const l = bor('k', { kind: 'kerak', createdAt: d0 });
    expect(keepStep(l, d0 + 2 * DAY_MS)).toBeUndefined();
    expect(keepStep(l, d0 + 3 * DAY_MS)).toBe('ask');
    l.notified = { keepAsk: d0 + 3 * DAY_MS };
    expect(keepStep(l, d0 + 5 * DAY_MS)).toBeUndefined();
    expect(keepStep(l, d0 + 6 * DAY_MS)).toBe('ask');
    expect(keepStep(l, d0 + 60 * DAY_MS)).toBe('ask');
  });
});
