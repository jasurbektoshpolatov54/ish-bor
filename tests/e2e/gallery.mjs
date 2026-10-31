// Ilovaning hamma oynalarini o‘zidan suratga oladi (APK ichidagi kod bilan bir xil).
// PW=$(npm root -g)/playwright node tests/e2e/gallery.mjs <papka>
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const OUT = process.argv[2] || 'tests/e2e/gallery';
const RU = process.env.RU === '1'; // butun galereya rus tilida, tarjima qilinmagan matnlar ro‘yxati bilan
const CODE = 'Sinov1a2b3c4';
process.env.ADMIN_INITIAL_CODE = CODE;
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const srv = await createServer({ server: { port: 5196 }, logLevel: 'error' });
await srv.listen();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'dark' });
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
const answers = [];
const dlg = new Set();
if (RU) await p.addInitScript(() => { globalThis.__ruMiss = new Set(); });
p.on('dialog', async (d) => {
  if (RU && /[A-Za-z]{3}/.test(d.message().replace(/Payme|Click|Uzum|Paynet|Multicard|TOP|OK/g, ''))) dlg.add(d.message());
  const a = answers.length ? answers.shift() : undefined;
  if (d.type() === 'prompt') await d.accept(typeof a === 'string' ? a : ''); else if (d.type() === 'confirm') { if (a === false) await d.dismiss(); else await d.accept(); } else await d.accept();
});
const list = [];
const miss = new Set();
const grab = async () => { if (RU) for (const m of await p.evaluate(() => [...(globalThis.__ruMiss || [])])) miss.add(m); };
let n = 0;
async function shot(title) {
  await p.waitForTimeout(250);
  const h = await p.evaluate(() => document.querySelector('#app > .phone').getBoundingClientRect().height);
  const sheet = await p.evaluate(() => !!document.querySelector('.has-sheet'));
  if (!sheet && h > 844) await p.setViewportSize({ width: 390, height: Math.ceil(h) });
  await p.waitForTimeout(150);
  const f = `${String(++n).padStart(2, '0')}.png`;
  await p.screenshot({ path: `${OUT}/${f}` });
  await p.setViewportSize({ width: 390, height: 844 });
  list.push([f, title]); await grab();
}
const tap = async (a, v) => {
  const el = p.locator(v === undefined ? `[data-a="${a}"]` : `[data-a="${a}"][data-v="${v}"]`).first();
  if (!(await el.count())) { errs.push(`topilmadi ${a} ${v ?? ''}`); return; }
  await el.click(); await p.waitForTimeout(150);
};
const fill = async (k, v) => { await p.fill(`[data-in="${k}"]`, v); await p.waitForTimeout(100); };
const login = async () => { await tap('nav', 'profile'); await tap('admin'); await p.waitForTimeout(350); await fill('acode', CODE); await tap('alogin'); await p.waitForTimeout(1500); };

answers.push('Jasur Toshpo‘latov', '+998993200253');
await p.goto('http://localhost:5196/');
await p.waitForTimeout(1500);
if (RU) { await tap('nav', 'profile'); await tap('script', 'ru'); await tap('nav', 'home'); }
await shot('Bosh sahifa (bo‘sh)');
await tap('nav', 'list'); await shot('E’lonlar (bo‘sh)');
await tap('nav', 'post'); await shot('E’lon joylash · Ish bor');
await tap('pkind', 'kerak'); await shot('E’lon joylash · Ish kerak');
await tap('pkind', 'bor');
await tap('pjob', 'yuk'); await fill('izoh', 'Uy ko‘chirish, 3-qavatdan mebel tushirish');
await tap('paddr'); await shot('Hudud tanlash');
await fill('rq', 'qo‘qon'); await shot('Hudud · qidiruv'); await fill('rq', '');
await tap('vil', 'UZ-TK'); await shot('Hudud · Toshkent shahri');
await tap('district', 'Chilonzor'); await tap('radius', '1'); await shot('Hudud tanlandi');
await tap('rpick');
await tap('pwhen'); await tap('wday', 'Ertaga'); await tap('whour', '09:00'); await shot('Qachon? (pastdan)');
await tap('wother'); await shot('Boshqa kun (pastdan)'); await tap('wback'); await tap('wclock'); await shot('Boshqa soat (pastdan)'); await tap('wback'); await tap('wok');
await tap('ppeople', '1');
await tap('pkim', 'Erkak');
await tap('ppay', 'kun'); for (const k of ['2', '5', '0', '0', '0', '0']) await tap('key', k); await shot('Haq kiritish (pastdan)'); await tap('aok');
await shot('Forma to‘ldirildi');
await tap('psubmit'); await shot('E’lon joylandi');
await tap('nav', 'home'); await shot('Bosh sahifa (e’lon bilan)');
await tap('nav', 'profile'); await shot('Profil');
await tap('mine'); await shot('Mening e’lonim · Ish bor');
await tap('top'); await shot('TOP tarif');
await tap('topgo'); await shot('To‘lov: ilova tanlash');
answers.push(false); await tap('paygo'); await p.waitForTimeout(400); await shot('To‘lov o‘tmadi');
answers.push(true); await tap('paygo'); await p.waitForTimeout(400); answers.length = 0;
await shot('To‘lov qabul qilindi');
await tap('nav', 'profile'); await tap('mine'); await tap('top'); await shot('TOPni uzaytirish');
await tap('back'); await tap('back');
// Ish kerak
await tap('nav', 'post'); await tap('pkind', 'kerak'); await tap('pjob', 'yuk'); await tap('pjob', 'qurilish');
for (const d of ['0', '1', '2', '3', '4', '5']) await tap('pday', d);
await tap('paddr'); await tap('district', 'Chilonzor'); await tap('radius', '2'); await tap('rpick');
await tap('ppay'); await tap('quick', '200 000'); await tap('aok');
await tap('pgender', 'Erkak'); await tap('ptrait', '0'); await tap('ptrait', '1');
await tap('pextra'); await fill('extra', 'Ertalab 7 dan ishlay olaman'); await shot('Qo‘shimcha (pastdan)'); await tap('eok');
await tap('psubmit'); await shot('E’lon joylandi · Ish kerak');
await tap('nav', 'home'); await tap('nav', 'profile'); await p.locator('[data-a="mine"]').first().click(); await p.waitForTimeout(200); await shot('Mening e’lonim · Ish kerak');
await tap('kdays'); await shot('Bo‘sh kunlari (pastdan)'); await tap('kdaysok'); await tap('back');
await tap('theme'); await shot('Mavzu (pastdan)'); await tap('close');
await tap('help'); await tap('hq', '0'); await shot('Yordam'); await tap('back');
// Boshqa odam ko‘zi bilan
await login(); await shot('Nazorat · Bugun');
await tap('anav', 'y'); await tap('go', 'S'); await shot('Nazorat · Sinov');
await tap('act', '1');
await tap('nav', 'list'); await shot('E’lonlar · Ish bor');
await tap('kind', 'kerak'); await shot('E’lonlar · Ish kerak');
await tap('fjob'); await shot('Filtr: ish turi (pastdan)'); await tap('fj', 'yuk'); await tap('fjok');
await tap('fgender'); await shot('Filtr: jinsi (pastdan)'); await tap('fg', 'erkak'); await tap('fgok');
await tap('open'); await shot('Ish kerak · tafsilot'); await tap('back');
await tap('kind', 'bor'); await tap('open'); await shot('Ish bor · tafsilot');
await tap('complain'); await tap('reason', '0'); await shot('Shikoyat');
await tap('csend'); await shot('Shikoyat yuborildi');
await tap('actown');
// Nazorat
await login();
await tap('anav', 'n'); await shot('Nazorat · Navbat');
await tap('qopen'); await shot('Nazorat · Navbat elementi'); await tap('back');
await tap('anav', 'o'); await shot('Nazorat · Odamlar');
await tap('uopen', 'test1'); await shot('Nazorat · Odam kartasi'); await tap('back');
await tap('anav', 'p'); await shot('Nazorat · Pul');
await tap('popen'); await shot('Nazorat · To‘lov tafsiloti'); await tap('back');
await tap('anav', 'y'); await shot('Nazorat · Yana');
for (const [v, t] of [['G', 'Kirish kodi'], ['K', 'So‘zlar filtri'], ['L', 'Botdan xabar'], ['M', 'TOP narxi'], ['N', 'Favqulodda'], ['O', 'Kirishlar jurnali'], ['P', 'Avtomatik amallar'], ['Q', 'Hududlar va ish turlari'], ['R', 'Faol e’lonlar']]) { await tap('go', v); await shot('Nazorat · ' + t); await tap('back'); }
// Cheklangan va texnik ishlar
await tap('anav', 'o'); await tap('uopen', 'test1'); answers.push(true); await tap('ublock'); await shot('Nazorat · Bloklash sababi (pastdan)'); await tap('pickv', '0'); await tap('back');
await tap('anav', 'y'); await tap('go', 'S'); await tap('act', '1'); await tap('nav', 'post'); await shot('Cheklangan');
await tap('actown'); await login(); await tap('anav', 'y'); await tap('go', 'N'); answers.push(true); await tap('ntog', 'maintenance');
await tap('back'); await tap('go', 'S'); await tap('act', '2'); await p.reload(); await p.waitForTimeout(1500); await shot('Texnik ishlar');
// Nazoratga kirish oynasi, kirill, yorug‘
await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('ishbor_db')); d.acting = d.ownerId; d.settings.maintenance = false; localStorage.setItem('ishbor_db', JSON.stringify(d)); });
await p.reload(); await p.waitForTimeout(1500);
await tap('nav', 'profile'); await tap('admin'); await p.waitForTimeout(300); await shot('Nazorat · Kirish'); await tap('aclose');
if (!RU) await tap('script', 'cyr'); await shot('Profil · Кирилл'); await tap('nav', 'home'); await shot('Bosh sahifa · Кирилл'); await tap('nav', 'profile'); if (!RU) await tap('script', 'lat');
await tap('theme'); await tap('tpick', 'light'); await tap('tok'); await shot('Profil · Yorug‘'); await tap('nav', 'home'); await shot('Bosh sahifa · Yorug‘'); await tap('nav', 'list'); await shot('E’lonlar · Yorug‘');
// Ertasi kuni: e’lon yopiladi
await tap('nav', 'profile'); await tap('theme'); await tap('tpick', 'dark'); await tap('tok');
await login(); await tap('anav', 'y'); await tap('go', 'S'); await tap('shift', '1'); await tap('shift', '1'); await tap('back'); await tap('aexit');
await tap('nav', 'profile'); await shot('Profil · 2 kundan keyin (yopilgan)');
fs.writeFileSync(`${OUT}/list.json`, JSON.stringify(list));
if (RU) { await grab(); fs.writeFileSync(`${OUT}/ru-miss.json`, JSON.stringify({ dom: [...miss].sort(), dialogs: [...dlg] }, null, 1)); console.log('tarjimasiz:', miss.size, 'matn,', dlg.size, 'oyna'); }
console.log(list.length, 'ta oyna;', errs.length ? 'xatolar: ' + errs.join(' | ') : 'xato yo‘q');
await b.close(); await srv.close();
