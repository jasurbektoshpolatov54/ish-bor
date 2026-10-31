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
const env = { STORE, BOT_TOKEN: TOKEN, WEBHOOK_SECRET: 's', APP_URL: 'https://x.github.io/ish-bor/', TOP_SOUM: '5000', STAR_USD: '0.02', TOP_DAYS: '7', USD_RATE_FALLBACK: '12500' };
const calls = [];
globalThis.fetch = async (u, o) => {
  if (String(u).includes('cbu.uz')) return { json: async () => [{ Rate: '12345.67', Date: '31.10.2026' }] };
  const m = String(u).split('/').pop(); const b = JSON.parse(o.body); calls.push([m, b]);
  return { json: async () => ({ ok: true, result: m === 'createInvoiceLink' ? 'https://t.me/$inv' : m === 'getMyStarBalance' ? { amount: 21 } : true }) };
};

function initData(user, t = Math.floor(Date.now() / 1000)) {
  const p = new URLSearchParams({ auth_date: String(t), query_id: 'q', user: JSON.stringify(user) });
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = createHmac('sha256', 'WebAppData').update(TOKEN).digest();
  p.set('hash', createHmac('sha256', secret).update(dcs).digest('hex'));
  return p.toString();
}

// narx
const pr = priceFor(5000, 0.02, 12345.67);
assert.equal(pr.stars, 21); assert.equal(pr.soum, 5185.18);
// imzo
assert.equal((await checkInitData(initData({ id: 7 }), TOKEN)).id, 7);
assert.equal(await checkInitData(initData({ id: 7 }).replace('id%22%3A7', 'id%22%3A8'), TOKEN), null);
assert.equal(await checkInitData(initData({ id: 7 }, 1000), TOKEN), null);

const req = (path, body, headers = {}) => bot.fetch(new Request('https://w.dev' + path, body ? { method: 'POST', body: JSON.stringify(body), headers } : {}), env);
const n = await (await req('/narx')).json();
assert.equal(n.stars, 21); assert.equal(n.soum, 5185.18);
assert.equal((await req('/invoice', { initData: 'bad', order: 'IB-1' })).status, 401);
const inv = await (await req('/invoice', { initData: initData({ id: 7, language_code: 'uz' }), order: 'IB-2026-000001' })).json();
assert.equal(inv.link, 'https://t.me/$inv');
const ci = calls.find((c) => c[0] === 'createInvoiceLink')[1];
assert.equal(ci.currency, 'XTR'); assert.equal(ci.prices[0].amount, 21);
const H = { 'X-Telegram-Bot-Api-Secret-Token': 's' };
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
assert.equal(calls.at(-1)[1].reply_markup.inline_keyboard[0][0].web_app.url, env.APP_URL);
console.log('worker: hammasi to‘g‘ri');
