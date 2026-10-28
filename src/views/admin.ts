// Nazorat oynalari (SPEC 6, design/html/admin.html va extra.html H–S).
import { A, I, bg, row, rings, empty, pb, off, offIf, ah, xhdr, anav, sw, radio, chip, seg, esc } from '../ui/kit';

const spacer = (h = 18) => `<div class="spacer" style="min-height:${h}px"></div>`;

/* A. Kirish */
export interface LoginVM { script: string; theme: string; filled: number; left: number; locked?: string; err?: boolean }
export const login = (v: LoginVM) => `${bg}
<div class="hdr" style="opacity:.35">Profil</div>
<div style="opacity:.3"${A('aclose')}>
<div class="card mt12">${row('globe', 'Yozuv', v.script)}${row('moon', 'Mavzu', v.theme)}${row('help', 'Yordam', '')}</div>
<div class="card mt12">${row('shield', 'Nazorat bo‘limi', '', 'Faqat sizga ko‘rinadi')}</div>
</div>
<div class="sheet">
<div class="grab"${A('aclose')}></div>
${rings(I('shield', 2), '', 'goldav')}
<div class="h1" style="margin-top:-4px">Nazorat <span style="color:var(--tileic)">kodi</span></div>
<div class="sub" style="margin-top:4px">12 belgili kodni kiriting</div>
<div class="field mt16${v.err ? ' err' : ''}" style="margin-top:18px"><label>Kod</label><input class="fin" data-in="acode" type="password" maxlength="12" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="Raqam va harflar"${v.locked ? ' disabled' : ''}></div>
<div class="dots">${[0, 1, 2].map((g) => `<span>${[0, 1, 2, 3].map((k) => `<i${g * 4 + k < v.filled ? ' class="on"' : ''}></i>`).join('')}</span>`).join('')}</div>
<div class="note ctr" style="margin-top:8px">Urinishlar: 5 tadan ${v.left} ta qoldi</div>
${v.locked ? `<div class="btn gold mt16" style="opacity:.45;box-shadow:none">${I('shield')}Qulflangan · ${v.locked}</div>` : `<div class="btn gold mt16"${A('alogin')}${offIf(v.filled < 12)}>${I('shield')}Kirish</div>`}
<div class="note ctr" style="margin-top:12px;font-size:12px">5 marta xato → 15 daqiqa qulf va botga xabar</div>
</div>`;

/* B. Bugun */
export interface TodayVM {
  clock: string; problems: number; dateLine: string; waiting: string; waitingSub: string;
  newL: string; newSub: string; found: string; users: string; usersSub: string; active: string; activeSub: string;
  income: string; incomeBar: number; incomeSub: string; bars: number[]; barsToday: boolean; barsSub: string;
}
export const today = (v: TodayVM) => `${bg}
${xhdr('Nazorat', undefined, v.clock)}
<div class="h2 mt4" style="font-size:27px;letter-spacing:-.8px">Bugun <span style="color:var(--tileic)">${v.problems ? `${v.problems} ta muammo` : 'tinch'}</span></div>
<div class="note mt4" style="font-size:13.5px">${v.dateLine}</div>
<div class="card mt16">${row('bell', 'Sizni kutmoqda', v.waiting, v.waitingSub, 'anav', 'n')}</div>
<div class="grid2 mt12">
<div class="st2"><b>${v.newL}</b><small>Yangi e’lon</small><em>${v.newSub}</em></div>
<div class="st2"><b>${v.found}</b><small>Odam topildi</small><em>—</em></div>
<div class="st2"><b>${v.users}</b><small>Yangi foydalanuvchi</small><em>${v.usersSub}</em></div>
<div class="st2"><b>${v.active}</b><small>Hozir faol</small><em>${v.activeSub}</em></div>
</div>
<div class="card mt12" style="padding:14px 15px">
<div style="display:flex;justify-content:space-between;align-items:baseline"><span class="note" style="padding:0">Bugungi tushum</span><b style="font-size:22px;letter-spacing:-.5px">${v.income} <small style="font-size:12px;color:var(--muted);font-weight:500">so‘m</small></b></div>
<div class="bar mt10">${v.incomeBar ? `<i style="width:${v.incomeBar}%;background:linear-gradient(90deg,var(--gold1),var(--gold2))"></i>` : ''}</div>
<div class="note mt8" style="padding:0;font-size:12px">${v.incomeSub}</div>
</div>
<div class="card mt12" style="padding:14px 15px">
<div class="note" style="padding:0">Yangi e’lonlar, 7 kun</div>
<div class="bars">${v.bars.map((h, i) => `<i style="height:${h}px${v.barsToday && i === 6 ? ';background:linear-gradient(180deg,var(--gold1),var(--gold2))' : ''}"></i>`).join('')}</div>
<div class="note mt8" style="padding:0;font-size:12px">${v.barsSub}</div>
</div>
${anav('b')}`;

/* C. Navbat */
export interface QItem { id: string; tag: [string, string]; title: string; sub: string; }
export interface QueueVM { clock: string; total: number; counts: number[]; tab: number; items: QItem[] }
const QTABS = ['Hammasi', 'Shikoyat', 'To‘lov', 'E’lon', 'Savol'];
export const queue = (v: QueueVM) => `${bg}
${xhdr(`Navbat · ${v.total}`, undefined, v.clock)}
<div class="chips scroll mt8">${QTABS.map((t, i) => chip(`${t} ${v.counts[i]}`, v.tab === i, 'qtab', i)).join('')}</div>
<div class="mt14"></div>
${v.items.length ? `<div class="card">${v.items.map((q) => `<div class="row"${A('qopen', q.id)}><span class="tag ${q.tag[1]}">${q.tag[0]}</span><div class="rt"><b>${q.title}</b><small>${q.sub}</small></div><div class="rv">${I('chev')}</div></div>`).join('')}</div>` : empty('check', 'Navbat bo‘sh', 'Qaroringizni kutayotgan narsa yo‘q')}
${anav('n')}`;

/* H. Navbat elementi */
export interface QDetailVM {
  clock: string; head: string; tag: [string, string]; title: string; sub: string;
  rows: string; actions: string; note?: string; reply?: boolean;
}
export const qdetail = (v: QDetailVM) => `${bg}
${ah(v.head, v.clock)}
<div class="card mt8"><div class="row"><span class="tag ${v.tag[1]}">${v.tag[0]}</span><div class="rt"><b>${v.title}</b><small>${v.sub}</small></div></div></div>
${v.rows ? `<div class="card mt12">
${v.rows}
</div>` : ''}
${v.reply ? `<div class="lbl">Javob</div><div class="field ta"><textarea class="tin" data-in="reply" placeholder="Javob matni…"></textarea></div>` : ''}
<div class="sec">Amal</div>
${v.actions}
${v.note ? `<div class="note mt14">${v.note}</div>` : ''}`;
export const complaintActions = (hasListing: boolean) => `<div class="pbtns">${hasListing ? pb('E’lonni ochish', '', 'eye', 'qlisting') : ''}${pb('Ogohlantirish', 'gold', undefined, 'qwarn')}${pb('Bloklash', 'red', undefined, 'qblock')}</div>
<div class="pbtns mt10">${pb('Rad etish', '', undefined, 'qreject')}${pb('Yashirish 1/3/5 kun', '', undefined, 'qhide')}</div>`;
export const pbtns = (h: string, style = '') => `<div class="pbtns"${style ? ` style="${style}"` : ''}>${h}</div>`;

/* D. Odamlar */
export interface PeopleVM { clock: string; q: string; tab: number; total: number; rows: string }
const PTABS = ['Hammasi', 'Yangi', 'Shikoyati bor', 'Bloklangan', 'TOP'];
export const people = (v: PeopleVM) => `${bg}
${xhdr('Odamlar', undefined, v.clock)}
<div class="search mt8">${I('search')}<input class="sin" data-in="pq" placeholder="Ism, telefon yoki ID" value="${esc(v.q)}"></div>
<div class="chips scroll mt12">${PTABS.map((t, i) => chip(i === 0 ? `${t} ${v.total}` : t, v.tab === i, 'ptab', i)).join('')}</div>
<div class="mt14"></div>
${v.rows ? `<div class="card">${v.rows}</div>` : empty('users', 'Hali foydalanuvchi yo‘q', 'Ilovaga kirganlar shu yerda ko‘rinadi')}
${anav('o')}`;

/* I. Odam kartasi */
export interface PersonVM { clock: string; letter: string; name: string; phone: string; id: string; rows: string; blocked: boolean; verified: boolean }
export const person = (v: PersonVM) => `${bg}
${ah('Odam', v.clock)}
<div class="card mt8"><div class="emp"><div class="av">${v.letter}</div><div class="rt"><b>${v.name}</b><small>${v.phone}</small></div><span class="tag grey">ID ${v.id}</span></div></div>
<div class="card mt12">
${v.rows}
</div>
<div class="sec">Amal</div>
<div class="pbtns">${pb('Ogohlantirish', 'gold', undefined, 'uwarn')}${pb('Yashirish 1/3/5 kun', '', undefined, 'uhide')}${pb('TOP berish', '', undefined, 'utop')}</div>
<div class="pbtns mt10">${pb(v.verified ? '✓ Tasdiqlangan · olib tashlash' : '✓ Tasdiqlangan', '', undefined, 'uverify')}${v.blocked ? pb('Blokdan chiqarish', '', undefined, 'uunblock') : pb('Bloklash', 'red', undefined, 'ublock')}</div>`;

/* E. Pul */
export interface MoneyVM { clock: string; total: string; sub: string; status: [string, string, string]; bar: string; rows: string }
export const money = (v: MoneyVM) => `${bg}
${xhdr('Pul', `<div class="back" style="position:static;opacity:.4"${A('excel')}>` + I('chev', 2.2).replace('<svg', '<svg style="transform:rotate(90deg)"') + '</div>', v.clock)}
<div class="h2 mt4" style="font-size:30px;letter-spacing:-1px">${v.total} <span style="color:var(--tileic)">so‘m</span></div>
<div class="note mt4" style="font-size:13.5px">${v.sub}</div>
<div class="sec">To‘lov tizimi</div>
<div class="card"><div class="row"><div class="tile" style="font-weight:700">M</div><div class="rt"><b>Multicard</b><small>${v.status[0]}</small></div><span class="tag ${v.status[2]}">${v.status[1]}</span></div>${v.bar}</div>
<div class="sec">Oxirgi to‘lovlar</div>
${v.rows ? `<div class="card">${v.rows}</div>` : empty('wallet', 'To‘lovlar yo‘q', 'Birinchi TOP to‘lovi shu yerda chiqadi')}
${anav('p')}`;

/* J. To‘lov tafsiloti */
export interface PayDetailVM { clock: string; amount: string; plan: string; order: string; status: string; app: string; time: string; user: string; userId: string; canRefund: boolean }
export const payDetail = (v: PayDetailVM) => `${bg}
${ah('To‘lov', v.clock)}
<div class="h2 mt4" style="font-size:30px;letter-spacing:-1px">${v.amount} <span style="color:var(--tileic)">so‘m</span></div>
<div class="note mt4">${v.plan}</div>
<div class="card mt16">
${row('tag', 'Buyurtma', v.order)}
${row('check', 'Holati', v.status, '⏳ kutilmoqda · ✕ o‘tmadi')}
${row('wallet', 'Ilova', v.app)}
${row('clock', 'Vaqti', v.time)}
${row('user', 'Foydalanuvchi', I('chev'), v.user, 'uopen', v.userId)}
${row('eye', 'Chek', I('chev'), 'Multicard cheki', 'receipt')}
</div>
${spacer()}
<div class="pbtns" style="justify-content:center">${pb('Holatni tekshirish', 'gold', undefined, 'jcheck')}${v.canRefund ? pb('Pulni qaytarish', 'red', undefined, 'jrefund') : ''}</div>`;

/* F. Yana */
export interface MoreVM { clock: string; active: string; activeSub: string; tops: string; topsSub: string; autoSub: string; price: string; test: boolean }
export const more = (v: MoreVM) => `${bg}
${xhdr('Yana', undefined, v.clock)}
<div class="sec" style="margin-top:6px">Kontent</div>
<div class="card">
${row('brief', 'Faol e’lonlar', v.active + ' ' + I('chev'), v.activeSub, 'go', 'R')}
${row('bolt', 'Faol TOP’lar', v.tops + ' ' + I('chev'), v.topsSub, 'go', 'T')}
${row('shield', 'Shubhali so‘zlar filtri', I('chev'), '“oldindan”, “o‘tkazing”, karta raqami', 'go', 'K')}
${row('pin', 'Hududlar va ish turlari', I('chev'), 'Tumanlar, masofa, ish turlari ro‘yxati', 'go', 'Q')}
</div>
<div class="sec">Boshqaruv</div>
<div class="card">
${row('chat', 'Avtomatik amallar jurnali', I('chev'), v.autoSub, 'go', 'P')}
${row('send', 'Botdan xabar yuborish', I('chev'), 'Hammaga yoki tuman, yozuv bo‘yicha', 'go', 'L')}
${row('tag', 'TOP narxi', I('chev'), v.price, 'go', 'M')}
</div>
<div class="card mt12">
${row('info', 'Favqulodda tugmalar', I('chev'), 'Yangi e’lonlarni yoki to‘lovni to‘xtatish', 'go', 'N')}
${row('shield', 'Kirish kodini o‘zgartirish', I('chev'), '12 belgi · raqam va harf', 'go', 'G')}
${row('eye', 'Kirishlar jurnali', I('chev'), 'Xato kodlar · Hamma joydan chiqish', 'go', 'O')}
</div>
${v.test ? `<div class="card mt12">${row('wrench', 'Sinov', I('chev'), 'Faqat sinov APK’sida', 'go', 'S')}</div>` : ''}
${anav('y')}`;

/* G. Kod */
export interface CodeVM { clock: string; ok: boolean[]; ready: boolean; err?: string }
export const code = (v: CodeVM) => `${bg}
${xhdr('Kirish kodi', undefined, v.clock, 'back')}
${rings(I('shield', 2), '', 'goldav')}
<div class="h1" style="margin-top:-4px">Kodni <span style="color:var(--tileic)">o‘zgartirish</span></div>
<div class="sub" style="margin-top:4px">Yangi kod 12 belgi: raqam va harf</div>
<div class="field mt16"><label>Hozirgi kod</label><input class="fin" data-in="gcur" type="password" maxlength="12" autocomplete="off" placeholder="••••••••••••"></div>
<div class="field mt12"><label>Yangi kod</label><input class="fin" data-in="gnew" type="password" maxlength="12" autocomplete="off" placeholder="12 belgi"></div>
<div class="field mt12"><label>Yangi kodni qaytaring</label><input class="fin" data-in="grep" type="password" maxlength="12" autocomplete="off" placeholder="12 belgi"></div>
<div class="card mt16">
${[['12 ta belgi', v.ok[0]], ['Kamida 1 ta harf va 1 ta raqam', v.ok[1]], ['Ikki marta bir xil yozilgan', v.ok[2]]].map(([t, on]) => `<div class="row"><div class="tile"${on ? ' style="background:rgba(142,243,192,.16);color:#5fe3a3"' : ''}>${I('check')}</div><div class="rt"><b>${t}</b></div><div class="rv"></div></div>`).join('\n')}
</div>
${v.err ? `<div class="note mt12" style="font-size:12.5px;color:var(--danger)">${v.err}</div>` : '<div class="note mt12" style="font-size:12.5px">Saqlagach boshqa qurilmalardagi Nazorat yopiladi, botga xabar boradi.</div>'}
<div class="spacer"></div>
<div class="btn gold"${A('gsave')} style="${v.ready ? '' : 'opacity:.45;box-shadow:none;'}margin-bottom:22px">Saqlash</div>`;

/* K. Shubhali so‘zlar */
export const words = (clock: string, list: string[], can: boolean) => `${bg}
${ah('Shubhali so‘zlar', clock)}
<div class="note mt4">Shu so‘zli e’lon darhol chiqmaydi, Navbatga tushadi.</div>
<div class="field mt14"><label>Yangi so‘z</label><input class="fin" data-in="kword" placeholder="So‘z yoki ibora"></div>
<div class="pbtns mt10" style="padding:0 20px">${pb('Qo‘shish', 'gold', 'plus', 'kadd')}</div>
<div class="chips mt16">${[...list.map((t, i) => `<span class="chip"${A('kdel', i)}><span data-raw>${esc(t)}</span> <span style="color:var(--muted)">✕</span></span>`), `<span class="chip">karta raqami (16 xonali son) <span style="color:var(--muted)">✕</span></span>`].join('')}</div>`;

/* L. Botdan xabar */
export interface BroadcastVM { clock: string; to: string; script: string; count: number; ready: boolean; district?: string; districts?: string[] }
export const broadcast = (v: BroadcastVM) => `${bg}
${ah('Botdan xabar', v.clock)}
<div class="lbl">Kimga</div>
<div class="pad">${seg([['Hammaga', v.to === 'all', 'lto', 'all'], ['Tuman', v.to === 'tuman', 'lto', 'tuman'], ['Ish beruvchi', v.to === 'beruvchi', 'lto', 'beruvchi'], ['Ishchi', v.to === 'ishchi', 'lto', 'ishchi']], 'display:inline-flex')}</div>
${v.to === 'tuman' ? `<div class="chips mt10">${v.districts!.map((d) => chip(d, v.district === d, 'ldist', d)).join('')}</div>` : ''}
<div class="lbl">Yozuv</div>
<div class="pad">${seg([['Ikkalasi', v.script === 'both', 'lscr', 'both'], ['Lotin', v.script === 'lat', 'lscr', 'lat'], ['Кирилл', v.script === 'cyr', 'lscr', 'cyr']], 'display:inline-flex')}</div>
<div class="lbl">Matn</div>
<div class="field ta"><textarea class="tin" data-in="ltext" placeholder="Xabar matni…"></textarea></div>
<div class="note mt12">${v.count} kishiga boradi</div>
${spacer()}
<div class="btn gold"${A('lsend')}${offIf(!v.ready)}>${I('send')}Yuborish</div>`;

/* M. TOP narxi */
export const price = (clock: string, p: string, d: string, changed: boolean) => `${bg}
${ah('TOP narxi', clock)}
<div class="field mt8"><label>Narx</label><div class="v"><input class="fin v" data-in="mprice" inputmode="numeric" value="${p}" style="width:auto;max-width:9ch" size="${p.length}"> so‘m</div></div>
<div class="field mt12"><label>Muddat</label><div class="v"><input class="fin v" data-in="mdays" inputmode="numeric" value="${d}" style="width:auto;max-width:4ch" size="${d.length}"> kun</div></div>
<div class="note mt12">Yangi narx keyingi to‘lovlardan boshlab amal qiladi. Ilovani yangilash shart emas.</div>
${spacer()}
<div class="btn gold"${A('msave')}${offIf(!changed)}>Saqlash</div>`;

/* N. Favqulodda */
export const emergency = (clock: string, s: { stopPosting: boolean; paymentsOff: boolean; maintenance: boolean }) => `${bg}
${ah('Favqulodda', clock)}
<div class="card mt8">
${row('brief', 'Yangi e’lonlarni to‘xtatish', sw(s.stopPosting), 'Eski e’lonlar ko‘rinib turadi', 'ntog', 'stopPosting')}
${row('wallet', 'To‘lovlarni o‘chirish', sw(s.paymentsOff), '“TOP qilish” vaqtincha yopiladi', 'ntog', 'paymentsOff')}
${row('wrench', 'Texnik ishlar rejimi', sw(s.maintenance), 'Hammaga “Texnik ishlar” oynasi', 'ntog', 'maintenance')}
</div>
<div class="note mt12">Har birini yoqishda “Ishonchingiz komilmi?” so‘raladi va jurnalga yoziladi.</div>`;

/* O. Kirishlar */
export const logins = (clock: string, tab: number, rows: string) => `${bg}
${ah('Kirishlar', clock)}
<div class="chips mt8">${chip('Hammasi', tab === 0, 'otab', 0)}${chip('Xato kodlar', tab === 1, 'otab', 1)}</div>
<div class="mt14"></div>
${rows ? `<div class="card">${rows}</div>` : empty('eye', 'Hali yozuv yo‘q', 'Har kirish: vaqt, qurilma, natija')}
${spacer()}
<div class="pbtns" style="justify-content:center">${pb('Hamma joydan chiqish', 'red', 'logout', 'oall')}</div>`;

/* P. Avtomatik amallar */
export const autoActs = (clock: string, rows: string) => `${bg}
${ah('Avtomatik amallar', clock)}
<div class="sec" style="margin-top:6px">Qoidalar</div>
<div class="card">
${row('flag', '3 ta turli odam shikoyat qilsa', '', 'E’lon yashiriladi, Navbatga tushadi')}
${row('shield', 'Shubhali so‘z bo‘lsa', '', 'E’lon Navbatga tushadi')}
${row('cal', '“Qachon” o‘tib ketsa', '', 'Ish bor e’loni yopiladi')}
${row('bolt', 'TOP muddati tugasa', '', 'TOP o‘chadi, egasiga xabar')}
</div>
<div class="sec">Jurnal</div>
${rows ? `<div class="card">${rows}</div>` : empty('chat', 'Hali amal yo‘q', 'Har birini “↩ Bekor qilish” mumkin')}`;

/* Q. Hududlar va ish turlari */
export const regions = (clock: string, ds: [string, boolean][], showAll: boolean, jobs: [string, string, boolean][]) => `${bg}
${ah('Hududlar va ish turlari', clock)}
<div class="sec" style="margin-top:6px">Tumanlar</div>
<div class="card">${(showAll ? ds : ds.slice(0, 5)).map(([t, on]) => row('pin', t, sw(on), undefined, 'qdist', t)).join('')}</div>
<div class="note mt8"${A('qmore')}>${!showAll && ds.length > 5 ? `Yana ${ds.length - 5} ta tuman · ` : ''}<span${A('qaddd')}>“+ Hudud qo‘shish”</span></div>
<div class="sec">Ish turlari</div>
<div class="chips">${jobs.map(([id, t, hidden]) => `<span class="chip"${A('qjob', id)}${hidden ? ' style="opacity:.45"' : ''}>${t}</span>`).join('')}<span class="chip"${A('qaddj')}>${I('plus')}Qo‘shish</span></div>`;

/* R. Faol e’lonlar */
export const actives = (clock: string, tab: number, counts: string[], q: string, cards: string) => `${bg}
${ah('Faol e’lonlar', clock)}
<div class="sels mt8">${['Ish bor', 'Ish kerak', 'TOP'].map((t, i) => `<div class="sel${tab === i ? ' on' : ''}"${A('rtab', i)}><small>${t}</small><b>${counts[i]}</b></div>`).join('')}</div>
<div class="search mt14">${I('search')}<input class="sin" data-in="rsq" placeholder="Qidirish" value="${esc(q)}"></div>
<div class="mt14"></div>
${cards || empty('brief', 'E’lon yo‘q', 'Joylangan e’lonlar shu yerda ko‘rinadi')}`;

/* S. Sinov */
export const sinov = (clock: string, acting: number) => `${bg}
${ah('Sinov', clock)}
<div class="sec" style="margin-top:6px">Kim bo‘lib ko‘rish</div>
<div class="card">${['Siz (egasi)', 'Sinov odam 1', 'Sinov odam 2', 'Sinov odam 3'].map((n, i) => `<div class="row"${A('act', i)}><div class="tile">${I('user')}</div><div class="rt"><b>${n}</b></div>${radio(acting === i)}</div>`).join('')}</div>
<div class="sec">Vaqtni oldinga surish</div>
<div class="pbtns" style="padding:0 20px">${pb('+1 kun', 'gold', 'clock', 'shift', 1)}${pb('+7 kun', '', 'clock', 'shift', 7)}</div>
<div class="sec">Ma’lumot</div>
<div class="pbtns" style="padding:0 20px">${pb('Hammasini tozalash', 'red', undefined, 'wipe')}</div>
<div class="note mt14">Bu qism faqat sinov APK’sida bor.</div>`;

export { off };
