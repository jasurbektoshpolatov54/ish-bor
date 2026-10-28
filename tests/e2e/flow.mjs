// Haqiqiy foydalanuvchi kabi bosib chiqadi: birinchi ochilish, e’lon joylash, TOP, shikoyat, Nazorat, Sinov.
// Ishga tushirish: PW=$(npm root -g)/playwright node tests/e2e/flow.mjs [rasmlar papkasi]
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const OUT = process.argv[2] || 'tests/e2e/out';
const CODE = 'Sinov1a2b3c4'; // faqat sinov uchun soxta kod
process.env.ADMIN_INITIAL_CODE = CODE;
fs.mkdirSync(OUT, { recursive: true });
const srv = await createServer({ server: { port: 5198 }, logLevel: 'error' });
await srv.listen();
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, colorScheme: 'dark' });
const p = await ctx.newPage();
const errs = []; const log = [];
p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
p.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
const answers = [];
p.on('dialog', async (d) => {
  const a = answers.length ? answers.shift() : undefined;
  log.push(`dialog(${d.type()}): ${d.message().slice(0, 80)} -> ${a}`);
  if (d.type() === 'prompt') await d.accept(a ?? ''); else if (d.type() === 'confirm') { if (a === false) await d.dismiss(); else await d.accept(); } else await d.accept();
});
let n = 0;
const shot = async (name) => { await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/${String(++n).padStart(2, '0')}-${name}.png`, fullPage: true }); };
const screen = () => p.evaluate(() => document.querySelector('#app > .phone')?.id);
const tap = async (a, v) => {
  const sel = v === undefined ? `[data-a="${a}"]` : `[data-a="${a}"][data-v="${v}"]`;
  const el = p.locator(sel).first();
  if (!(await el.count())) { errs.push(`topilmadi: ${sel} (${await screen()})`); return; }
  await el.click(); await p.waitForTimeout(120);
};
const fill = async (sel, val) => { if (!(await p.locator(sel).count())) { errs.push(`topilmadi: ${sel} (${await screen()})`); return; } await p.fill(sel, val); };
const expectScreen = async (s) => { const c = await screen(); if (c !== 's-' + s) errs.push(`kutilgan oyna ${s}, bor: ${c}`); };
const has = async (text) => { const t = await p.locator('#app').innerText(); if (!t.includes(text)) errs.push(`matn yo‘q: “${text}” (${await screen()})`); };

answers.push('Jasur Toshpo‘latov', '+998993200253');
await p.goto('http://localhost:5198/');
await p.waitForTimeout(1500);
await expectScreen('home'); await has('Jasur'); await shot('home');

// Ish bor e’loni
await tap('nav', 'post'); await expectScreen('post');
await tap('psubmit'); // hali tayyor emas: hech narsa bo‘lmasligi kerak
await expectScreen('post');
await tap('pjob', 'yuk');
await fill('[data-in="izoh"]', 'Mebel tashish, 3-qavat');
await tap('paddr'); await expectScreen('region'); await shot('region');
await tap('district', 'Chilonzor'); await tap('radius', '1'); await shot('region-tanlangan');
await tap('rpick'); await expectScreen('post');
await tap('pwhen'); await shot('qachon');
await tap('wday', 'Ertaga'); await tap('whour', '09:00'); await tap('wok');
await tap('pkim', 'Erkak');
await tap('ppay', 'kun'); await shot('haq');
for (const k of ['2', '5', '0', '0', '0', '0']) await tap('key', k);
await tap('aok');
await has('250 000'); await shot('forma-toliq');
await tap('psubmit'); await expectScreen('done'); await shot('joylandi');
await tap('nav', 'home'); await has('Yuk tashish'); await shot('home-elon');

// TOP
await tap('nav', 'profile'); await expectScreen('profile'); await shot('profil');
await tap('mine'); await expectScreen('mybor'); await shot('mening-elonim');
await tap('top'); await expectScreen('tarif'); await shot('tarif');
await tap('topgo'); await expectScreen('pay'); await tap('payapp', 'click'); await shot('tolov');
answers.push(true);
await tap('paygo'); await p.waitForTimeout(300);
await expectScreen('paid'); await has('TOP yoqildi'); await shot('tolov-qabul');
await tap('nav', 'profile'); await expectScreen('profile');

// Ish kerak e’loni
await tap('nav', 'post'); await tap('pkind', 'kerak'); await shot('forma-kerak');
await tap('pjob', 'yuk'); await tap('pjob', 'qurilish'); await tap('pday', '0'); await tap('pday', '1');
await tap('paddr'); await tap('district', 'Chilonzor'); await tap('radius', '2'); await tap('rpick');
await tap('ppay'); await tap('quick', '200 000'); await tap('aok');
await tap('pgender', 'Erkak'); await tap('ptrait', '1');
await tap('psubmit'); await expectScreen('done');
await tap('nav', 'home'); await tap('nav', 'list'); await tap('kind', 'kerak'); await has('200 000'); await shot('elonlar-kerak');

// Mavzu va kirill
await tap('nav', 'profile'); await tap('theme'); await tap('tpick', 'light'); await tap('tok'); await shot('yorug');
await tap('script', 'cyr'); await has('Профил'); await shot('kirill');
await tap('script', 'lat');
await tap('theme'); await tap('tpick', 'dark'); await tap('tok');

// Nazorat: xato kod, keyin to‘g‘ri kod
await tap('admin'); await expectScreen('aLogin'); await shot('nazorat-kirish');
await fill('[data-in="acode"]', 'xatokod12345'); await tap('alogin'); await p.waitForTimeout(800);
await expectScreen('aLogin');
await fill('[data-in="acode"]', CODE); await tap('alogin'); await p.waitForTimeout(1500);
await expectScreen('aB'); await shot('nazorat-bugun');
for (const [v, s] of [['n', 'aC'], ['o', 'aD'], ['p', 'aE'], ['y', 'aF']]) { await tap('anav', v); await expectScreen(s); await shot('nazorat-' + s); }
for (const v of ['G', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']) { await tap('anav', 'y'); await tap('go', v); await expectScreen('a' + v); await shot('nazorat-a' + v); await tap('back'); }
await tap('anav', 'o'); await tap('uopen', 'owner'); await expectScreen('aI'); await shot('odam-karta'); await tap('back');
await tap('anav', 'p'); await tap('popen'); await expectScreen('aJ'); await shot('tolov-tafsilot'); await tap('back');

// Sinov: boshqa odam bo‘lib shikoyat
await tap('anav', 'y'); await tap('go', 'S');
for (const i of [1, 2, 3]) {
  await tap('act', String(i)); await expectScreen('home');
  await tap('nav', 'list'); await tap('kind', 'bor'); await tap('open'); await expectScreen('bor'); if (i === 1) await shot('ish-bor-tafsilot');
  await tap('complain'); await expectScreen('complain'); await tap('reason', '1'); if (i === 1) await shot('shikoyat');
  await tap('csend'); await expectScreen('thanks');
  await tap('actown'); await expectScreen('home');
  if (i < 3) { await tap('nav', 'profile'); await tap('admin'); await fill('[data-in="acode"]', CODE); await tap('alogin'); await p.waitForTimeout(1500); await tap('anav', 'y'); await tap('go', 'S'); }
}
await tap('nav', 'list'); await tap('kind', 'bor');
const cards = await p.locator('[data-a="open"]').count();
if (cards !== 0) errs.push(`3 ta shikoyatdan keyin e’lon yashirilmadi (${cards})`);
await tap('nav', 'profile'); await tap('admin'); await fill('[data-in="acode"]', CODE); await tap('alogin'); await p.waitForTimeout(1500);
await tap('anav', 'n'); await has('Jiddiy'); await shot('navbat-shikoyat');
await tap('qopen'); await expectScreen('aH'); await shot('navbat-element'); await tap('back');

// Vaqt: +7 kun → TOP tugaydi, e’lon (ertaga) yopiladi
await tap('anav', 'y'); await tap('go', 'S'); await tap('shift', '7'); await shot('sinov-7kun');
await tap('back'); await tap('aexit'); await tap('nav', 'profile'); await has('Tekshirilmoqda'); await shot('profil-7-kundan-keyin');

console.log(log.join('\n'));
console.log(errs.length ? 'XATOLAR:\n' + errs.join('\n') : 'HAMMASI O‘TDI');
await b.close(); await srv.close();
process.exit(errs.length ? 1 : 0);
