# Ish bor / Ish kerak — Codex uchun paket

Bu papkada ilovani yig‘ish uchun hamma narsa bor.

1. **`SPEC.md`** — to‘liq ma’lumotnoma: dizayn, har bir oyna va tugma, Nazorat, kod va raqam, TOP, Multicard, bot, server, APK.
2. **`CODEX_PROMPT.md`** — Codex’ga beriladigan buyruq.
3. **`design/`** — 59 ta oynaning rasmlari (qorong‘i, yorug‘, lotin, kirill) va ular chizilgan HTML fayllar.

## Codex’ga qanday beriladi
1. GitHub’da yangi bo‘sh repozitoriy oching va shu papkadagi hamma narsani unga yuklang.
2. Codex’da shu repozitoriyni tanlang.
3. `CODEX_PROMPT.md` ichidagi `---` chizig‘idan keyingi hamma matnni nusxalab, Codex’ga yuboring.
4. GitHub → Settings → Secrets → Actions → `ADMIN_INITIAL_CODE` nomli maxfiy qiymat qo‘shing va unga Nazorat kodingizni yozing. Kodni boshqa hech qayerga yozmang.
5. Codex tugatgach, GitHub → Actions → oxirgi ish → Artifacts → `ish-bor.apk` ni yuklab, telefonga o‘rnating.
