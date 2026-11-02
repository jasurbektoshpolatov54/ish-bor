// Oddiy tekshiruv: node worker/test.mjs
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import bot, { checkInitData, priceFor } from './bot.js';

const TOKEN = '123:ABC';
const kv = new Map();
const STORE = {
  async get(k, t) { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; },
  async put(k, v) { kv.set(k, v); },
  async list({ prefix, limit }) { return { keys: [...kv.keys()].filter((k) => k.startsWith(prefix)).sort().slice(0, limit).map((name) => ({ name })) }; },
};
const env = { STORE, BOT_TOKEN: TOKEN, WEBHOOK_SECRET: 's', APP_URL: 'https://x.github.io/ish-bor/', TOLOV: 'off', TOP_SOUM: '5000', STAR_USD: '0.02', TOP_DAYS: '7', USD_RATE_FALLBACK: '12500' };
const calls = [];
globalThis.fetch = async (u, o) => {
  if (String(u).includes('cbu.uz')) { if (globalThis.cbuDown) throw new Error('522'); return { ok: true, json: async () => [{ Ccy: 'USD', Rate: '12345.67', Date: '31.10.2026' }] }; }
  if (String(u).includes('currency-api')) return { ok: true, json: async () => ({ date: '2026-10-31', usd: { uzs: 12600.123 } }) };
  const m = String(u).split('/').pop(); const b = JSON.parse(o.body); calls.push([m, b]);
  return { json: async () => ({ ok: true, result: m === 'createInvoiceLink' ? 'https://t.me/$inv' : m === 'getMyStarBalance' ? { amount: 21 } : m === 'sendMessage' ? { message_id: 1000 + calls.length } : true }) };
};

function initData(user, t = Math.floor(Date.now() / 1000)) {
  const p = new URLSearchParams({ auth_date: String(t), query_id: 'q', user: JSON.stringify(user) });
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return p.toString();
}

const req = (path, body, headers = {}) => bot.fetch(new Request('https://w.dev' + path, body ? { method: 'POST', body: JSON.stringify(body), headers } : {}), env);
const H = { 'X-Telegram-Bot-Api-Secret-Token': 's' };
// To'lov o'chiq (hozirgi holat): narx/hisob yo'q, to'lov buyruqlari jim, /start ishlaydi
assert.equal((await req('/narx')).status, 404);
assert.equal((await req('/invoice', { initData: initData({ id: 7 }), order: 'IB-1' })).status, 404);
assert.match(await (await req('/')).text(), /ishlayapti/);
for (const text of ['/paysupport', '/terms']) { const k = calls.length; await req('/tg', { message: { message_id: 1, chat: { id: 7 }, from: { id: 7 }, text } }, H); assert.equal(calls.length, k, text + ' jim bo‘lishi kerak'); }
await req('/tg', { pre_checkout_query: { id: 'pq0', from: { id: 7 }, currency: 'XTR', total_amount: 21, invoice_payload: 'x' } }, H);
assert.equal(calls.at(-1)[1].ok, false);
// /start: avval til so'raladi, tanlangach rasmli salomlashuv (ilova shu tilda ochiladi)
await req('/tg', { message: { message_id: 1, chat: { id: 7 }, from: { id: 7, first_name: 'Jasur', language_code: 'ru' }, text: '/start' } }, H);
assert.match(calls.at(-1)[1].text, /Tilni tanlang/);
assert.deepEqual(calls.at(-1)[1].reply_markup.inline_keyboard[0].map((x) => x.callback_data), ['lang:lat', 'lang:cyr', 'lang:ru']);
await req('/tg', { callback_query: { id: 'cb1', from: { id: 7, first_name: 'Jasur' }, data: 'lang:lat', message: { message_id: 50, chat: { id: 7 }, text: 'Tilni tanlang · Тилни танланг · Выберите язык' } } }, H);
assert.ok(calls.some((c) => c[0] === 'answerCallbackQuery'));
assert.ok(calls.some((c) => c[0] === 'deleteMessage' && c[1].message_id === 50));
let g = calls.at(-1);
assert.equal(g[0], 'sendPhoto'); assert.equal(g[1].photo, env.APP_URL + 'bot-salom.png');
assert.match(g[1].caption, /Assalomu alaykum, Jasur!/);
assert.equal(g[1].reply_markup.inline_keyboard[0][0].web_app.url, env.APP_URL + '?lang=lat');
// keyingi /start — til eslab qolingan, darhol salomlashuv
await req('/tg', { message: { message_id: 2, chat: { id: 7 }, from: { id: 7, first_name: 'Jasur' }, text: '/start' } }, H);
assert.equal(calls.at(-1)[0], 'sendPhoto');
// tilni o'zgartirish
await req('/tg', { callback_query: { id: 'cb2', from: { id: 7 }, data: 'lang?', message: { message_id: 51, chat: { id: 7 } } } }, H);
assert.match(calls.at(-1)[1].text, /Tilni tanlang/);
await req('/tg', { callback_query: { id: 'cb3', from: { id: 7, first_name: '<b>' }, data: 'lang:ru', message: { message_id: 52, chat: { id: 7 }, text: 'Tilni tanlang · Тилни танланг · Выберите язык' } } }, H);
g = calls.at(-1); assert.match(g[1].caption, /Здравствуйте, &lt;b&gt;!/); assert.equal(g[1].reply_markup.inline_keyboard[0][0].text, 'Открыть');
calls.length = 0;
// Quyidagilar to'lov yoqilgan holat uchun (TOLOV=on)
env.TOLOV = 'on';

// narx
const pr = priceFor(5000, 0.02, 12345.67);
assert.equal(pr.stars, 21); assert.equal(pr.soum, 5185.18);
// imzo
assert.equal((await checkInitData(initData({ id: 7 }), TOKEN)).id, 7);
assert.equal(await checkInitData(initData({ id: 7 }).replace('id%22%3A7', 'id%22%3A8'), TOKEN), null);
assert.equal(await checkInitData(initData({ id: 7 }, 1000), TOKEN), null);

const n = await (await req('/narx')).json();
assert.equal(n.stars, 21); assert.equal(n.soum, 5185.18);
assert.equal((await req('/invoice', { initData: 'bad', order: 'IB-1' })).status, 401);
const inv = await (await req('/invoice', { initData: initData({ id: 7, language_code: 'uz' }), order: 'IB-2026-000001' })).json();
assert.equal(inv.link, 'https://t.me/$inv');
const ci = calls.find((c) => c[0] === 'createInvoiceLink')[1];
assert.equal(ci.currency, 'XTR'); assert.equal(ci.prices[0].amount, 21);
assert.equal((await req('/tg', {}, {})).status, 403);
await req('/tg', { pre_checkout_query: { id: 'pq', from: { id: 7 }, currency: 'XTR', total_amount: 21, invoice_payload: ci.payload } }, H);
assert.equal(calls.at(-1)[1].ok, true);
await req('/tg', { pre_checkout_query: { id: 'pq2', from: { id: 9 }, currency: 'XTR', total_amount: 21, invoice_payload: ci.payload } }, H);
assert.equal(calls.at(-1)[1].ok, false);
await req('/tg', { message: { message_id: 1, chat: { id: 7 }, from: { id: 7, first_name: 'Jasur' }, successful_payment: { currency: 'XTR', total_amount: 21, invoice_payload: ci.payload, telegram_payment_charge_id: 'ch1' } } }, H);
assert.match(calls.at(-1)[1].text, /21 ⭐/);
await req('/tg', { pre_checkout_query: { id: 'pq3', from: { id: 7 }, currency: 'XTR', total_amount: 21, invoice_payload: ci.payload } }, H);
assert.equal(calls.at(-1)[1].ok, false, 'ikkinchi marta to‘lab bo‘lmaydi');
// admin
const { createHash } = await import('node:crypto');
env.ADMIN_HASH = createHash('sha256').update('1234').digest('hex');
await req('/tg', { message: { message_id: 2, chat: { id: 7 }, from: { id: 7 }, text: '/tolovlar' } }, H);
assert.notEqual(calls.at(-1)[0], 'sendMessage', 'admin bo‘lmaganga javob yo‘q');
await req('/tg', { message: { message_id: 3, chat: { id: 7 }, from: { id: 7 }, text: '/admin 1234' } }, H);
await req('/tg', { message: { message_id: 4, chat: { id: 7 }, from: { id: 7 }, text: '/tolovlar' } }, H);
assert.match(calls.at(-1)[1].text, /Bot hisobida: 21 ⭐[\s\S]*IB-2026-000001/);
await req('/tg', { message: { message_id: 5, chat: { id: 7 }, from: { id: 7 }, text: '/qaytar 1' } }, H);
assert.ok(calls.some((c) => c[0] === 'refundStarPayment' && c[1].telegram_payment_charge_id === 'ch1'));
await req('/tg', { message: { message_id: 6, chat: { id: 7 }, from: { id: 7 }, text: '/start' } }, H);
assert.equal(calls.at(-1)[1].reply_markup.inline_keyboard[0][0].web_app.url, env.APP_URL + '?lang=ru');
// /savol va savol-javob (admin — 7)
await req('/tg', { message: { message_id: 21, chat: { id: 9, type: 'private' }, from: { id: 9 }, text: '/savol' } }, H);
assert.match(calls.at(-1)[1].text, /Savolingizni/);
await req('/tg', { message: { message_id: 22, chat: { id: 9, type: 'private' }, from: { id: 9, first_name: 'Ali', username: 'ali' }, text: 'E’lonni qanday o‘chiraman?' } }, H);
const q = calls.findLast((c) => c[1].chat_id === 7);
assert.match(q[1].text, /Savol — Ali @ali \(id 9\)[\s\S]*qanday o‘chiraman/);
assert.match(calls.at(-1)[1].text, /Savolingiz yuborildi/); assert.equal(calls.at(-1)[1].chat_id, 9);
const qid = 1000 + calls.indexOf(q) + 1;
await req('/tg', { message: { message_id: 23, chat: { id: 7, type: 'private' }, from: { id: 7 }, text: 'Profil → e’lon → O‘chirish', reply_to_message: { message_id: qid } } }, H);
const ans = calls.findLast((c) => c[1].chat_id === 9);
assert.match(ans[1].text, /Javob:\nProfil/);
assert.match(calls.at(-1)[1].text, /Javob yuborildi/);
// admin oddiy xabar yozsa savol bo'lib ketmaydi
const k3 = calls.length; await req('/tg', { message: { message_id: 24, chat: { id: 7, type: 'private' }, from: { id: 7 }, text: 'salom' } }, H); assert.equal(calls.length, k3);
// cbu.uz ochilmasa: ochiq kurs manbasi
kv.delete('rate'); globalThis.cbuDown = true;
const n2 = await (await req('/narx')).json();
assert.equal(n2.rateSrc, 'fx'); assert.equal(n2.rate, 12600.12); assert.equal(n2.stars, 20);
console.log('worker: hammasi to‘g‘ri');
