// Sana, vaqt, pul va masofa ko‘rinishlari (4.6). Vaqt doim Toshkent (UTC+5).
const TZ = 5 * 3600e3;
export const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentabr', 'oktabr', 'noyabr', 'dekabr'];
export const DAY_MS = 86400e3;

/** Toshkent bo‘yicha kun boshi (00:00) */
export const dayStart = (t: number) => Math.floor((t + TZ) / DAY_MS) * DAY_MS - TZ;
export const tk = (t: number) => new Date(t + TZ);
/** 0 = Dushanba … 6 = Yakshanba */
export const weekday = (t: number) => (tk(t).getUTCDay() + 6) % 7;
export const hhmm = (t: number) => { const d = tk(t); return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
export const dmy = (t: number) => { const d = tk(t); return `${d.getUTCDate()}-${MONTHS[d.getUTCMonth()]}`; };
export const fullDate = (t: number) => `${dmy(t)} ${tk(t).getUTCFullYear()}, ${hhmm(t)}`;

export const money = (n: number) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export function dist(km: number) {
  if (km < 1) return `${Math.max(10, Math.round((km * 1000) / 10) * 10)} m`;
  return `${(Math.round(km * 10) / 10).toFixed(1).replace('.', ',')} km`;
}

/** “Bugun”, “Ertaga”, “Indinga” yoki “12-noyabr” */
export function dayName(t: number, now: number) {
  const d = Math.round((dayStart(t) - dayStart(now)) / DAY_MS);
  return d === 0 ? 'Bugun' : d === 1 ? 'Ertaga' : d === 2 ? 'Indinga' : dmy(t);
}
export const whenLabel = (t: number, now: number) => `${dayName(t, now)}, ${hhmm(t)}`;

/** Kartadagi o‘tgan vaqt: hozir, 5 daq, 2 soat, kecha, 3 kun */
export function ago(t: number, now: number) {
  const m = Math.floor((now - t) / 60e3);
  if (m < 1) return 'hozir';
  if (m < 60) return `${m} daq`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} soat`;
  const d = Math.round((dayStart(now) - dayStart(t)) / DAY_MS);
  return d <= 1 ? 'kecha' : `${d} kun`;
}

const DAYL = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sha', 'Ya'];
/** Bo‘sh kunlari: “Du–Sha”, “Du, Ch, Ju”, “Har kuni” */
export function daysLabel(days: number[]) {
  const s = [...new Set(days)].sort((a, b) => a - b);
  if (s.length === 0 || s.length === 7) return 'Har kuni';
  if (s.length === 1) return DAYL[s[0]];
  const consecutive = s.every((d, i) => i === 0 || d === s[i - 1] + 1);
  if (consecutive && s.length >= 3) return `${DAYL[s[0]]}–${DAYL[s[s.length - 1]]}`;
  return s.map((d) => DAYL[d]).join(', ');
}

export function normPhone(s: string): string | undefined {
  let d = (s || '').replace(/\D/g, '');
  if (d.length === 9) d = '998' + d;
  if (d.length !== 12 || !d.startsWith('998')) return undefined;
  return '+' + d;
}
/** +998 90 *** ** 45 */
export const maskPhone = (p?: string) => (p ? `${p.slice(0, 4)} ${p.slice(4, 6)} *** ** ${p.slice(-2)}` : '—');
export const prettyPhone = (p: string) => `${p.slice(0, 4)} ${p.slice(4, 6)} ${p.slice(6, 9)} ${p.slice(9, 11)} ${p.slice(11)}`;
