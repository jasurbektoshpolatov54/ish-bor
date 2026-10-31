# Mini App yig'ishidan oldin ilova nusxasiga kichik o'zgartirishlar kiritadi.
# Ilovaning asl kodi (claude/apk) o'zgarmaydi. Ishlatish: python3 -I patch.py <ilova papkasi>
import pathlib
import re
import sys

app = pathlib.Path(sys.argv[1])


def edit(rel, fn):
    p = app / rel
    s = p.read_text(encoding='utf-8')
    out = fn(s)
    if out == s:
        sys.exit(f'{rel}: o‘zgartirish topilmadi')
    p.write_text(out, encoding='utf-8')
    print('o‘zgartirildi:', rel)


# 1. Brauzer oynachalari o'rniga Telegramga mos oynacha (window.__tg, inject.html da).
def native(s):
    n = len(re.findall(r'window\.(prompt|confirm|alert)\(', s))
    if n != 4:
        sys.exit(f'native.ts: 4 ta oynacha kutilgan edi, {n} ta topildi')
    return re.sub(r'window\.(prompt|confirm|alert)\(', r'await (window as any).__tg.\1(', s)


edit('src/app/native.ts', native)

# 2. Birinchi kirishda tanlangan til (window.__tg.script) ishlatilsin.
LANG = "script: /^ru/.test(navigator.language || '') ? 'ru' : navigator.language?.match(/^(uk|be|kk|ky|tg)/) ? 'cyr' : 'lat'"
edit('src/app/controller.ts', lambda s: s.replace(LANG, "script: (window as any).__tg.script || (" + LANG[len('script: '):] + ")", 1))

# 3. Bosh sahifadagi yozuv (manba allaqachon yangilangan bo'lsa, tegilmaydi).
OLD = 'E’lon joylash bepul. Ish uchun hech kimga pul to‘lamang.'
NEW = 'Bir-biringizni to‘g‘ridan-to‘g‘ri toping.'
RU = 'Находите друг друга напрямую.'
if OLD in (app / 'src/views/user.ts').read_text(encoding='utf-8'):
    edit('src/views/user.ts', lambda s: s.replace(OLD, NEW))
    edit('src/ui/ru-dict.ts', lambda s: s.replace(f"'{OLD}': 'Подать объявление бесплатно. Никому не платите за работу.'", f"'{NEW}': '{RU}'"))

# 4. Telegram Stars to'lovi (faqat Stars serveri ulangan bo'lsa: STARS_API).
#    Narx va hisob serverda (worker/bot.js); ilova faqat Telegramning to'lov oynasini ochadi.
import os
if os.environ.get('STARS_API'):
    TG = '(window as any).__tg'
    edit('src/core/seed.ts', lambda s: s.replace("export const PAY_APPS: [string, string, string][] = [", "export const PAY_APPS: [string, string, string][] = [['⭐', 'Telegram Stars', 'stars'], ", 1))
    def ctl(s):
        s = s.replace("app: u.lastPayApp || 'payme', state: 'tanlash'", "app: 'stars', state: 'tanlash'", 1)
        s = s.replace("price: money(db.settings.topPrice), apps: PAY_APPS", f"price: s.p.app === 'stars' ? {TG}.starsLabel() : money(db.settings.topPrice), soum: s.p.app === 'stars' ? {TG}.starsSoum() : undefined, apps: PAY_APPS", 1)
        s = s.replace("status: 'kutilmoqda' as const, at: t, test: true", "status: 'kutilmoqda' as const, at: t, test: s.p.app !== 'stars'", 1)
        s = s.replace("  const ok = await N.confirm('Sinov to‘lovi'",
                      f"  if (p.app === 'stars') {{ const r = await {TG}.stars(p.order); if (r === 'paid') return payResult(pid, true); p.status = 'otmadi'; save(); const c = cur(); if (c.n === 'pay' && c.p.paymentId === pid) {{ c.p.state = r === 'cancelled' ? 'tanlash' : 'otmadi'; render(); }} return; }}\n  const ok = await N.confirm('Sinov to‘lovi'", 1)
        s = s.replace("stack.push({ n: 'paid', p: { id: l.id, amount: p.amount } })", f"stack.push({{ n: 'paid', p: {{ id: l.id, amount: p.amount, star: p.app === 'stars' ? {TG}.starsLabel() : undefined }} }})", 1)
        s = s.replace("price: money(s.p.amount || db.settings.topPrice) });", "price: s.p.star || money(s.p.amount || db.settings.topPrice) });", 1)
        return s
    edit('src/app/controller.ts', ctl)
    def view(s):
        SO = "${v.price}${v.price.startsWith('⭐') ? '' : ' so‘m'}"
        s = s.replace("export interface PayVM { icon: string; title: string; days: number; price: string;", "export interface PayVM { icon: string; title: string; days: number; price: string; soum?: string;", 1)
        s = s.replace("${row('wallet', 'Summa', `<b style=\"color:var(--text);font-size:16px\">${v.price} so‘m</b>`)}",
                      "${row('wallet', 'Summa', `<b style=\"color:var(--text);font-size:16px\">" + SO + "</b>`, v.soum ? `${v.soum} so‘m · MB kursi` : undefined)}", 1)
        s = s.replace("To‘lash — ${v.price} so‘m", "To‘lash — " + SO, 1)
        s = s.replace("${row('wallet', 'To‘landi', `${v.price} so‘m`)}", "${row('wallet', 'To‘landi', `" + SO + "`)}", 1)
        return s
    edit('src/views/user.ts', view)
    edit('src/ui/ru-dict.ts', lambda s: s.replace("export const RU: Record<string, string> = {", "export const RU: Record<string, string> = {\n  'MB kursi': 'по курсу ЦБ', 'Telegram Stars': 'Telegram Stars',", 1))
    edit('src/ui/cyr.ts', lambda s: s.replace("const BR = ['Payme',", "const BR = ['Telegram', 'Stars', 'Payme',", 1).replace("if (w === 'km') return 'км';", "if (w === 'km') return 'км';\n  if (w === 'MB') return 'МБ';", 1))
