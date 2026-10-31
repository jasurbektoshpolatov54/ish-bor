# Mehnat boti: Telegram Stars serveri

Bepul Cloudflare Worker. `.github/workflows/telegram.yml` uni o‘zi joylaydi (GitHub sirlarida `CLOUDFLARE_API_TOKEN` bo‘lsa).

- `/tg` — Telegram webhook: `/start`, `/paysupport`, `/terms`, to‘lovni tekshirish (pre_checkout) va qabul qilish.
- `/narx` — TOP narxi: yulduz soni va MB kursi bo‘yicha so‘mdagi qiymati (tiyingacha).
- `/invoice` — Mini App uchun to‘lov hisobi (Telegram imzosi tekshiriladi).

Nazorat (bot chatida): `/admin <Nazorat kodi>` bir marta, keyin `/tolovlar` va `/qaytar <raqam>`.

Narxni o‘zgartirish: GitHub → Settings → Secrets and variables → Actions → **Variables**:
`TOP_SOUM` (so‘m, standart 5000), `TOP_DAYS` (7), `STAR_USD` (1 ⭐ dollarda, 0.02).

Tekshiruv: `node worker/test.mjs`
