// Umumiy baza tekshiruvi (D1 o‘rniga node:sqlite): node worker/sync-test.mjs
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import bot from './bot.js';
import { clean, savePhone, hasPhone } from './match.js';

// D1 ga o‘xshash kichik qobiq
const sql = new DatabaseSync(':memory:');
const stmt = (q) => ({
  args: [],
  bind(...a) { return { ...stmt(q), args: a }; },
  async run() { sql.prepare(q).run(...this.args); return { success: true }; },
  async all() { return { results: sql.prepare(q).all(...this.args) }; },
});
const DB = { prepare: stmt, async batch(xs) { return Promise.all(xs.map((x) => x.run())); } };

const TOKEN = '123:ABC';
const env = { DB, BOT_TOKEN: TOKEN, WEBHOOK_SECRET: 's', APP_URL: 'https://x.github.io/ish-bor/', TOLOV: 'off' };
const sent = [];
globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); sent.push([String(u).split('/').pop(), b]); return { json: async () => ({ ok: true, result: true }) }; };

function initData(user) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return p.toString();
}
async function syncAs(user, body) {
  const r = await bot.fetch(new Request('https://w.dev/api/sync', { method: 'POST', body: JSON.stringify({ initData: initData(user), ...body }) }), env);
  return { status: r.status, body: await r.json() };
}

const T0 = Date.now();
const chilonzor = { lat: 41.285, lng: 69.204 };
const ishchi = { id: 'l1', kind: 'kerak', status: 'faol', jobs: ['build'], anyJob: false, ...chilonzor, district: 'Chilonzor', radius: 2, gender: 'erkak', payType: 'kun', pay: 200000, days: [], traits: [], showPhone: true, people: 1, createdAt: T0 };
const ish = { id: 'l1', kind: 'bor', status: 'faol', jobs: ['build'], ...chilonzor, lat: 41.30, district: 'Chilonzor', radius: 1, forWhom: 'farqi', payType: 'kun', pay: 250000, days: [], traits: [], showPhone: false, people: 2, createdAt: T0 + 1 };

// Imzosiz so‘rov rad etiladi
assert.equal((await bot.fetch(new Request('https://w.dev/api/sync', { method: 'POST', body: '{}' }), env)).status, 401);
// D1 ulanmagan bo‘lsa 503
assert.equal((await bot.fetch(new Request('https://w.dev/api/sync', { method: 'POST', body: '{}' }), { ...env, DB: undefined })).status, 503);

// 1) Ishchi e’lon joylaydi: hali hech kim yo‘q
let r = await syncAs({ id: 100, first_name: 'Ali', username: 'ali' }, { me: { name: 'Ali', script: 'cyr', phone: '+998901112233' }, listings: [ishchi] });
assert.equal(r.status, 200);
assert.deepEqual(r.body.listings, []);
assert.equal(sent.length, 0);

// 2) Ish beruvchi ish joylaydi: javobda ishchining e’loni (bot xabari yuborilmaydi)
r = await syncAs({ id: 200, first_name: 'Vali' }, { me: { name: 'Vali', script: 'lat', phone: '+998907778899' }, listings: [ish] });
assert.equal(r.body.listings.length, 1);
assert.equal(r.body.listings[0].id, 'r100_l1');
assert.equal(r.body.listings[0].owner, 'tg100');
assert.equal(r.body.listings[0].txt, undefined);
const ali = r.body.users.find((u) => u.id === 'tg100');
assert.equal(ali.username, 'ali');
assert.equal(ali.phone, '+998901112233', 'showPhone yoqiq: raqam beriladi');

// 3) Raqam yuborilmasa eskisi saqlanadi
await syncAs({ id: 200, first_name: 'Vali' }, { me: { name: 'Vali' }, listings: [ish] });

// 4) Ishchi ilovani ochadi: ish beruvchining e’lonini ko‘radi; username yo‘q odamning raqami beriladi
r = await syncAs({ id: 100, first_name: 'Ali', username: 'ali' }, { me: { name: 'Ali', script: 'cyr', phone: '+998901112233' }, listings: [ishchi] });
assert.equal(r.body.listings[0].id, 'r200_l1');
assert.equal(r.body.users[0].phone, '+998907778899');

// 6) E’lon o‘chirilsa ro‘yxatdan chiqadi
await syncAs({ id: 200, first_name: 'Vali' }, { me: { name: 'Vali' }, listings: [] });
r = await syncAs({ id: 100, first_name: 'Ali', username: 'ali' }, { me: { name: 'Ali' }, listings: [ishchi] });
assert.equal(r.body.listings.filter((l) => l.kind === 'bor').length, 0);

// 7) Raqam botda yuborilgan (ilovada yo‘q): almashishda ilovaga qaytariladi
const kv = new Map();
env.STORE = { async get(k) { return kv.get(k) ?? null; }, async put(k, v) { kv.set(k, v); } };
assert.equal(await hasPhone(env, 300), false);
await savePhone(env, { id: 300, first_name: 'Soli' }, '+998935554433');
assert.equal(await hasPhone(env, 300), true);
r = await syncAs({ id: 300, first_name: 'Soli' }, { me: { name: 'Soli' }, listings: [] });
assert.equal(r.body.me.phone, '+998935554433');
// Ilovada raqam bo‘lsa, qaytarilmaydi; ilovada kiritilgan raqam ham «bor» hisoblanadi
r = await syncAs({ id: 100, first_name: 'Ali', username: 'ali' }, { me: { name: 'Ali', phone: '+998901112233' }, listings: [ishchi] });
assert.equal(r.body.me.phone, undefined);
kv.clear(); assert.equal(await hasPhone(env, 100), true);

// Noto‘g‘ri e’lon qabul qilinmaydi
assert.equal(clean({ id: 'x', kind: 'bor', status: 'faol' }), null);
assert.equal(clean({ ...ish, id: '../x' }), null);
assert.equal(clean({ ...ish, izoh: 'a'.repeat(999) }).izoh.length, 300);

assert.equal(sent.length, 0, 'bot xabari yuborilmaydi');
console.log('baza: hammasi to‘g‘ri');
