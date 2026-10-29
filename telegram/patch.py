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
