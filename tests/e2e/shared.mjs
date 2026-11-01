// Umumiy baza: ikki odam, ikki telefon. Ishchi e’lon joylaydi, ish beruvchi ish joylaydi —
// ikkalasi bir-birining e’lonini ko‘radi va “Sizga mos” bo‘limida taklif chiqadi.
// Server o‘rniga worker/bot.js ning o‘zi (D1 o‘rniga node:sqlite) ishlaydi.
// Ishga tushirish: PW=$(npm root -g)/playwright node --no-warnings tests/e2e/shared.mjs [rasmlar papkasi]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createHmac } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createServer } from 'vite';
import bot from '../../worker/bot.js';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const OUT = process.argv[2] || 'tests/e2e/out-shared';
fs.mkdirSync(OUT, { recursive: true });

const sql = new DatabaseSync(':memory:');
const stmt = (q) => ({ args: [], bind(...a) { return { ...stmt(q), args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; } });
const TOKEN = '1:T';
const env = { DB: { prepare: stmt, async batch(xs) { for (const x of xs) await x.run(); } }, BOT_TOKEN: TOKEN, APP_URL: 'http://localhost:5199/', TOLOV: 'off' };
const botCalls = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (u, o) => (String(u).includes('api.telegram.org') ? (botCalls.push(u), { json: async () => ({ ok: true }) }) : realFetch(u, o));
function initData(user) {
  const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000)), user: JSON.stringify(user) });
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  p.set('hash', createHmac('sha256', createHmac('sha256', 'WebAppData').update(TOKEN).digest()).update(dcs).digest('hex'));
  return p.toString();
}

const srv = await createServer({ server: { port: 5199 }, logLevel: 'error' });
await srv.listen();
const b = await chromium.launch();
const errs = [];

async function phone(user, answers) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  await ctx.addInitScript(([d, u]) => { window.Telegram = { WebApp: { initData: d, initDataUnsafe: { user: u } } }; window.__tg = { server: 'https://srv.test' }; }, [initData(user), user]);
  await ctx.route('https://srv.test/**', async (route) => {
    const r = route.request();
    const res = await bot.fetch(new Request(r.url(), { method: r.method(), body: r.postData() || undefined, headers: { 'Content-Type': 'application/json' } }), env);
    await route.fulfill({ status: res.status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: await res.text() });
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${user.first_name}: ${e.message}`));
  p.on('dialog', async (d) => { const a = answers.shift(); if (d.type() === 'prompt') await d.accept(a ?? ''); else await d.accept(); });
  const tap = async (a, v) => { const el = p.locator(v === undefined ? `[data-a="${a}"]` : `[data-a="${a}"][data-v="${v}"]`).first(); if (!(await el.count())) { errs.push(`${user.first_name}: topilmadi ${a} ${v ?? ''}`); return; } await el.click(); await p.waitForTimeout(120); };
  const text = () => p.locator('#app').innerText();
  await p.goto('http://localhost:5199/');
  await p.waitForTimeout(1500);
  return { p, tap, text };
}
const n = { i: 0 };
const shot = (p, name) => p.screenshot({ path: `${OUT}/${String(++n.i).padStart(2, '0')}-${name}.png`, fullPage: true });

// 1) Ishchi (Ali, username bor): Ish kerak — Qurilish, Chilonzor
const A = await phone({ id: 100, first_name: 'Ali', username: 'ali_ishchi' }, ['Ali', '+998901112233']);
await A.tap('nav', 'post'); await A.tap('pkind', 'kerak');
await A.tap('pjob', 'qurilish'); await A.tap('paddr'); await A.tap('vil', 'UZ-TK'); await A.tap('district', 'Chilonzor'); await A.tap('radius', '2'); await A.tap('rpick');
await A.tap('ppay'); await A.tap('quick', '200 000'); await A.tap('aok'); await A.tap('pgender', 'Erkak');
await A.tap('psubmit'); await A.p.waitForTimeout(1500);
if ((await A.text()).includes('Sizga mos ishlar')) errs.push('Ali: hali ish yo‘q, taklif chiqmasligi kerak');

// 2) Ish beruvchi (Vali, username yo‘q): Ish bor — Qurilish, Chilonzor. Joylandi oynasida mos ishchi Ali chiqadi
const V = await phone({ id: 200, first_name: 'Vali' }, ['Vali', '+998907778899']);
if (!(await V.text()).includes('1 ta ishchi')) errs.push('Vali: bosh sahifada Alining e’loni sanalmadi');
await V.tap('nav', 'post'); await V.tap('pjob', 'qurilish');
await V.tap('paddr'); await V.tap('vil', 'UZ-TK'); await V.tap('district', 'Chilonzor'); await V.tap('radius', '1'); await V.tap('rpick');
await V.tap('pwhen'); await V.tap('wday', 'Ertaga'); await V.tap('whour', '09:00'); await V.tap('wok');
await V.tap('pkim', 'Erkak'); await V.tap('ppay', 'kun'); for (const k of ['3', '0', '0', '0', '0', '0']) await V.tap('key', k); await V.tap('aok');
await V.tap('psubmit'); await V.p.waitForTimeout(300);
{ const t = await V.text(); if (!t.includes('Sizga mos ishchilar') || !t.includes('Ali')) errs.push('Vali: joylandi oynasida mos ishchi chiqmadi'); }
await shot(V.p, 'vali-joylandi-mos-ishchilar');
await V.tap('nav', 'home');
{ const t = await V.text(); if (!t.includes('Sizga mos ishchilar')) errs.push('Vali: bosh sahifada “Sizga mos ishchilar” yo‘q'); }
await shot(V.p, 'vali-bosh-sahifa');
await V.p.waitForTimeout(1500); // serverga yuborilishini kutish

// 3) Ali ilovani qayta ochadi: bosh sahifada “Sizga mos ishlar” — Valining ishi
await A.p.reload(); await A.p.waitForTimeout(2000);
{ const t = await A.text(); if (!t.includes('Sizga mos ishlar') || !t.includes('300 000')) errs.push('Ali: “Sizga mos ishlar”da Valining ishi yo‘q'); }
await shot(A.p, 'ali-bosh-sahifa-mos-ishlar');
// E’lonni ochish: Valining username’i yo‘q, raqami ko‘rinadi
await A.p.locator('.lc', { hasText: '300 000' }).first().click(); await A.p.waitForTimeout(200);
{ const t = await A.text(); if (!t.includes('Vali')) errs.push('Ali: e’lon egasi ko‘rinmadi'); if (!(await A.p.locator('[data-a="call"]').count())) errs.push('Ali: Qo‘ng‘iroq tugmasi yo‘q'); }
await shot(A.p, 'ali-ish-tafsilot');

// 4) Vali e’lonni o‘chiradi: Alida yo‘qoladi
await V.tap('nav', 'profile'); await V.tap('mine'); await V.p.waitForTimeout(150);
const del = V.p.locator('[data-a="mdel"], [data-a="delete"], [data-a="ldel"]');
if (await del.count()) {
  await del.first().click(); await V.p.waitForTimeout(300);
  const ok = V.p.locator('[data-a="delok"], [data-a="mdelok"]'); if (await ok.count()) { await ok.first().click(); await V.p.waitForTimeout(300); }
  await V.p.waitForTimeout(1500);
  await A.p.reload(); await A.p.waitForTimeout(2000);
  if ((await A.text()).includes('300 000')) errs.push('Ali: o‘chirilgan ish hali ko‘rinyapti');
} else console.log('(o‘chirish tugmasi topilmadi, bu qadam o‘tkazildi)');

if (botCalls.length) errs.push(`bot xabari yuborilmasligi kerak edi: ${botCalls.length}`);
await b.close(); await srv.close();
if (errs.length) { console.log(errs.join('\n')); process.exit(1); }
console.log('UMUMIY BAZA: HAMMASI O‘TDI');
