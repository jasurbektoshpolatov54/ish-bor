// Mehnat boti: Telegram Stars (XTR) orqali TOP to'lovi.
// Cloudflare Worker. Telegram webhook (/tg) va Mini App uchun /narx, /invoice.
// Sozlamalar (wrangler.toml [vars]): APP_URL, TOP_SOUM, TOP_DAYS, STAR_USD, USD_RATE_FALLBACK
// Sirlar: BOT_TOKEN, WEBHOOK_SECRET, ADMIN_HASH (Nazorat kodining sha256 xeshi)
// Ma'lumotlar: KV (STORE) — inv:<id> (hisob), pay:<vaqt>:<charge> (to'lov), rate (kurs), admins

const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function hmac(key, data) {
  const k = await crypto.subtle.importKey('raw', typeof key === 'string' ? enc.encode(key) : key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', k, enc.encode(data));
}
export const sha256 = async (s) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

/** Telegram Mini App initData imzosini tekshiradi. To'g'ri bo'lsa foydalanuvchini qaytaradi. */
export async function checkInitData(initData, token, maxAgeSec = 86400, nowSec = Date.now() / 1000) {
  if (!initData) return null;
  const p = new URLSearchParams(initData);
  const hash = p.get('hash');
  if (!hash) return null;
  p.delete('hash');
  const dcs = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join('\n');
  const secret = await hmac('WebAppData', token);
  if (hex(await hmac(secret, dcs)) !== hash) return null;
  if (nowSec - Number(p.get('auth_date') || 0) > maxAgeSec) return null;
  try { return JSON.parse(p.get('user') || 'null'); } catch { return null; }
}

/** Markaziy bank dollar kursi (kuniga bir marta yangilanadi). */
async function usdRate(env) {
  const day = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Toshkent vaqti
  const c = await env.STORE.get('rate', 'json');
  if (c && c.day === day) return c;
  try {
    const r = await fetch('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/', { cf: { cacheTtl: 3600 } });
    const j = await r.json();
    const rate = Number(String(j[0].Rate).replace(',', '.'));
    if (!(rate > 1000)) throw new Error('kurs');
    const v = { day, rate, date: j[0].Date };
    await env.STORE.put('rate', JSON.stringify(v));
    return v;
  } catch {
    return c || { day, rate: Number(env.USD_RATE_FALLBACK || 12500), date: '' };
  }
}

/** TOP narxi: so'mdagi narxdan biroz yuqori bo'ladigan butun yulduz soni va uning so'mdagi aniq qiymati. */
export function priceFor(topSoum, starUsd, rate) {
  const perStar = starUsd * rate; // 1 ⭐ so'mda
  const stars = Math.max(1, Math.ceil(topSoum / perStar - 1e-9));
  const soum = Math.round(stars * perStar * 100) / 100;
  return { stars, soum, perStar: Math.round(perStar * 100) / 100 };
}
async function price(env) {
  const r = await usdRate(env);
  return { ...priceFor(Number(env.TOP_SOUM || 5000), Number(env.STAR_USD || 0.02), r.rate), days: Number(env.TOP_DAYS || 7), rate: r.rate, rateDate: r.date };
}

async function tg(env, method, body) {
  const r = await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({ ok: false }));
  if (!j.ok) console.log(method, JSON.stringify(j));
  return j;
}

const T = {
  start: {
    uz: 'Halol mehnat, vositachisiz. Bir-biringizni to‘g‘ridan-to‘g‘ri toping.\n\n👇 Ilovani ochish uchun tugmani bosing.',
    ru: 'Честный труд, без посредников. Находите друг друга напрямую.\n\n👇 Нажмите кнопку, чтобы открыть приложение.',
  },
  open: { uz: 'Ochish', ru: 'Открыть' },
  paid: {
    uz: (s, o) => `✅ To‘lov qabul qilindi: ${s} ⭐\nBuyurtma: ${o}\n\nTOP yoqildi. Ilovaga qayting.`,
    ru: (s, o) => `✅ Оплата получена: ${s} ⭐\nЗаказ: ${o}\n\nTOP включён. Вернитесь в приложение.`,
  },
  support: {
    uz: 'To‘lov bo‘yicha savol bo‘lsa, shu chatga yozing: buyurtma raqami va nima bo‘lganini. Javob shu yerga keladi.',
    ru: 'Если есть вопрос по оплате, напишите в этот чат: номер заказа и что случилось. Ответ придёт сюда.',
  },
  terms: {
    uz: 'TOP — e’lonni belgilangan kunlar davomida ro‘yxat boshida ko‘rsatish xizmati. To‘lov Telegram Stars orqali olinadi. Xizmat ko‘rsatilmasa, yulduzlar qaytariladi.',
    ru: 'TOP — показ объявления в начале списка на указанное число дней. Оплата через Telegram Stars. Если услуга не оказана, звёзды возвращаются.',
  },
};
const lang = (u) => (/^(ru|uk|be|kk)/.test(u?.language_code || '') ? 'ru' : 'uz');

async function isAdmin(env, id) {
  const a = (await env.STORE.get('admins', 'json')) || [];
  return a.includes(id);
}

async function onMessage(env, m) {
  const L = lang(m.from);
  if (m.successful_payment) {
    const sp = m.successful_payment;
    const inv = (await env.STORE.get('inv:' + sp.invoice_payload, 'json')) || {};
    const rec = { charge: sp.telegram_payment_charge_id, user: m.from.id, name: [m.from.first_name, m.from.last_name].filter(Boolean).join(' '), username: m.from.username || '', stars: sp.total_amount, order: inv.order || '', days: inv.days || 0, soum: inv.soum || 0, at: Date.now(), refunded: false };
    await env.STORE.put(`pay:${String(9e15 - rec.at).padStart(16, '0')}:${rec.charge}`, JSON.stringify(rec));
    await env.STORE.put('inv:' + sp.invoice_payload, JSON.stringify({ ...inv, paid: true, charge: rec.charge }), { expirationTtl: 30 * 86400 });
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.paid[L](rec.stars, rec.order) });
  }
  const text = (m.text || '').trim();
  const [cmd, ...args] = text.split(/\s+/);
  const c = cmd.replace(/@\w+$/, '').toLowerCase();
  if (c === '/start') {
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.start[L], reply_markup: { inline_keyboard: [[{ text: T.open[L], web_app: { url: env.APP_URL } }]] } });
  }
  if (c === '/paysupport') return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.support[L] });
  if (c === '/terms') return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.terms[L] });
  if (c === '/admin' && args[0]) {
    // Nazorat kodi bilan bir marta kirish: shu Telegram akkaunt to'lovlarni boshqaradi.
    await tg(env, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id });
    if (!env.ADMIN_HASH || (await sha256(args[0])) !== env.ADMIN_HASH) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: '✕' });
    const a = (await env.STORE.get('admins', 'json')) || [];
    if (!a.includes(m.from.id)) a.push(m.from.id);
    await env.STORE.put('admins', JSON.stringify(a));
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Nazorat ulandi.\n/tolovlar — oxirgi to‘lovlar\n/qaytar <raqam> — yulduzlarni qaytarish' });
  }
  if ((c === '/tolovlar' || c === '/qaytar') && !(await isAdmin(env, m.from.id))) return;
  if (c === '/tolovlar') {
    const list = await env.STORE.list({ prefix: 'pay:', limit: 15 });
    const rows = [];
    for (const k of list.keys) {
      const p = await env.STORE.get(k.name, 'json');
      if (p) rows.push(`${rows.length + 1}. ${p.stars} ⭐ · ${p.order} · ${p.name}${p.username ? ' @' + p.username : ''}\n   ${new Date(p.at + 5 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}${p.refunded ? ' · ↩ qaytarilgan' : ''}`);
    }
    const bal = await tg(env, 'getMyStarBalance', {});
    const b = bal.ok ? `Bot hisobida: ${bal.result.amount} ⭐\n\n` : '';
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: b + (rows.length ? rows.join('\n') + '\n\nQaytarish: /qaytar <tartib raqami>' : 'Hali to‘lov yo‘q.') });
  }
  if (c === '/qaytar') {
    const n = Number(args[0]);
    const list = await env.STORE.list({ prefix: 'pay:', limit: 15 });
    const k = list.keys[n - 1];
    const p = k && (await env.STORE.get(k.name, 'json'));
    if (!p) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Bunday to‘lov yo‘q. /tolovlar' });
    if (p.refunded) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Bu to‘lov allaqachon qaytarilgan.' });
    const r = await tg(env, 'refundStarPayment', { user_id: p.user, telegram_payment_charge_id: p.charge });
    if (!r.ok) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Qaytarilmadi: ' + (r.description || 'xato') });
    await env.STORE.put(k.name, JSON.stringify({ ...p, refunded: true }));
    await tg(env, 'sendMessage', { chat_id: p.user, text: `↩ ${p.stars} ⭐ qaytarildi (${p.order}).` });
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: `↩ ${p.stars} ⭐ qaytarildi: ${p.name}` });
  }
}

async function onPreCheckout(env, q) {
  const inv = await env.STORE.get('inv:' + q.invoice_payload, 'json');
  const ok = !!inv && !inv.paid && inv.user === q.from.id && q.currency === 'XTR' && q.total_amount === inv.stars;
  return tg(env, 'answerPreCheckoutQuery', ok ? { pre_checkout_query_id: q.id, ok: true } : { pre_checkout_query_id: q.id, ok: false, error_message: lang(q.from) === 'ru' ? 'Счёт устарел. Откройте оплату заново.' : 'Hisob eskirgan. To‘lovni qaytadan oching.' });
}

function cors(env, req) {
  const o = req.headers.get('Origin') || '';
  const allow = env.APP_URL ? new URL(env.APP_URL).origin : '*';
  return { 'Access-Control-Allow-Origin': o === allow ? o : allow, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type', 'Vary': 'Origin' };
}
const json = (h, body, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...h, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const h = cors(env, req);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });

    if (url.pathname === '/tg' && req.method === 'POST') {
      if (req.headers.get('X-Telegram-Bot-Api-Secret-Token') !== env.WEBHOOK_SECRET) return new Response('no', { status: 403 });
      const u = await req.json();
      try {
        if (u.pre_checkout_query) await onPreCheckout(env, u.pre_checkout_query);
        else if (u.message) await onMessage(env, u.message);
      } catch (e) { console.log('xato', e && e.stack); }
      return new Response('ok');
    }

    if (url.pathname === '/narx') return json(h, await price(env));

    if (url.pathname === '/invoice' && req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      const user = await checkInitData(b.initData, env.BOT_TOKEN);
      if (!user) return json(h, { error: 'auth' }, 401);
      const p = await price(env);
      const id = crypto.randomUUID();
      const order = String(b.order || '').slice(0, 40);
      const L = lang(user);
      await env.STORE.put('inv:' + id, JSON.stringify({ user: user.id, order, stars: p.stars, soum: p.soum, days: p.days, at: Date.now() }), { expirationTtl: 2 * 86400 });
      const r = await tg(env, 'createInvoiceLink', {
        title: `TOP · ${p.days} ${L === 'ru' ? 'дней' : 'kun'}`,
        description: L === 'ru' ? `Объявление ${p.days} дней в начале списка. Заказ ${order}` : `E’lon ${p.days} kun ro‘yxat boshida. Buyurtma ${order}`,
        payload: id, currency: 'XTR', prices: [{ label: 'TOP', amount: p.stars }],
      });
      if (!r.ok) return json(h, { error: 'tg' }, 502);
      return json(h, { link: r.result, stars: p.stars, soum: p.soum });
    }

    return new Response('Mehnat boti ishlayapti', { headers: h });
  },
};
