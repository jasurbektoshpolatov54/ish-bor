// Mehnat boti: Telegram Stars (XTR) orqali TOP to'lovi.
// Cloudflare Worker. Telegram webhook (/tg) va Mini App uchun /narx, /invoice.
// Sozlamalar (wrangler.toml [vars]): APP_URL, TOLOV, TOP_SOUM, TOP_DAYS, STAR_USD, USD_RATE_FALLBACK
// TOLOV = "on" bo'lmasa (hozir shunday) to'lov qismi yashirin: /narx, /invoice, /paysupport, /terms javob bermaydi.
// Sirlar: BOT_TOKEN, WEBHOOK_SECRET, ADMIN_HASH (Nazorat kodining sha256 xeshi)
// Ma'lumotlar: KV (STORE) — inv:<id> (hisob), pay:<vaqt>:<charge> (to'lov), rate (kurs), admins
// Umumiy baza: D1 (DB) — odamlar va e'lonlar (worker/match.js, /api/sync)

import { sync, savePhone, hasPhone } from './match.js';

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

/** Dollar kursi. Avval Markaziy bank (cbu.uz); u chet eldan ko'pincha ochilmaydi,
 *  shunda ochiq valyuta kursi manbasi ishlatiladi (src: 'cbu' yoki 'fx'). Kuniga bir marta yangilanadi. */
async function usdRate(env) {
  const day = new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10); // Toshkent vaqti
  const c = await env.STORE.get('rate', 'json');
  if (c && c.day === day && (c.src === 'cbu' || Date.now() - (c.tried || 0) < 3600e3)) return c;
  const get = async (u, ms) => {
    const r = await fetch(u, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MehnatBot/1.0)', Accept: 'application/json' }, signal: AbortSignal.timeout(ms) });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  };
  const errs = [];
  try {
    const j = await get('https://cbu.uz/uz/arkhiv-kursov-valyut/json/USD/', 4000);
    const usd = (Array.isArray(j) ? j : []).find((x) => x.Ccy === 'USD');
    const rate = Number(String(usd && usd.Rate).replace(',', '.'));
    if (!(rate > 1000)) throw new Error('kurs topilmadi');
    const v = { day, rate, date: usd.Date, src: 'cbu', tried: Date.now() };
    await env.STORE.put('rate', JSON.stringify(v));
    return v;
  } catch (e) { errs.push('cbu: ' + (e && e.message || e)); }
  for (const u of ['https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json', 'https://latest.currency-api.pages.dev/v1/currencies/usd.json']) {
    try {
      const j = await get(u, 5000);
      const rate = Number(j && j.usd && j.usd.uzs);
      if (!(rate > 1000)) throw new Error('kurs topilmadi');
      const v = { day, rate: Math.round(rate * 100) / 100, date: j.date || '', src: 'fx', tried: Date.now() };
      await env.STORE.put('rate', JSON.stringify(v));
      return v;
    } catch (e) { errs.push('fx: ' + (e && e.message || e)); }
  }
  return c ? { ...c, err: errs.join('; ') } : { day, rate: Number(env.USD_RATE_FALLBACK || 12500), date: '', src: 'zaxira', err: errs.join('; ') };
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
  return { ...priceFor(Number(env.TOP_SOUM || 5000), Number(env.STAR_USD || 0.02), r.rate), days: Number(env.TOP_DAYS || 7), rate: r.rate, rateDate: r.date, rateSrc: r.src, ...(r.err ? { rateErr: r.err } : {}) };
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
  // /start: avval til, keyin rasmli salomlashuv (lat — lotin, cyr — kirill, ru — rus)
  pick: 'Tilni tanlang · Тилни танланг · Выберите язык',
  langs: [['lat', '🇺🇿 O‘zbekcha'], ['cyr', '🇺🇿 Ўзбекча'], ['ru', '🇷🇺 Русский']],
  hi: {
    lat: (n) => `Assalomu alaykum${n ? ', ' + n : ''}! 👋\n\n<b>Mehnat</b> — halol mehnat, vositachisiz. Ish va ishchi bir-birini to‘g‘ridan-to‘g‘ri topadi.\n\n💼 <b>Ishchi kerakmi?</b> E’lon joylang — yaqin atrofdagi mos ishchilar darhol chiqadi.\n🙋 <b>Ish qidiryapsizmi?</b> Qila oladigan ishingizni yozing — sizga mos ishlar o‘zi ko‘rsatiladi.\n🤝 <b>Bepul va to‘g‘ridan-to‘g‘ri.</b> Hech kimga oldindan pul to‘lamang.\n\n👇 Boshlash uchun «Ochish» tugmasini bosing.`,
    cyr: (n) => `Ассалому алайкум${n ? ', ' + n : ''}! 👋\n\n<b>Mehnat</b> — ҳалол меҳнат, воситачисиз. Иш ва ишчи бир-бирини тўғридан-тўғри топади.\n\n💼 <b>Ишчи керакми?</b> Эълон жойланг — яқин атрофдаги мос ишчилар дарҳол чиқади.\n🙋 <b>Иш қидиряпсизми?</b> Қила оладиган ишингизни ёзинг — сизга мос ишлар ўзи кўрсатилади.\n🤝 <b>Бепул ва тўғридан-тўғри.</b> Ҳеч кимга олдиндан пул тўламанг.\n\n👇 Бошлаш учун «Очиш» тугмасини босинг.`,
    ru: (n) => `Здравствуйте${n ? ', ' + n : ''}! 👋\n\n<b>Mehnat</b> — честный труд, без посредников. Работа и работники находят друг друга напрямую.\n\n💼 <b>Нужны работники?</b> Разместите объявление — сразу увидите подходящих рядом.\n🙋 <b>Ищете работу?</b> Напишите, что умеете, — подходящие вакансии появятся сами.\n🤝 <b>Бесплатно и напрямую.</b> Никому не платите заранее.\n\n👇 Чтобы начать, нажмите «Открыть».`,
  },
  openL: { lat: 'Ochish', cyr: 'Очиш', ru: 'Открыть' },
  langBtn: { lat: '🌐 Tilni o‘zgartirish', cyr: '🌐 Тилни ўзгартириш', ru: '🌐 Сменить язык' },
  // Telefon raqami botning o'zida so'raladi (ilovada Telegram oynachasi chiqmaydi)
  phoneAsk: {
    lat: '📱 Ish beruvchi yoki ishchi siz bilan bog‘lana olishi uchun telefon raqamingizni yuboring. Pastdagi tugmani bosing.',
    cyr: '📱 Иш берувчи ёки ишчи сиз билан боғлана олиши учун телефон рақамингизни юборинг. Пастдаги тугмани босинг.',
    ru: '📱 Чтобы работодатель или работник могли с вами связаться, отправьте свой номер телефона. Нажмите кнопку ниже.',
  },
  phoneBtn: { lat: '📱 Raqamni yuborish', cyr: '📱 Рақамни юбориш', ru: '📱 Отправить номер' },
  phoneOk: {
    lat: '✅ Raqamingiz qabul qilindi. Endi yuqoridagi «Ochish» tugmasini bosing.',
    cyr: '✅ Рақамингиз қабул қилинди. Энди юқоридаги «Очиш» тугмасини босинг.',
    ru: '✅ Номер получен. Теперь нажмите «Открыть» выше.',
  },
  phoneOwn: {
    lat: 'Iltimos, o‘z raqamingizni pastdagi tugma orqali yuboring.',
    cyr: 'Илтимос, ўз рақамингизни пастдаги тугма орқали юборинг.',
    ru: 'Пожалуйста, отправьте свой номер кнопкой ниже.',
  },
  ask: { uz: 'Savolingizni shu yerga bitta xabarda yozing. Javob shu chatga keladi.', ru: 'Напишите вопрос сюда одним сообщением. Ответ придёт в этот чат.' },
  asked: { uz: '✅ Savolingiz yuborildi. Javob shu chatga keladi.', ru: '✅ Вопрос отправлен. Ответ придёт в этот чат.' },
  answer: { uz: '💬 Javob:', ru: '💬 Ответ:' },
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
/** To'lov (TOP, Stars) yoqiqmi. Hozir ilova bepul, shuning uchun o'chiq. */
export const tolovOn = (env) => env.TOLOV === 'on';
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
  if (m.contact) return onContact(env, m);
  const text = (m.text || '').trim();
  const [cmd, ...args] = text.split(/\s+/);
  const c = cmd.replace(/@\w+$/, '').toLowerCase();
  if (c === '/start') {
    const sc = await env.STORE.get('lang:' + m.from.id);
    return sc ? greet(env, m.chat.id, m.from, sc).then(() => askPhone(env, m.chat.id, m.from, sc)) : askLang(env, m.chat.id);
  }
  if (c === '/savol') return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.ask[L] });
  // Nazorat odami savolga javob yozdi (savol xabariga «Javob berish» bilan)
  if (text && !text.startsWith('/') && m.reply_to_message && (await isAdmin(env, m.from.id))) {
    const to = await env.STORE.get(`q:${m.chat.id}:${m.reply_to_message.message_id}`, 'json');
    if (to) {
      const r = await tg(env, 'sendMessage', { chat_id: to.chat, text: `${T.answer[to.L] || T.answer.uz}\n${text}` });
      return tg(env, 'sendMessage', { chat_id: m.chat.id, text: r.ok ? '✅ Javob yuborildi.' : 'Yuborilmadi: odam botni to‘xtatgan bo‘lishi mumkin.', reply_to_message_id: m.message_id });
    }
  }
  // Oddiy xabar — savol: Nazorat odamlariga boradi
  if (text && !text.startsWith('/') && m.chat.type === 'private' && !(await isAdmin(env, m.from.id))) {
    const admins = (await env.STORE.get('admins', 'json')) || [];
    const who = [m.from.first_name, m.from.last_name].filter(Boolean).join(' ') + (m.from.username ? ` @${m.from.username}` : '');
    for (const a of admins) {
      const r = await tg(env, 'sendMessage', { chat_id: a, text: `❓ Savol — ${who} (id ${m.from.id}):\n\n${text.slice(0, 3500)}\n\nJavob berish uchun shu xabarga «Ответить / Javob berish» qilib yozing.` });
      if (r.ok) await env.STORE.put(`q:${a}:${r.result.message_id}`, JSON.stringify({ chat: m.chat.id, L }), { expirationTtl: 30 * 86400 });
    }
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.asked[L] });
  }
  if (!tolovOn(env) && ['/paysupport', '/terms', '/tolovlar', '/qaytar'].includes(c)) return;
  if (c === '/paysupport') return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.support[L] });
  if (c === '/terms') return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.terms[L] });
  if (c === '/admin' && args[0]) {
    // Nazorat kodi bilan bir marta kirish: shu Telegram akkaunt to'lovlarni boshqaradi.
    await tg(env, 'deleteMessage', { chat_id: m.chat.id, message_id: m.message_id });
    if (!env.ADMIN_HASH || (await sha256(args[0])) !== env.ADMIN_HASH) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: '✕' });
    const a = (await env.STORE.get('admins', 'json')) || [];
    if (!a.includes(m.from.id)) a.push(m.from.id);
    await env.STORE.put('admins', JSON.stringify(a));
    return tg(env, 'sendMessage', { chat_id: m.chat.id, text: 'Nazorat ulandi. Odamlarning savollari shu chatga keladi: javob berish uchun savol xabariga «Javob berish» qilib yozing.' + (tolovOn(env) ? '\n/tolovlar — oxirgi to‘lovlar\n/qaytar <raqam> — yulduzlarni qaytarish' : '') });
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

const esc = (s) => String(s || '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
function askLang(env, chat) {
  return tg(env, 'sendMessage', { chat_id: chat, text: T.pick, reply_markup: { inline_keyboard: [T.langs.map(([k, t]) => ({ text: t, callback_data: 'lang:' + k }))] } });
}
/** Rasmli salomlashuv va «Ochish» tugmasi (ilova shu tilda ochiladi) */
async function greet(env, chat, from, sc) {
  const s = T.hi[sc] ? sc : 'lat';
  const caption = T.hi[s](esc(from && from.first_name));
  const url = `${env.APP_URL}?lang=${s}`;
  const reply_markup = { inline_keyboard: [[{ text: T.openL[s], web_app: { url } }], [{ text: T.langBtn[s], callback_data: 'lang?' }]] };
  const r = await tg(env, 'sendPhoto', { chat_id: chat, photo: env.APP_URL + 'bot-salom.png', caption, parse_mode: 'HTML', reply_markup });
  if (!r.ok) return tg(env, 'sendMessage', { chat_id: chat, text: caption, parse_mode: 'HTML', reply_markup });
  return r;
}
async function onCallback(env, q) {
  const d = String(q.data || '');
  await tg(env, 'answerCallbackQuery', { callback_query_id: q.id });
  const chat = q.message && q.message.chat.id;
  if (!chat) return;
  if (d === 'lang?') return askLang(env, chat);
  const sc = d.startsWith('lang:') ? d.slice(5) : '';
  if (!T.hi[sc]) return;
  await env.STORE.put('lang:' + q.from.id, sc);
  if (q.message.text === T.pick) await tg(env, 'deleteMessage', { chat_id: chat, message_id: q.message.message_id });
  // Pastdagi menyu tugmasi ham ilovani shu tilda ochsin (til qayta so'ralmaydi)
  await tg(env, 'setChatMenuButton', { chat_id: chat, menu_button: { type: 'web_app', text: T.openL[sc], web_app: { url: `${env.APP_URL}?lang=${sc}` } } });
  await greet(env, chat, q.from, sc);
  return askPhone(env, chat, q.from, sc);
}
const phoneKb = (s) => ({ keyboard: [[{ text: T.phoneBtn[s], request_contact: true }]], resize_keyboard: true, one_time_keyboard: true, is_persistent: true });
/** Raqam hali bo'lmasa, pastda «Raqamni yuborish» tugmasi chiqadi */
async function askPhone(env, chat, from, sc) {
  if (await hasPhone(env, from.id)) return;
  const s = T.phoneAsk[sc] ? sc : 'lat';
  return tg(env, 'sendMessage', { chat_id: chat, text: T.phoneAsk[s], reply_markup: phoneKb(s) });
}
async function onContact(env, m) {
  const s = (await env.STORE.get('lang:' + m.from.id)) || (lang(m.from) === 'ru' ? 'ru' : 'lat');
  const c = m.contact;
  if (c.user_id !== m.from.id) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.phoneOwn[s], reply_markup: phoneKb(s) });
  const phone = '+' + String(c.phone_number || '').replace(/\D/g, '');
  if (phone.length < 8) return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.phoneOwn[s], reply_markup: phoneKb(s) });
  await savePhone(env, m.from, phone);
  return tg(env, 'sendMessage', { chat_id: m.chat.id, text: T.phoneOk[s], reply_markup: { remove_keyboard: true } });
}

async function onPreCheckout(env, q) {
  if (!tolovOn(env)) return tg(env, 'answerPreCheckoutQuery', { pre_checkout_query_id: q.id, ok: false, error_message: lang(q.from) === 'ru' ? 'Оплата сейчас недоступна.' : 'To‘lov hozir yo‘q.' });
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
        else if (u.callback_query) await onCallback(env, u.callback_query);
        else if (u.message) await onMessage(env, u.message);
      } catch (e) { console.log('xato', e && e.stack); }
      return new Response('ok');
    }

    // Umumiy baza: o‘z e’lonlarini yuborish, boshqalarnikini olish (D1 ulangan bo‘lsa)
    if (url.pathname === '/api/sync' && req.method === 'POST') {
      if (!env.DB) return json(h, { error: 'nodb' }, 503);
      const b = await req.json().catch(() => ({}));
      const user = await checkInitData(b.initData, env.BOT_TOKEN, 7 * 86400);
      if (!user || !user.id) return json(h, { error: 'auth' }, 401);
      try {
        return json(h, await sync(env, user, b));
      } catch (e) { console.log('sync xato', e && e.stack); return json(h, { error: 'db' }, 500); }
    }

    if (!tolovOn(env) && (url.pathname === '/narx' || url.pathname === '/invoice')) return json(h, { error: 'off' }, 404);

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
