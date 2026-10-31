// Foydalanuvchi oynalari (SPEC 3.1–3.32). Har bir funksiya tayyor ko‘rinish ma’lumotini (vm) oladi
// va design/html/app.html, app0.html, extra.html dagi belgini aynan qaytaradi.
import { A, I, IF, bg, hdr, row, rings, nav, lc, empty, off, offIf, dim, sheet, sh, minty, kp, chip, seg, sel, sw, radio, tile, type LcData } from '../ui/kit';

const avBlue = 'background:radial-gradient(circle at 35% 30%,#9cb8ff,#4a6fd8 75%)';
const spacer = (h = 18) => `<div class="spacer" style="min-height:${h}px"></div>`;

/* 3.1 Bosh sahifa */
export interface HomeVM { letter?: string; name?: string; kind: 'bor' | 'kerak'; cntBor: string; cntKerak: string; near: LcData[] }
export const home = (v: HomeVM) => `${bg}
<div class="greet"><div class="av"${v.letter ? '' : ' style="font-size:0"'}>${v.letter || I('user', 2)}</div><div><small>${v.name ? 'Assalomu alaykum,' : 'Assalomu alaykum!'}</small><b>${v.name || 'Xush kelibsiz'}</b></div><div class="sbtn"${A('search')}>${I('search')}</div></div>
<div class="h2 mt14" style="font-size:20px;letter-spacing:-.5px;line-height:1.2">Halol mehnat, vositachisiz</div>
<div class="note mt4" style="font-size:12.5px">Bir-biringizni to‘g‘ridan-to‘g‘ri toping.</div>
<div class="two mt16">
 <div class="bigc g${v.kind === 'bor' ? ' on' : ''}"${A('hkind', 'bor')}><div class="hd"><div class="ic">${I('brief')}</div><b>Ish bor</b></div><div class="cnt">${v.cntBor} ta e’lon ${I('chev', 2.2)}</div></div>
 <div class="bigc s${v.kind === 'kerak' ? ' on' : ''}"${A('hkind', 'kerak')}><div class="hd"><div class="ic">${I('user')}</div><b>Ish kerak</b></div><div class="cnt">${v.cntKerak} ta ishchi ${I('chev', 2.2)}</div></div>
</div>
<div class="secrow"><b>Yaqin atrofda</b><span${v.near.length ? A('list', v.kind) : ''}>${v.near.length ? 'Barchasi' : ''}</span></div>
${v.near.length ? v.near.map(lc).join('\n') : empty('pin', 'Hozircha e’lon yo‘q', 'Birinchi bo‘lib e’lon joylang')}
${nav('h')}`;

/* 3.2 E’lonlar */
export interface ListVM {
  kind: 'bor' | 'kerak'; cntBor: string; cntKerak: string; q: string; mic: boolean;
  loc: [string, boolean]; job: [string, boolean]; gender: [string, boolean]; items: LcData[];
}
export const list = (v: ListVM) => `${bg}
${hdr('E’lonlar')}
<div class="big">${v.kind === 'bor' ? 'Ish bor' : 'Ish kerak'}</div>
<div class="sels mt18">${sel('Ish bor', v.cntBor, v.kind === 'bor', 'kind', 'bor')}${sel('Ish kerak', v.cntKerak, v.kind === 'kerak', 'kind', 'kerak')}</div>
<div class="search mt14">${I('search')}<input class="sin" data-in="q" placeholder="Qidirish" value="${v.q}" enterkeyhint="search">${v.mic ? `<div class="loc" style="width:38px;padding:0;justify-content:center"${A('mic')}>${I('mic')}</div>` : ''}</div>
<div class="chips scroll mt12">${chip(I('pin') + v.loc[0], v.loc[1], 'region')}${chip(I('brief') + v.job[0], v.job[1], 'fjob')}${chip(I('users') + v.gender[0], v.gender[1], 'fgender')}</div>
<div class="mt16"></div>
${v.items.length ? v.items.map(lc).join('\n') : `${empty('brief', 'E’lonlar yo‘q', 'Bu hududda hozircha e’lon joylanmagan')}
<div class="btn gold mt16"${A('nav', 'post')}>${I('plus', 2.2)}E’lon joylash</div>`}
${nav('e')}`;

/* 3.3 / 3.19 / 3.20 Ish bor e’loni */
export interface BorVM {
  icon: string; title: string; haqL: string; haq: string; kishi: string; kim: string; when: string; addr: string; addrSub: string;
  izoh?: string; poster: { av: string; name: string; sub: string; badge?: boolean }; call: boolean; tg: boolean; complained?: boolean; closed?: boolean;
}
export const borDetail = (v: BorVM) => v.closed ? `${bg}
${hdr('E’lon')}
<div class="big">Ish bor</div>
<div style="opacity:.55">${rings(I(v.icon, 2), '', 'goldav')}</div>
<div class="h1 mt8" style="opacity:.6">${v.title}</div>
<div class="ctr mt12"><span class="tag grey">Yopilgan</span></div>
<div class="card mt18">${row('check', 'Bu e’lon yopilgan', '', 'Egasi odam topdi yoki e’lonni yopdi')}</div>
${spacer()}
<div class="btn gold"${A('nav', 'list')}>${I('grid')}Boshqa e’lonlar</div>` : `${bg}
${hdr('E’lon')}
<div class="big">Ish bor</div>
${rings(I(v.icon, 2), '', 'goldav')}
<div class="h1 mt8">${v.title}</div>
<div class="stats mt18"><div class="st"><small>${v.haqL}</small><b class="g">${v.haq}</b></div><div class="st"><small>Kishi</small><b>${v.kishi}</b></div><div class="st"><small>Kim uchun</small><b>${v.kim}</b></div></div>
<div class="card mt12">${row('cal', 'Qachon', v.when)}${row('pin', 'Manzil', v.addr, v.addrSub, 'map')}</div>
${v.izoh ? `<div class="card mt12"><div class="desc"><b>Izoh</b>${v.izoh}</div></div>` : ''}
<div class="card mt12"><div class="emp"><div class="av" style="${avBlue}">${v.poster.av}</div><div class="rt"><b>${v.poster.name}${v.poster.badge ? ' <span class="tag mint">✓ Tasdiqlangan</span>' : ''}</b><small>${v.poster.sub}</small></div></div></div>
<div class="note mt12">Oldindan pul bermang.</div>
${spacer()}
${contactBtns(v.call, v.tg, v.complained)}`;

const contactBtns = (call: boolean, tg: boolean, complained?: boolean) =>
  `${call ? `<div class="btn gold"${A('call')}>${I('phone', 1.9)}Qo‘ng‘iroq qilish</div>` : ''}
${tg ? `<div class="btn ${call ? 'ghost mt12' : 'gold'}"${A('tg')}>${I('send')}Telegramda yozish</div>` : ''}
${complained ? `<div class="link mt18">Shikoyatingiz qabul qilingan</div>` : `<div class="link mt18"${A('complain')}>${I('flag')}Shikoyat qilish</div>`}`;

/* 3.4 Ishchi */
export interface KerakVM {
  letter: string; name: string; jobs: string; busy: boolean; haq: string; jinsi: string; district: string; days: string;
  traits: [string, string?][]; extra?: string; voice?: string; call: boolean; tg: boolean; complained?: boolean;
}
export const kerakDetail = (v: KerakVM) => `${bg}
${hdr('Ishchi')}
<div class="big">Ish kerak</div>
${rings(v.letter, '')}
<div class="h1 mt8">${v.name}</div>
<div class="sub" style="margin-top:6px">${v.jobs}</div>
${v.busy ? '<div class="ctr mt10"><span class="tag grey">Band</span></div>' : ''}
<div class="stats mt18"><div class="st"><small>Haq / kun</small><b class="g">${v.haq}</b></div><div class="st"><small>Jinsi</small><b>${v.jinsi}</b></div></div>
<div class="card mt12">${row('pin', 'Hudud', v.district)}${row('cal', 'Bo‘sh kunlari', v.days)}</div>
${v.traits.length || v.extra || v.voice ? `<div class="card mt12"><div class="desc"><b>O‘zi haqida</b>${v.traits.length ? `<div class="chips" style="padding:0;margin-top:2px">${v.traits.map(([t, c]) => `<span class="tag ${c || ''}">${t}</span>`).join('')}</div>` : ''}${v.extra ? `<div class="mt8">${v.extra}</div>` : ''}${v.voice ? `<div class="mt8"><span class="tag"${A('play', v.voice)}>${I('play')}Ovoz</span></div>` : ''}</div></div>` : ''}
<div class="note mt12">Ilova pul olmaydi.</div>
${spacer()}
${contactBtns(v.call, v.tg, v.complained)}`;

/* 3.5 / 3.6 E’lon joylash */
export interface PostVM {
  kind: 'bor' | 'kerak';
  jobs: { id: string; icon: string; name: string; on: boolean }[];
  anyJob?: boolean;
  izoh?: string;
  addr: string; addrSub?: string; when?: string; people?: number; kim?: string;
  pay?: { kun: string; soat: string; type?: string };
  days?: boolean[]; payDay?: string; gender?: string; traits?: [string, boolean][]; extra?: string;
  phone: boolean; phoneLocked?: boolean; ready: boolean;
}
const segOn = (opts: string[], cur: string | undefined, a: string) => seg(opts.map((o) => [o, o === cur, a, o] as [string, boolean, string, string]));
export const post = (v: PostVM) => `${bg}
${hdr('E’lon joylash')}
<div class="big">Yangi e’lon</div>
<div class="sels mt18">${sel('Ishchi kerak', 'Ish bor', v.kind === 'bor', 'pkind', 'bor')}${sel('Ish qidiryapman', 'Ish kerak', v.kind === 'kerak', 'pkind', 'kerak')}</div>
${v.kind === 'bor' ? `<div class="lbl" data-f="jobs">Qanday ish?</div>
<div class="chips">${v.jobs.map((j) => chip(I(j.icon) + j.name, j.on, 'pjob', j.id)).join('')}</div>
<div class="lbl">Izoh <span>(ixtiyoriy)</span></div>
<div class="field ta"><textarea class="tin" data-in="izoh" maxlength="300" placeholder="Ish haqida o‘zingiz yozing…">${v.izoh || ''}</textarea></div>
<div class="card mt12">
${row('pin', 'Manzil', v.addr + ' ' + I('chev'), v.addrSub, 'paddr')}
${row('cal', 'Qachon', v.when + ' ' + I('chev'), undefined, 'pwhen')}
<div class="row"><div class="tile">${I('users')}</div><div class="rt"><b>Kishi soni</b></div><div class="step"><i${A('ppeople', -1)}>−</i>${v.people}<i${A('ppeople', 1)}>+</i></div></div>
<div class="row" data-f="kim"><div class="tile">${I('user')}</div><div class="rt"><b>Kim uchun</b></div>${segOn(['Erkak', 'Ayol', 'Farqi yo‘q'], v.kim, 'pkim')}</div>
</div>
<div class="lbl" data-f="pay">Haq</div>
<div class="sels">${sel('Kunlik', v.pay!.kun, v.pay!.type === 'kun', 'ppay', 'kun')}${sel('Soatlik', v.pay!.soat, v.pay!.type === 'soat', 'ppay', 'soat')}${sel('Narx', 'Kelishiladi', v.pay!.type === 'kelishiladi', 'ppay', 'kelishiladi', 'font-size:16px')}</div>
<div class="card mt12"><div class="row"><div class="tile">${I('phone')}</div><div class="rt"><b>Raqamim ko‘rinsin</b><small>${v.phoneLocked ? 'Telegramda username yo‘q, shuning uchun raqam kerak' : 'Ishchilar qo‘ng‘iroq qiladi'}</small></div>${sw(v.phone, 'pphone')}</div></div>` : `<div class="lbl" data-f="jobs">Qanday ishlarni qila olasiz?</div>
<div class="chips">${chip(I('check') + 'Istalgan ish', !!v.anyJob, 'pany')}${v.jobs.map((j) => chip(I(j.icon) + j.name, j.on, 'pjob', j.id)).join('')}</div>
<div class="lbl">Qaysi kunlari bo‘shsiz?</div>
<div class="days">${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d, i) => `<span${v.days![i] ? ' class="on"' : ''}${A('pday', i)}>${d}</span>`).join('')}</div>
<div class="card mt14">
${row('pin', 'Hudud', v.addr + ' ' + I('chev'), v.addrSub, 'paddr')}
${row('wallet', 'Mehnat haqqi', v.payDay + ' ' + I('chev'), undefined, 'ppay', 'kun')}
<div class="row" data-f="kim"><div class="tile">${I('user')}</div><div class="rt"><b>Jinsi</b></div>${segOn(['Erkak', 'Ayol'], v.gender, 'pgender')}</div>
</div>
<div class="lbl">O‘zingiz haqingizda <span>(belgilang)</span></div>
<div class="chips">${v.traits!.map(([t, on], i) => chip(t, on, 'ptrait', i)).join('')}</div>
<div class="card mt12">${row('edit', 'Qo‘shimcha', v.extra + ' ' + I('chev'), 'Yozish yoki ovoz', 'pextra')}</div>
<div class="card mt12"><div class="row"><div class="tile">${I('phone')}</div><div class="rt"><b>Raqamim ko‘rinsin</b><small>${v.phoneLocked ? 'Telegramda username yo‘q, shuning uchun raqam kerak' : 'Ish beruvchilar qo‘ng‘iroq qiladi'}</small></div>${sw(v.phone, 'pphone')}</div></div>`}
${spacer()}
<div class="btn gold"${A('psubmit')}${offIf(!v.ready)}>E’lonni joylash</div>`;

/* 3.7 Joylandi */
export interface DoneVM { kind: 'bor' | 'kerak'; icon: string; title: string; pay: string; whenL: string; when: string }
export const done = (v: DoneVM) => `${bg}
<div class="hdr">E’lon joylash</div>
<div class="mt28"></div>
${rings(I('check', 3), '', minty)}
<div class="h1 mt12">E’loningiz joylandi!</div>
<div class="sub">${v.kind === 'bor' ? 'Ishchilar sizga qo‘ng‘iroq qiladi.' : 'Ish beruvchilar sizga qo‘ng‘iroq qiladi.'}</div>
<div class="card mt24">
${row(v.icon, v.title, v.pay)}
${row('cal', v.whenL, v.when)}
</div>
${spacer(24)}
<div class="btn gold"${A('nav', 'home')}>Bosh sahifaga</div>`;

/* 3.8 Profil */
export interface ProfileVM { letter?: string; name: string; sub: string; mine: LcData[]; script: string; theme: string; admin: boolean }
export const profile = (v: ProfileVM) => `${bg}
<div class="hdr">Profil</div>
${rings(v.letter || I('user', 2), '')}
<div class="h1 mt4">${v.name}</div>
<div class="sub" style="margin-top:4px">${v.sub}</div>
<div class="secrow"><b>Mening e’lonlarim</b><span></span></div>
${v.mine.length ? v.mine.map(lc).join('\n') : empty('brief', 'Hali e’lon joylamagansiz', 'Pastdagi “+” tugmasini bosing')}
<div class="card mt16">
<div class="row"><div class="tile">${I('globe')}</div><div class="rt"><b>Yozuv</b></div>${seg([['Lotin', v.script === 'lat', 'script', 'lat'], ['Кирилл', v.script === 'cyr', 'script', 'cyr'], ['Русский', v.script === 'ru', 'script', 'ru']])}</div>
${row('moon', 'Mavzu', v.theme + ' ' + I('chev'), undefined, 'theme')}
${row('help', 'Yordam', I('chev'), undefined, 'help')}
</div>
${v.admin ? `<div class="card mt12">${row('shield', 'Nazorat bo‘limi', '', 'Faqat sizga ko‘rinadi', 'admin')}</div>` : ''}
${nav('p')}`;

/* 3.9 / 3.23 TOP */
export interface TarifVM { price: string; days: number; left?: string }
export const tarif = (v: TarifVM) => `${bg}
${hdr('TOP')}
<div class="big">TOP</div>
${rings(I('bolt', 2), '', 'goldav')}
<div class="h1 mt8">Qidiruvda birinchi bo‘ling</div>
${v.left ? `<div class="ctr mt12"><span class="tag mint">TOP yoqiq · ${v.left}</span></div>` : `<div class="sub">${v.days} kun ro‘yxat boshida.</div>`}
<div class="plans mt20">
 <div class="plan s"><div class="n">Bepul</div><div class="p">0</div><small>so‘m · doimo</small><div class="d">Cheksiz e’lon</div></div>
 <div class="plan g"><div class="n">TOP</div><div class="p">${v.price}</div><small>so‘m / ${v.days} kun</small><div class="d">Ro‘yxat boshida</div></div>
</div>
${v.left ? `<div class="note mt12 ctr">To‘lasangiz, tugash kuniga yana ${v.days} kun qo‘shiladi.</div>` : ''}
${spacer(24)}
<div class="btn gold"${A('topgo')}>${v.left ? 'TOPni uzaytirish' : 'TOP qilish'} — ${v.price} so‘m</div>`;

/* 3.10 Shikoyat */
export interface ComplainVM { about?: string; reason?: number; extra: string; done?: boolean }
export const complain = (v: ComplainVM) => `${bg}
${hdr('Shikoyat')}
<div class="big">Xavfsizlik</div>
${rings(I('shield', 2), '', 'goldav')}
<div class="h1 mt8">Nima bo‘ldi?</div>
${v.about ? `<div class="sub">${v.about}</div>` : ''}
<div class="card mt20">
${['Ish uchun pul so‘rashdi', 'Aldov yoki yolg‘on e’lon', 'Ish haqini bermadi', 'Boshqa sabab'].map((t, i) => `<div class="row"${A('reason', i)}>${radio(v.reason === i)}<div class="rt"><b>${t}</b></div></div>`).join('\n')}
</div>
<div class="card mt12">${row('edit', 'Qo‘shimcha', v.extra + ' ' + I('chev'), 'Yozish yoki ovoz', 'cextra')}</div>
<div class="note mt12">Ismingiz sir saqlanadi.</div>
${spacer()}
${v.done ? '<div class="link">Shikoyatingiz qabul qilingan</div>' : `<div class="btn gold"${A('csend')}${offIf(v.reason == null)}>Yuborish</div>`}`;

/* 3.11 Hudud */
export interface RegionVM { q: string; regions?: [string, string][]; vil?: string; districts: [string, boolean, string?][]; radius?: number; denied?: boolean | 'fail'; ready: boolean; fold?: boolean }
export const region = (v: RegionVM) => `${bg}
${hdr('Hudud')}
<div class="big">Qayerda?</div>
<div class="search mt18">${I('search')}<input class="sin" data-in="rq" placeholder="Tumanni qo‘lda tanlang" value="${v.q}"></div>
<div class="btn ghost mt12"${A('locate')}>${I('pin')}Lokatsiya orqali aniqlash</div>
${v.denied ? `<div class="note mt8">${v.denied === 'fail' ? 'Joylashuv aniqlanmadi. Telefonda joylashuv (GPS) yoqilganini tekshiring yoki tumanni qo‘lda tanlang.' : 'Joylashuvga ruxsat berilmadi. Tumanni qo‘lda tanlang.'}</div>` : ''}
${v.regions ? `<div class="lbl">Viloyat yoki shahar</div>
<div class="card">
${v.regions.map(([id, n]) => row('pin', n, I('chev'), undefined, 'vil', id)).join('')}
</div>` : `${v.vil ? `<div class="lbl">Viloyat yoki shahar</div>
<div class="card">${row('pin', v.vil, radio(true), undefined, 'vilopen')}</div>
<div class="note mt10" style="color:var(--bluetext);font-weight:500"${A('vilopen')}>Boshqa viloyatni tanlash</div>
<div class="lbl">Tuman yoki shahar</div>` : ''}
<div class="card${v.vil ? '' : ' mt14'}">
${v.districts.map(([d, on, sub]) => `<div class="row"${A('district', d)}><div class="tile">${I('pin')}</div><div class="rt"><b>${d}</b>${sub ? `<small>${sub}</small>` : ''}</div>${radio(on)}</div>`).join('')}
</div>${v.fold ? `<div class="note mt10" style="color:var(--bluetext);font-weight:500"${A('unfold')}>Boshqa tumanni tanlash</div>` : ''}`}
<div class="lbl">Qancha masofagacha?</div>
<div class="chips">${['1–5 km', '5–10 km', '10–20 km', '20–35 km', '35 km dan uzoq'].map((t, i) => chip(t, v.radius === i, 'radius', i)).join('')}</div>
${v.radius != null ? '<div class="note mt12">Shu masofa ichidagi e’lonlar ko‘rinadi.</div>' : ''}
${spacer()}
<div class="btn gold"${A('rpick')}${offIf(!v.ready)}>Tanlash</div>`;

/* 3.12 Mening e’lonim — Ish bor */
export interface MyBorVM { icon: string; title: string; status: string[]; haqL: string; haq: string; kishi: string; kim: string; when: string; addr: string; addrSub: string; closed: boolean; topOn: boolean; payOn: boolean }
export const myBor = (v: MyBorVM) => `${bg}
${hdr('Mening e’lonim')}
<div class="big">Ish bor</div>
${rings(I(v.icon, 2), '', 'goldav')}
<div class="h1 mt8">${v.title}</div>
<div class="ctr mt10">${v.status.join(' ')}</div>
<div class="stats mt18"><div class="st"><small>${v.haqL}</small><b class="g">${v.haq}</b></div><div class="st"><small>Kishi</small><b>${v.kishi}</b></div><div class="st"><small>Kim uchun</small><b>${v.kim}</b></div></div>
<div class="card mt12">
${row('cal', 'Qachon', v.when)}
${row('pin', 'Manzil', v.addr, v.addrSub)}
</div>
<div class="note mt12">Ishchi topilgach “Odam topdim”ni bosing — e’lon qidiruvdan olib tashlanadi, boshqalar bekorga qo‘ng‘iroq qilmaydi.</div>
${spacer()}
${v.closed ? `<div class="btn gold"${A('repost')}>Qayta joylash</div>` : `<div class="btn gold"${A('found')}>${I('check', 2.4)}Odam topdim</div>
${v.payOn ? `<div class="btn ghost mt12"${A('top')}>${I('bolt')}${v.topOn ? 'TOPni uzaytirish' : 'TOP qilish'}</div>` : ''}`}
${delBtn}`;

/* 3.13 Mening e’lonim — Ish kerak */
export interface MyKerakVM { letter: string; name: string; jobs: string; status: string[]; busy: boolean; district: string; radius: string; days: string; closed: boolean; topOn: boolean; payOn: boolean }
export const myKerak = (v: MyKerakVM) => `${bg}
${hdr('Mening e’lonim')}
<div class="big">Ish kerak</div>
${rings(v.letter, '')}
<div class="h1 mt8">${v.name}</div>
<div class="sub" style="margin-top:6px">${v.jobs}</div>
${v.status.length ? `<div class="ctr mt10">${v.status.join(' ')}</div>` : ''}
<div class="card mt18">
<div class="row"${A('busy')}><div class="tile">${I('clock')}</div><div class="rt"><b>Hozir bandman</b><small>Qidiruvda qolasiz, “Band” deb yoziladi</small></div>${sw(v.busy)}</div>
</div>
<div class="card mt12">
${row('pin', 'Hudud', v.district + ' ' + I('chev'), v.radius, v.closed ? undefined : 'kaddr')}
${row('cal', 'Bo‘sh kunlari', v.days + ' ' + I('chev'), undefined, v.closed ? undefined : 'kdays')}
</div>
<div class="note mt12">Band bo‘lsangiz ham ish beruvchilar sizni ko‘radi va keyingi kunlarga kelishib olishi mumkin.</div>
${spacer()}
${v.closed ? `<div class="btn gold"${A('repost')}>Qayta joylash</div>` : `<div class="btn gold"${A('ksave')}>${I('check', 2.4)}Saqlash</div>${v.payOn ? `<div class="btn ghost mt12"${A('top')}>${I('bolt')}${v.topOn ? 'TOPni uzaytirish' : 'TOP qilish'}</div>` : ''}`}
${delBtn}`;

/* E’lonni o‘chirish tugmasi (Mening e’lonim) */
const delBtn = `<div class="btn ghost mt12" style="color:var(--danger)"${A('ldel')}>E’lonni o‘chirish</div>`;

/* Bo‘sh kunlarini o‘zgartirish (pastdan) */
export const daysSheet = (under: string, days: boolean[]) => `${bg}${dim(under)}
${sheet(`${sh('Bo‘sh kunlari')}
<div class="note" style="padding:0 22px">Bir nechtasini tanlash mumkin</div>
<div class="days mt14">${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d, i) => `<span${days[i] ? ' class="on"' : ''}${A('kday', i)}>${d}</span>`).join('')}</div>
<div class="btn gold mt18"${A('kdaysok')}>Tayyor</div>`)}`;

/* 3.14 / 3.21 / 3.22 To‘lov */
export interface PayVM { icon: string; title: string; days: number; price: string; apps: [string, string, string][]; app: string; state: 'tanlash' | 'kutish' | 'otmadi' }
const paySummary = (v: PayVM) => `${row(v.icon, v.title, '', 'E’lon')}
${row('clock', 'Muddat', `${v.days} kun`)}
${row('wallet', 'Summa', `<b style="color:var(--text);font-size:16px">${v.price} so‘m</b>`)}`;
export const pay = (v: PayVM) => v.state === 'kutish' ? `${bg}
${hdr('To‘lov')}
<div class="big">TOP</div>
<div class="card mt18" style="border-color:rgba(214,178,105,.55)"><div class="row"><div class="tile">${I('clock')}</div><div class="rt"><b>To‘lov kutilmoqda…</b><small>To‘lov ilovasida tasdiqlang</small></div></div></div>
<div class="card mt12">${paySummary(v)}</div>
<div class="note mt12">To‘lovdan keyin shu yerga qayting. 15 daqiqada tasdiqlanmasa, to‘lov bekor bo‘ladi.</div>
${spacer()}
<div class="btn gold" ${off}>${I('clock')}Kutilmoqda…</div>
<div class="btn ghost mt12"${A('payreopen')}>To‘lov ilovasini qayta ochish</div>` : `${bg}
${hdr('To‘lov')}
<div class="big">TOP</div>
<div class="card mt18">
${paySummary(v)}
</div>
<div class="lbl">Qaysi ilova orqali to‘laysiz?</div>
<div class="card">
${v.apps.map(([l, n, id]) => `<div class="row"${A('payapp', id)}>${tile(l)}<div class="rt"><b>${n}</b></div>${radio(v.app === id)}</div>`).join('')}
</div>
${v.state === 'otmadi' ? '<div class="note mt12" style="color:var(--danger)">To‘lov o‘tmadi. Qaytadan urinib ko‘ring.</div>' : '<div class="note mt12">Telefoningizdagi to‘lov ilovalari ko‘rsatilgan. Tanlangan ilova ochiladi, summa va ma’lumotlar o‘zi yozilgan bo‘ladi.</div>'}
${spacer()}
<div class="btn gold"${A('paygo')}>To‘lash — ${v.price} so‘m</div>`;

/* 3.15 To‘lov qabul qilindi */
export interface PaidVM { icon: string; title: string; until: string; price: string }
export const paid = (v: PaidVM) => `${bg}
<div class="hdr">To‘lov</div>
<div class="mt28"></div>
${rings(IF('bolt'), '', minty)}
<div class="h1 mt12">TOP yoqildi!</div>
<div class="sub">E’loningiz qidiruvda birinchi turadi.</div>
<div class="card mt24">
${row(v.icon, v.title, '')}
${row('cal', 'Tugaydi', v.until)}
${row('wallet', 'To‘landi', `${v.price} so‘m`)}
</div>
${spacer(24)}
<div class="btn gold"${A('nav', 'profile')}>Mening e’lonlarim</div>`;

/* 3.16 Qachon (pastdan) */
export const HOURS = ['07:00', '08:00', '09:00', '10:00', '12:00', '14:00', '16:00', '18:00'];
export interface WhenVM { day?: string; other?: string; hour?: string; past: string[]; ready: boolean }
export const whenSheet = (under: string, v: WhenVM) => `${bg}${dim(under)}
${sheet(`${sh('Qachon?')}
<div class="lbl" style="margin-top:10px">Kuni</div>
<div class="chips">${chip('Bugun', v.day === 'Bugun', 'wday', 'Bugun')}${chip('Ertaga', v.day === 'Ertaga', 'wday', 'Ertaga')}${chip('Indinga', v.day === 'Indinga', 'wday', 'Indinga')}${chip(I('cal') + (v.other || 'Boshqa kun'), v.day === 'other', 'wother')}</div>
<div class="lbl">Soati</div>
<div class="chips">${HOURS.map((t) => chip(t, v.hour === t, v.past.includes(t) ? undefined : 'whour', t, 'min-width:74px;justify-content:center' + (v.past.includes(t) ? ';opacity:.4' : ''))).join('')}${chip(I('clock') + (v.hour && !HOURS.includes(v.hour) ? v.hour : 'Boshqa soat'), !!v.hour && !HOURS.includes(v.hour), 'wclock')}</div>
<div class="note mt12">Bir necha kunlik ish bo‘lsa, “Izoh”ga yozing.</div>
<div class="btn gold mt18"${A('wok')}${offIf(!v.ready)}>Tayyor</div>`)}`;

const subHead = (t: string) => `<div style="display:flex;align-items:center;gap:12px;padding:10px 22px 4px"><div class="back" style="position:static;flex:0 0 auto"${A('wback')}>${I('back', 2.2)}</div><div style="font-size:19px;font-weight:700;letter-spacing:-.4px">${t}</div></div>`;

/* Boshqa kun: oylik kalendar */
export interface CalVM { month: string; prev: boolean; next: boolean; cells: ({ n: number; ts: number; off: boolean; on: boolean; today: boolean } | null)[] }
export const whenCal = (under: string, v: CalVM) => `${bg}${dim(under)}
${sheet(`${subHead('Boshqa kun')}
<div class="calh"><div class="cnav"${v.prev ? A('wcalm', -1) : ' style="opacity:.3"'}>${I('back', 2.2)}</div><b>${v.month}</b><div class="cnav"${v.next ? A('wcalm', 1) : ' style="opacity:.3"'}>${I('chev', 2.2)}</div></div>
<div class="calg">${['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh', 'Ya'].map((d) => `<span class="cwd">${d}</span>`).join('')}${v.cells.map((c) => (c ? `<span class="cd${c.on ? ' on' : ''}${c.today ? ' td' : ''}${c.off ? ' off' : ''}"${c.off ? '' : A('wdate', c.ts)}>${c.n}</span>` : '<span></span>')).join('')}</div>
<div class="btn ghost mt18"${A('wback')}>Bekor qilish</div>`)}`;

/* Boshqa soat: budilnikdagidek aylanadigan g‘altak */
const wheel = (k: string, n: number) => `<div class="whc" data-wheel="${k}">${Array.from({ length: n }, (_, i) => `<div${A('wsnap', `${k}${i}`)}>${String(i).padStart(2, '0')}</div>`).join('')}</div>`;
export const whenClock = (under: string, past: boolean) => `${bg}${dim(under)}
${sheet(`${subHead('Boshqa soat')}
<div class="whl"><div class="whb"></div>${wheel('h', 24)}<b class="whs">:</b>${wheel('m', 60)}</div>
${past ? '<div class="note mt12" style="text-align:center">Bugun uchun o‘tib ketgan vaqtni tanlab bo‘lmaydi.</div>' : ''}
<div class="btn gold mt18"${A('wclockok')}>Tanlash</div>`)}`;

/* 3.17 Haq kiritish */
export interface AmountVM { title: string; amount: string; quick: string[] }
export const amountSheet = (under: string, v: AmountVM) => `${bg}${dim(under)}
${sheet(`${sh(v.title)}
<div style="text-align:center;font-size:34px;font-weight:700;letter-spacing:-1px;margin-top:10px">${v.amount} <span style="color:var(--tileic)">so‘m</span></div>
<div class="chips mt14" style="justify-content:center">${v.quick.map((t) => `<span class="chip"${A('quick', t)}>${t}</span>`).join('')}</div>
${kp}
<div class="btn gold mt16"${A('aok')}${offIf(v.amount === '0')}>Tayyor</div>`)}`;

/* 3.18 Qo‘shimcha */
export interface ExtraVM { text: string; count: number; mic: boolean; rec?: string; voice?: string; ready: boolean }
export const extraSheet = (under: string, v: ExtraVM) => `${bg}${dim(under)}
${sheet(`${sh('Qo‘shimcha')}
<div class="note" style="padding:0 22px">Ixtiyoriy. Yozing yoki ovoz yozib qo‘ying.</div>
<div class="field ta mt14"><textarea class="tin" data-in="extra" maxlength="300" placeholder="Yozing…">${v.text}</textarea></div>
<div class="note ctr mt8" style="font-size:12px" data-count>${v.count} / 300</div>
${v.voice ? `<div class="card mt12"><div class="row"><div class="tile"${A('vplay')}>${I('play')}</div><div class="rt"><b>Ovoz</b><small>${v.voice}</small></div><div class="rv"${A('vdel')}>✕</div></div></div>` : v.mic ? `<div class="btn ghost mt12"${A('vrec')}>${v.rec ? `⏹ To‘xtatish · ${v.rec}` : `${I('mic')}Ovoz yozish · 60 soniyagacha`}</div>` : ''}
<div class="btn gold mt12"${A('eok')}${offIf(!v.ready)}>Tayyor</div>`)}`;

/* 3.24 Mavzu */
export const themeSheet = (under: string, cur: string, autoName: string) => `${bg}${dim(under)}
${sheet(`${sh('Mavzu')}
<div class="card mt12">${[['moon', 'Qorong‘i', 'dark'], ['spark', 'Yorug‘', 'light'], ['eye', autoName, 'auto']].map(([ic, n, id]) => `<div class="row"${A('tpick', id)}><div class="tile">${I(ic)}</div><div class="rt"><b>${n}</b></div>${radio(cur === id)}</div>`).join('')}</div>
<div class="btn gold mt18"${A('tok')}>Tanlash</div>`)}`;

/* 3.25 Yordam */
export const HELP: [string, string, string, string][] = [
  ['brief', 'Ishchi qanday topaman?', '“+” → Ish bor → tanlang → Joylash', 'Pastdagi “+” ni bosing, “Ish bor”ni tanlang, ish turini, manzil va vaqtni belgilang, “E’lonni joylash”ni bosing. Ishchilar o‘zi qo‘ng‘iroq qiladi.'],
  ['user', 'Ish qanday topaman?', '“+” → Ish kerak → o‘zingizni yozing', '“+” → “Ish kerak” → qila oladigan ishlaringiz, kunlaringiz va hududingiz → “E’lonni joylash”. Yoki “E’lonlar”dan ish tanlab qo‘ng‘iroq qiling.'],
  ['bolt', 'TOP nima?', '5 000 so‘m · 7 kun ro‘yxat boshida', '5 000 so‘m to‘lasangiz, e’loningiz 7 kun ro‘yxat boshida turadi. Faqat filtrga mos ro‘yxatda. E’lon joylash har doim bepul.'],
  ['check', 'Odam topdim / Band', 'E’loningizni qanday yopasiz', '“Odam topdim” — ishchi topilgach e’lonni yopadi. “Band” — ishchi hozir band ekanini bildiradi, lekin ro‘yxatda qoladi.'],
  ['shield', 'Xavfsizlik', 'Hech kimga oldindan pul bermang', 'Hech kimga oldindan pul bermang. Ilova hech qachon pul so‘ramaydi (faqat siz o‘zingiz xohlab TOP qilsangiz). Pul so‘rashsa — “Shikoyat qilish”ni bosing.'],
];
export const help = (open: number[], items = HELP) => `${bg}
${hdr('Yordam')}
<div class="big">Savollar</div>
<div class="card mt18">
${items.map(([ic, t, s, ans], i) => row(ic, t, I('chev'), s, 'hq', i) + (open.includes(i) ? `<div class="note" style="padding:0 15px 13px 65px">${ans}</div>` : '')).join('\n')}
</div>
${spacer()}
<div class="btn ghost"${A('ask')}>${I('send')}Botga savol yozish</div>`;

/* 3.26 Shikoyat yuborildi */
export const thanks = () => `${bg}
<div class="hdr">Shikoyat</div>
<div class="mt28"></div>
${rings(I('check', 2.6), '', minty)}
<div class="h1 mt8">Rahmat!</div>
<div class="sub">Shikoyatingiz ko‘rib chiqiladi. Ismingiz sir saqlanadi.</div>
<div class="spacer"></div>
<div class="btn gold"${A('back')}>Ortga</div>`;

/* 3.27 Ish turi filtri */
export const jobSheet = (under: string, jobs: { id: string; icon: string; name: string; on: boolean }[]) => `${bg}${dim(under)}
${sheet(`${sh('Ish turi')}
<div class="note" style="padding:0 22px">Bir nechtasini tanlash mumkin</div>
<div class="chips mt14">${jobs.map((j) => chip(I(j.icon) + j.name, j.on, 'fj', j.id)).join('')}</div>
<div class="btn ghost mt18"${A('fjall')}>Hammasi</div>
<div class="btn gold mt12"${A('fjok')}>Tanlash</div>`)}`;

/* 3.28 Jinsi filtri */
export const genderSheet = (under: string, cur: string) => `${bg}${dim(under)}
${sheet(`${sh('Kim uchun?')}
<div class="card mt12">${[['users', 'Farqi yo‘q', 'farqi'], ['user', 'Erkak', 'erkak'], ['venus', 'Ayol', 'ayol']].map(([ic, n, id]) => `<div class="row"${A('fg', id)}><div class="tile">${I(ic)}</div><div class="rt"><b>${n}</b></div>${radio(cur === id)}</div>`).join('')}</div>
<div class="btn gold mt18"${A('fgok')}>Tanlash</div>`)}`;

/* 3.29 Hisob cheklangan */
export const blocked = () => `${bg}
<div class="hdr">Ish bor / Ish kerak</div>
<div class="mt28"></div>
${rings(I('shield', 2), '', 'goldav')}
<div class="h1 mt8">Hisobingiz cheklangan</div>
<div class="sub">Qoidalar buzilgani uchun e’lon joylay olmaysiz. Xato bo‘lsa, botga yozing.</div>
<div class="spacer"></div>
<div class="btn ghost"${A('ask')}>${I('send')}Botga yozish</div>`;

/* 3.30 Texnik ishlar */
export const maintenance = () => `${bg}
<div class="hdr">Ish bor / Ish kerak</div>
<div class="mt28"></div>
${rings(I('wrench', 2), '', 'goldav')}
<div class="h1 mt8">Texnik ishlar</div>
<div class="sub">Ilova tez orada ishlaydi. Biroz kuting.</div>
<div class="spacer"></div>
<div class="btn gold"${A('retry')}>Qayta urinish</div>`;

/** Sinov odami bo‘lib turilganda har oynaning tepasidagi chiziq (13.3) */
export const testBar = (name: string) => `<div style="height:28px;display:flex;align-items:center;justify-content:center;gap:6px;font-size:12px;color:var(--muted);background:var(--card);border-bottom:1px solid var(--line)">Sinov: ${name} · <span style="color:var(--bluetext);font-weight:600"${A('actown')}>Qaytish</span></div>`;

/* Ro‘yxatdan tanlash (pastdan): sana, sabab va h.k. */
export const pickSheet = (under: string, title: string, options: string[], icon: string) => `${bg}${dim(under)}
${sheet(`<div style="display:flex;align-items:center;gap:12px;padding:10px 22px 4px"><div class="back" style="position:static;flex:0 0 auto"${A('close')}>${I('back', 2.2)}</div><div style="font-size:19px;font-weight:700;letter-spacing:-.4px">${title}</div></div>
<div class="card mt8">${options.map((o, i) => row(icon, o, I('chev'), undefined, 'pickv', i)).join('')}</div>
<div class="btn ghost mt14"${A('close')}>Bekor qilish</div>`)}`;
