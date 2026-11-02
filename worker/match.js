// Umumiy baza (Cloudflare D1): odamlar va e’lonlar.
// Ilova har ochilganda va e’lon o‘zgarganda /api/sync ga o‘z e’lonlarini yuboradi,
// javobda boshqalarning faol e’lonlarini oladi. Mos ish/ishchi ilovaning o‘zida ko‘rsatiladi
// (bot orqali xabar hozircha yo‘q).

const DAY = 86400e3;
const TZ = 5 * 3600e3; // Toshkent
const dayStart = (t) => Math.floor((t + TZ) / DAY) * DAY - TZ;
const KEEP_DAYS = 45; // egasi shuncha kun ilovani ochmasa, e’loni ko‘rsatilmaydi

const STATUSES = ['tekshirilmoqda', 'faol', 'yopilgan', 'rad_etilgan', 'yashirin', 'ochirilgan'];
const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : undefined);
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
const strs = (v, n, m) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, n).map((x) => x.slice(0, m)) : []);
const nums = (v, n) => (Array.isArray(v) ? v.filter((x) => typeof x === 'number').slice(0, n) : []);
const oneOf = (v, xs) => (xs.includes(v) ? v : undefined);

/** Ilovadan kelgan e’londan faqat kerakli maydonlar olinadi */
export function clean(l) {
  if (!l || typeof l !== 'object') return null;
  const id = str(l.id, 40), kind = oneOf(l.kind, ['bor', 'kerak']), status = oneOf(l.status, STATUSES);
  const lat = num(l.lat), lng = num(l.lng);
  if (!id || !/^[\w-]+$/.test(id) || !kind || !status || lat == null || lng == null) return null;
  return {
    id, kind, status, lat, lng,
    jobs: strs(l.jobs, 10, 30), anyJob: !!l.anyJob,
    izoh: str(l.izoh, 300), extra: str(l.extra, 300),
    district: str(l.district, 80) || '', radius: Math.max(0, Math.min(4, Math.round(num(l.radius) ?? 4))),
    when: num(l.when), people: Math.max(1, Math.min(99, Math.round(num(l.people) ?? 1))),
    forWhom: oneOf(l.forWhom, ['erkak', 'ayol', 'farqi']), gender: oneOf(l.gender, ['erkak', 'ayol']),
    payType: oneOf(l.payType, ['kun', 'soat', 'kelishiladi']) || 'kelishiladi', pay: num(l.pay),
    days: nums(l.days, 7), traits: strs(l.traits, 10, 40), showPhone: !!l.showPhone, busy: !!l.busy,
    createdAt: num(l.createdAt) || Date.now(), confirmAt: num(l.confirmAt),
  };
}

const SCHEMA = [
  'CREATE TABLE IF NOT EXISTS users (tg INTEGER PRIMARY KEY, name TEXT, surname TEXT, username TEXT, phone TEXT, script TEXT, updated INTEGER)',
  'CREATE TABLE IF NOT EXISTS listings (owner INTEGER NOT NULL, id TEXT NOT NULL, kind TEXT, status TEXT, data TEXT, updated INTEGER, PRIMARY KEY (owner, id))',
  'CREATE INDEX IF NOT EXISTS listings_status ON listings (status, updated)',
];
let ready = false;
async function schema(DB) {
  if (ready) return;
  await DB.batch(SCHEMA.map((s) => DB.prepare(s)));
  ready = true;
}

/** Botda yuborilgan raqam: KV va bazaga yoziladi (ilova keyingi almashishda oladi) */
export async function savePhone(env, from, phone) {
  await env.STORE.put('phone:' + from.id, phone);
  if (!env.DB) return;
  await schema(env.DB);
  await env.DB.prepare('INSERT INTO users (tg, name, surname, username, phone, script, updated) VALUES (?1, ?2, NULL, ?3, ?4, ?5, ?6) ON CONFLICT(tg) DO UPDATE SET phone = ?4')
    .bind(from.id, str(from.first_name, 60) || '', str(from.username, 40) || null, phone, 'lat', Date.now()).run();
}
export async function hasPhone(env, id) {
  if (await env.STORE.get('phone:' + id)) return true;
  if (!env.DB) return false;
  await schema(env.DB);
  const r = await env.DB.prepare('SELECT phone FROM users WHERE tg = ?1').bind(id).all();
  return !!(r.results[0] && r.results[0].phone);
}

const remoteId = (owner, id) => `r${owner}_${id}`;

/**
 * POST /api/sync — { me: {name, surname, phone, script}, listings: [...] }
 * tg — Telegram tekshirgan odam (initData).
 */
export async function sync(env, tg, body, now = Date.now()) {
  const DB = env.DB;
  await schema(DB);
  const me = body.me || {};
  const script = oneOf(me.script, ['lat', 'cyr', 'ru']) || 'lat';
  await DB.prepare('INSERT INTO users (tg, name, surname, username, phone, script, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7) ON CONFLICT(tg) DO UPDATE SET name = ?2, surname = ?3, username = ?4, phone = COALESCE(?5, phone), script = ?6, updated = ?7')
    .bind(tg.id, str(me.name, 60) || str(tg.first_name, 60) || '', str(me.surname, 60) || null, str(tg.username, 40) || null, str(me.phone, 20) || null, script, now).run();
  // Raqam botda yuborilgan bo'lsa (ilovada hali yo'q), ilovaga qaytariladi
  const botPhone = !me.phone && env.STORE ? await env.STORE.get('phone:' + tg.id) : null;
  const myPhone = botPhone || (me.phone ? null : ((await DB.prepare('SELECT phone FROM users WHERE tg = ?1').bind(tg.id).all()).results[0] || {}).phone);

  // O‘z e’lonlari: yangisi yoziladi, ilovada yo‘q bo‘lgani o‘chiriladi
  const mine = (Array.isArray(body.listings) ? body.listings : []).slice(0, 30).map(clean).filter(Boolean);
  const before = new Map((await DB.prepare('SELECT id FROM listings WHERE owner = ?1').bind(tg.id).all()).results.map((r) => [r.id, r]));
  const ops = [];
  for (const l of mine) {
    const old = before.get(l.id);
    ops.push(DB.prepare('INSERT INTO listings (owner, id, kind, status, data, updated) VALUES (?1, ?2, ?3, ?4, ?5, ?6) ON CONFLICT(owner, id) DO UPDATE SET kind = ?3, status = ?4, data = ?5, updated = ?6')
      .bind(tg.id, l.id, l.kind, l.status, JSON.stringify(l), now));
    before.delete(l.id);
  }
  for (const id of before.keys()) ops.push(DB.prepare('DELETE FROM listings WHERE owner = ?1 AND id = ?2').bind(tg.id, id));
  if (ops.length) await DB.batch(ops);

  // Hammaning faol e’lonlari
  const rows = (await DB.prepare('SELECT owner, data FROM listings WHERE status = ?1 AND updated > ?2').bind('faol', now - KEEP_DAYS * DAY).all()).results;
  const all = rows.map((r) => ({ owner: r.owner, ...JSON.parse(r.data) })).filter((l) => !(l.kind === 'bor' && l.when && dayStart(l.when) + DAY <= now));
  const owners = [...new Set(all.map((l) => l.owner))];
  const users = new Map();
  for (let i = 0; i < owners.length; i += 90) {
    const part = owners.slice(i, i + 90);
    const r = await DB.prepare(`SELECT tg, name, surname, username, phone, script FROM users WHERE tg IN (${part.map(() => '?').join(',')})`).bind(...part).all();
    for (const u of r.results) users.set(u.tg, u);
  }

  // Javob: boshqalarning e’lonlari va ularning ochiq ma’lumoti
  const out = all.filter((l) => l.owner !== tg.id);
  const phoneOk = new Set(out.filter((l) => l.showPhone).map((l) => l.owner));
  const pub = [...new Set(out.map((l) => l.owner))].map((id) => {
    const u = users.get(id) || {};
    return { id: `tg${id}`, name: u.name || '', surname: u.surname || undefined, username: u.username || undefined, phone: (phoneOk.has(id) || !u.username) && u.phone ? u.phone : undefined };
  });
  const listings = out.map(({ owner, ...l }) => ({ ...l, id: remoteId(owner, l.id), owner: `tg${owner}`, calls: 0, views: 0 }));
  return { me: { username: tg.username || null, phone: myPhone || undefined }, users: pub, listings };
}
