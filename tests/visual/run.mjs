// Ilovaning haqiqiy oynalarini maket rasmlari bilan piksel bo‘yicha solishtiradi.
// PW=$(npm root -g)/playwright node tests/visual/run.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { createServer } from 'vite';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const OUT = 'tests/visual/out';
const LIMIT = Number(process.env.LIMIT || 0.5); // foiz
fs.mkdirSync(OUT, { recursive: true });
const srv = await createServer({ server: { port: 5197 }, logLevel: 'error' });
await srv.listen();
const b = await chromium.launch();
const results = [];

const T0 = Date.UTC(2026, 9, 28, 7, 0);
const owner = (extra = {}) => ({ id: 'owner', name: '', createdAt: T0, script: 'lat', theme: 'dark', ...extra });

async function page(db, variant) {
  const p = await b.newPage({ viewport: { width: 390, height: 1600 }, deviceScaleFactor: 2, colorScheme: variant.light ? 'light' : 'dark' });
  await p.addInitScript(([d]) => { localStorage.setItem('ishbor_db', JSON.stringify(d)); }, [db]);
  p.on('dialog', (d) => d.dismiss());
  await p.goto('http://localhost:5197/');
  await p.addStyleTag({ content: '.app{--minh:844px} .app .phone{max-width:390px}' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  return p;
}
const tap = async (p, a, v) => { await p.locator(v === undefined ? `[data-a="${a}"]` : `[data-a="${a}"][data-v="${v}"]`).first().click(); await p.waitForTimeout(150); };

function compare(name, ref, got, known) {
  const A = PNG.sync.read(fs.readFileSync(ref)), B = PNG.sync.read(fs.readFileSync(got));
  const w = Math.min(A.width, B.width), h = Math.min(A.height, B.height);
  const crop = (img) => { const o = new PNG({ width: w, height: h }); PNG.bitblt(img, o, 0, 0, w, h, 0, 0); return o; };
  const a = crop(A), c = crop(B), d = new PNG({ width: w, height: h });
  const n = pixelmatch(a.data, c.data, d.data, w, h, { threshold: 0.1 });
  fs.writeFileSync(`${OUT}/${name}-diff.png`, PNG.sync.write(d));
  const pct = (n / (w * h)) * 100;
  results.push({ name, pct, known, size: `${A.width}x${A.height} / ${B.width}x${B.height}` });
}

const SETS = {
  'bosh-holat': [
    ['01-bosh-sahifa', async () => {}],
    ['02-elonlar', async (p) => { await tap(p, 'nav', 'list'); }],
    ['05-joylash-ish-bor', async (p) => { await tap(p, 'nav', 'post'); }],
    ['06-joylash-ish-kerak', async (p) => { await tap(p, 'nav', 'post'); await tap(p, 'pkind', 'kerak'); }],
    ['08-profil', async (p) => { await tap(p, 'nav', 'profile'); }],
    ['11-hudud-tanlash', async (p) => { await tap(p, 'region'); }],
  ],
};
const VARIANTS = [{ dir: 'qorongi', light: false }, { dir: 'yorug', light: true }, { dir: 'qorongi-kirill', light: false, cyr: true }, { dir: 'yorug-kirill', light: true, cyr: true }];
// Ataylab farq qiladigan oynalar (spetsifikatsiya bo‘yicha):
// joylash: APK’da Telegram username yo‘q, shuning uchun “Raqamim ko‘rinsin” majburan yoqilgan va izohi boshqa;
// hudud: maketda 6 ta tuman namuna, ilovada Toshkentning 12 tumani.
const KNOWN = { '05-joylash-ish-bor': 'raqam majburiy (username yo‘q)', '06-joylash-ish-kerak': 'raqam majburiy (username yo‘q)', '11-hudud-tanlash': '12 ta tuman' };

for (const [set, screens] of Object.entries(SETS)) for (const v of VARIANTS) for (const [name, go] of screens) {
  const ref = `design/screens/${set}/${v.dir}/${name}.png`;
  if (!fs.existsSync(ref)) continue;
  const db = { users: [owner({ theme: v.light ? 'light' : 'dark', script: v.cyr ? 'cyr' : 'lat' })], ownerId: 'owner', acting: 'owner', listings: [] };
  const p = await page(db, v);
  await go(p);
  const got = `${OUT}/${set}-${v.dir}-${name}.png`;
  await p.locator('#app > .phone').screenshot({ path: got });
  compare(`${set}-${v.dir}-${name}`, ref, got, KNOWN[name]);
  await p.close();
}
for (const r of results) console.log(`${r.pct <= LIMIT ? 'OK  ' : r.known ? 'BILAMIZ' : 'FARQ'} ${r.pct.toFixed(2).padStart(6)}%  ${r.size}  ${r.name}${r.known && r.pct > LIMIT ? '  — ' + r.known : ''}`);
await b.close(); await srv.close();
process.exit(results.every((r) => r.pct <= LIMIT || r.known) ? 0 : 1);
