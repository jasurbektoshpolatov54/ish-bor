// Ilova belgisi, bildirishnoma belgisi va ochilish ekranini chizadi: node tools/icons.mjs
import { createRequire } from 'node:module';
import fs from 'node:fs';
const { chromium } = createRequire(import.meta.url)(process.env.PW || 'playwright');
const RES = 'android/app/src/main/res';
const BRIEF = '<rect x="3" y="7" width="18" height="13" rx="2.6"/><path d="M8.5 7V5.4A2.4 2.4 0 0110.9 3h2.2a2.4 2.4 0 012.4 2.4V7M3 12.5h18"/>';
const coin = (s, bg) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 100 100">
<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e1ae"/><stop offset="1" stop-color="#e6c07a"/></linearGradient></defs>
${bg ? `<rect width="100" height="100" fill="${bg}"/>` : ''}
<circle cx="50" cy="50" r="${bg === null ? 30 : 40}" fill="url(#g)"/>
<g transform="translate(50 50) scale(${bg === null ? 1.55 : 2.05}) translate(-12 -11.5)" fill="none" stroke="#2a1e08" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${BRIEF}</g></svg>`;
const stat = (s) => `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${BRIEF}</svg>`;
const D = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const b = await chromium.launch();
const p = await b.newPage();
async function png(svg, w, h, file, bg = 'transparent', inner = w) {
  await p.setViewportSize({ width: w, height: h });
  await p.setContent(`<html><body style="margin:0;background:${bg};display:flex;align-items:center;justify-content:center;width:${w}px;height:${h}px">${svg.replace(/width="\d+" height="\d+"/, `width="${inner}" height="${inner}"`)}</body></html>`);
  fs.mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
  await p.screenshot({ path: file, omitBackground: bg === 'transparent' });
}
for (const [d, k] of Object.entries(D)) {
  const s = Math.round(48 * k);
  await png(coin(s, '#0b0b0e'), s, s, `${RES}/mipmap-${d}/ic_launcher.png`);
  await png(coin(s, '#0b0b0e').replace('<rect width="100" height="100"', '<circle cx="50" cy="50" r="50"').replace('fill="#0b0b0e"/>', 'fill="#0b0b0e"/>'), s, s, `${RES}/mipmap-${d}/ic_launcher_round.png`);
  const f = Math.round(108 * k);
  await png(coin(f, null), f, f, `${RES}/mipmap-${d}/ic_launcher_foreground.png`);
  const n = Math.round(24 * k);
  await png(stat(n), n, n, `${RES}/drawable-${d}/ic_stat_ishbor.png`);
  for (const o of ['port', 'land']) {
    const [w, h] = o === 'port' ? [320 * k, 480 * k] : [480 * k, 320 * k];
    await png(coin(100, ''), w, h, `${RES}/drawable-${o}-${d}/splash.png`, '#0b0b0e', Math.round(Math.min(w, h) * 0.42));
  }
}
await png(coin(100, ''), 480, 320, `${RES}/drawable/splash.png`, '#0b0b0e', 134);
await b.close();
