import type { DB, District, JobType, Settings } from './types';

export const DISTRICTS: District[] = [
  ['Bektemir', 'Бектемир', 41.209, 69.334],
  ['Chilonzor', 'Чилонзор', 41.275, 69.204],
  ['Mirobod', 'Миробод', 41.287, 69.284],
  ['Mirzo Ulug‘bek', 'Мирзо Улуғбек', 41.338, 69.335],
  ['Olmazor', 'Олмазор', 41.352, 69.212],
  ['Sergeli', 'Сергели', 41.227, 69.219],
  ['Shayxontohur', 'Шайхонтоҳур', 41.326, 69.228],
  ['Uchtepa', 'Учтепа', 41.292, 69.169],
  ['Yakkasaroy', 'Яккасарой', 41.283, 69.256],
  ['Yashnobod', 'Яшнобод', 41.294, 69.336],
  ['Yangihayot', 'Янгиҳаёт', 41.205, 69.183],
  ['Yunusobod', 'Юнусобод', 41.364, 69.287],
].map(([name, cyr, lat, lng]) => ({ name: name as string, cyr: cyr as string, lat: lat as number, lng: lng as number, enabled: true }));

export const JOB_TYPES: JobType[] = [
  ['yuk', 'Yuk tashish', 'truck'],
  ['qurilish', 'Qurilish', 'build'],
  ['tozalash', 'Tozalash', 'spark'],
  ['oshxona', 'Oshxona', 'chef'],
  ['bog', 'Bog‘', 'leaf'],
  ['tamir', 'Ta’mirlash', 'wrench'],
  ['boshqa', 'Boshqa', 'dots'],
].map(([id, name, icon]) => ({ id, name, icon }));

export const WORDS = ['oldindan', 'oldindan to‘lov', 'avans', 'o‘tkazing', 'o‘tkazib bering', 'zalog', 'garov', 'hujjat uchun pul', 'forma puli'];

export const SETTINGS: Settings = {
  topPrice: 5000, topDays: 7, complaintThreshold: 3, moneyThreshold: 2,
  sessionMin: 10, maxAttempts: 5, lockMin: 15, kerakDays: 30,
  stopPosting: false, paymentsOff: false, maintenance: false,
};

export const TRAITS = ['Tajribam bor', 'Ish qurollarim bor', 'Uzoqqa boraman', 'Har kuni'];
/** Boshqalar ko‘radigan ko‘rinishi (3.4) */
export const TRAITS_3P = ['Tajribasi bor', 'Ish qurollari bor', 'Uzoqqa boradi', 'Har kuni'];
export const RADII = ['1–5 km', '5–10 km', '10–20 km', '20–35 km', '35 km dan uzoq'];
export const RADIUS_KM = [5, 10, 20, 35, Infinity];
export const DAYS = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'];
export const REASONS = ['Ish uchun pul so‘rashdi', 'Aldov yoki yolg‘on e’lon', 'Ish haqini bermadi', 'Boshqa sabab'];
export const REJECT_REASONS = ['Ish uchun pul so‘ralgan', 'Yolg‘on ma’lumot', 'Haqoratli so‘z', 'Takroriy e’lon', 'Boshqa'];
export const PAY_APPS: [string, string, string][] = [['P', 'Payme', 'payme'], ['C', 'Click', 'click'], ['U', 'Uzum Bank', 'uzum'], ['P', 'Paynet', 'paynet'], ['M', 'Multicard', 'multicard']];

export function freshDB(): DB {
  return {
    v: 1, users: [], listings: [], complaints: [], payments: [], support: [], audit: [], auto: [], logins: [],
    jobTypes: JOB_TYPES.map((j) => ({ ...j })), districts: DISTRICTS.map((d) => ({ ...d })), words: [...WORDS],
    settings: { ...SETTINGS }, timeOffset: 0, seq: 1, orderSeq: 0, notes: [], drafts: {},
  };
}
