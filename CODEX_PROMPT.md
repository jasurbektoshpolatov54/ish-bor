# Build prompt for Codex — "Ish bor / Ish kerak" Telegram Mini App

Paste everything below into Codex, with this whole folder in the repository root. Build the APK first, then the mini app.

---

You are building **"Ish bor / Ish kerak"** (a free job board for day labourers in Uzbekistan) with its admin section ("Nazorat") and one paid feature ("TOP"). The owner will not edit anything after you finish.

**Deliver two builds from one codebase:**

1. **Now — a standalone Android APK that needs no server** (SPEC section 13). All data lives on the phone (`LocalApi`, SQLite via Capacitor). Telegram-only features are replaced exactly as table 13.2 says (native dialogs for name and phone, local notifications for bot messages, a "Sinov to‘lovi" O‘tdi / O‘tmadi dialog instead of Multicard). It includes the test-only "Sinov" card (screen `S-sinov`) to act as other users and move time forward. The owner installs the APK and tests everything on one phone.
2. **Later — the Telegram Mini App with server, bot and real Multicard payments** (SPEC 7, 9, 10, 11). Build it fully now as well, from the same UI code (`ServerApi`), so that moving to the mini app is only a build flag and deployment. The owner will create a bot in BotFather, fill `.env`, run `docker compose up -d`, and later add Multicard keys and restart.

Business rules live once in `shared/rules` and are used by both `LocalApi` and the server, so behaviour is identical.

## Step 0

Run `npm i -D playwright pixelmatch pngjs && npx playwright install chromium && node design/render.js`. This regenerates all 236 reference PNGs (4 variants) from the HTML mockups with the bundled Inter font in `design/fonts/`. Only the dark set is committed; the others must come from this script. Use these PNGs as the visual baseline.

## Sources of truth (read all of them before writing code)

1. `SPEC.md` — the complete specification in Uzbek. Every screen, button, text, state, rule, bot message, data seed and acceptance check is there. Implement **all** of it. Where SPEC says "bosilsa" (when tapped) it defines the exact behaviour.
2. `design/html/app.html`, `app0.html`, `extra.html`, `admin.html` — the pixel-exact mockups. Each screen is a `<div class="phone" id="s<ID>">`. Their `<style>` block and the icon path object `P` are the design system.
3. `design/screens/**` — the reference PNGs (390 CSS px wide at 2x) for every screen in 4 variants: `qorongi` (dark), `yorug` (light), `qorongi-kirill`, `yorug-kirill`.
4. `design/html/cyr.js` — the Latin to Uzbek-Cyrillic transliteration rules.

If SPEC.md and a mockup disagree on visuals, the mockup wins. If they disagree on behaviour, SPEC.md wins. Do not invent extra UI. Do not drop anything.

## Hard rules

- **Design must be 1:1 with the images.** Copy the CSS from the mockup `<style>` verbatim into the app (CSS variables for both themes, every class: `.phone .glow .pat .hdr .back .big .h1 .h2 .sub .note .sec .secrow .card .row .tile .rt .rv .btn .gold .mint .ghost .link .sels .sel .chips .chip .tag .lc .rings .av .stats .st .field .lbl .sw .step .seg .radio .nav .search .two .bigc .desc .plans .plan .days .greet .emp .sheet .grab .dots .lockchip .grid2 .st2 .bar .bars .pbtns .pbtn` …). Use plain CSS, no Tailwind, no component library. Use the SVG paths in `P` unchanged. Font: Inter 400/500/600/700 from `design/fonts/` (same files the mockups use).
- All UI strings must match the mockups and SPEC.md character for character, including the Uzbek apostrophes `‘` and `’`. Put them in one Latin dictionary. Generate the Cyrillic dictionary once with `cyr.js` rules (keep brand names Payme, Click, Uzum Bank, Paynet, Multicard, and the word TOP in Latin), commit it, and fix exceptions by hand.
- No fake data anywhere in production. First launch shows the empty states (`design/screens/bosh-holat`).
- The admin access code is never stored in plain text: hash it with argon2id, seed it from `ADMIN_INITIAL_CODE` on first start, never log it, never put it in code, docs or tests. Admin identity is a Telegram-verified phone equal to `ADMIN_PHONE`, re-checked on every admin request (SPEC 6.1).
- Payment amounts and TOP duration come only from server settings. TOP activates only from a Multicard callback with a valid signature (or a server-side status query). Callbacks are idempotent (SPEC 7).
- Without Multicard keys the app must run without errors, with every "TOP qilish" entry hidden and Nazorat showing "Ulanmagan".
- The APK build must contain no secrets: no Multicard keys, no plain admin code (only the PBKDF2 hash made at build time from `ADMIN_INITIAL_CODE`, SPEC 13.3). The "Sinov" code must be excluded from the mini app build.

## Stack

- `web/`: React 18 + TypeScript + Vite. Telegram WebApp SDK (`telegram-web-app.js`): `ready()`, `expand()`, theme params, `BackButton`, `HapticFeedback`, `openLink`, `openTelegramLink`, `requestContact`, `LocationManager` (fallback `navigator.geolocation`), `showConfirm`, `showAlert`, `setHeaderColor`, `setBackgroundColor`, `setBottomBarColor`, safe-area insets.
- `server/`: Node 20 + TypeScript, Fastify, Prisma + PostgreSQL 16, grammY bot via webhook, node-cron (Asia/Tashkent), argon2, exceljs, zod.
- Root: `docker-compose.yml` with `caddy` (automatic HTTPS for `DOMAIN`, serves `web` build, proxies `/api`), `server`, `postgres` (volume), nightly `pg_dump` backup (14 days). `.env.example` with every variable from SPEC 7.1 and 11, commented in Uzbek. Server runs migrations and seeds (SPEC 8) on start.
- `android/` via Capacitor 6: app name "Ish bor", id `uz.ishbor.app`, icon and splash from SPEC 13.1, plugins: sqlite, local-notifications, geolocation, speech-recognition, dialog, share, haptics, status-bar (colour `--bg`). `npm run apk` produces a signed release APK (generate a keystore if missing and document it). Add `.github/workflows/apk.yml` that builds the APK on every push and uploads it as an artifact, taking `ADMIN_INITIAL_CODE` from repository secrets.
- `README.md` in Uzbek with: how to get and install the APK (SPEC 13.4), then the mini app steps from SPEC 11, plus `npm run admin:reset-code`.

## What to build (checklist, follow SPEC section numbers)

1. Design system and components (SPEC 1–2), animations (2.13), skeletons, offline bar.
2. User screens 3.1–3.31 with every button, state and transition (table 4.1), Telegram BackButton parity, draft saving for forms, bottom sheets.
3. Rules 4.2–4.7: auto titles, TOP ordering only inside the filtered result, haversine distance filter with the upper-bound rule and the poster's own radius, empty/disabled/selected/loading/error states, Latin/Cyrillic switch for the whole app and the bot, dates and money formatting, initData auth.
4. Listing lifecycle 5.1–5.5: statuses, phone visibility and rate limit, "Odam topdim", "Band", auto-close jobs, complaints auto-hide, suspicious-word queue, voice notes (MediaRecorder, 60 s, hide the button if unsupported), mic search via Web Speech (hide if unsupported).
5. Nazorat 6.1–6.9 with screens A–G and H–R: phone + code gate, lockout, 10-minute session with the countdown chip, queue actions, user actions, payments with Excel export via the bot, settings screens, emergency switches (maintenance screen 3.30, posting stop, payments off), broadcast with throttling and confirmation, code change, audit log for every action.
6. Multicard 7.1–7.4 exactly: `/auth` token caching, `POST /payment` with `payment_system` for app payments, `POST /payment/invoice` for the "Multicard" option, amounts in tiyin, OFD item from env, callback signature `md5(store_id + invoice_id + amount + secret)`, IP allow-list `195.158.26.90`, idempotency by `uuid`, 15-minute timeout with a status query, refunds from Nazorat, `MULTICARD_APPS` list with Paynet off by default. Before finishing, read the live docs at https://docs.multicard.uz/ and align field names, especially the `payment_system` value for Uzum and the amount unit; note any difference in `README.md`.
7. Bot 9.1–9.2: self-configuration on start (webhook with secret, menu button, commands, descriptions in both scripts), every message in the table, contact verification (`contact.user_id == from.id`), support messages into the Nazorat queue, admin replies, deep links into the app, polite handling of users who blocked the bot.
8. Seeds 8.1–8.4.

## Tests you must write and pass (SPEC 12, plus these for the APK)

- APK: build succeeds in CI; on an Android emulator (API 34) the app starts, the first-run dialogs appear, a listing can be posted and found, Nazorat opens with the right phone and code and is refused otherwise, "Sinov to‘lovi" O‘tdi turns TOP on, notifications fire, the "Sinov" switch changes the current user, data survives an app restart.

- **Visual:** add a test-only fixture mode (enabled only when `NODE_ENV=test`, impossible to enable in production) that renders each screen from `design/html/*.html` with the same data as the mockup. With Playwright (Chromium, viewport 390x844, deviceScaleFactor 2) screenshot each screen in all 4 variants and compare with the PNG in `design/screens/**` using pixelmatch. Fail if more than 0.5% of pixels differ. Iterate on CSS until every screen passes. Commit the diff report. Run the visual suite in the web build with mini app strings; the APK differs only by the strings listed in SPEC 13.2 (for example "Telefondagidek"), which get their own snapshot.
- **Flows:** Playwright tests for every row of table 4.1 and every disabled-button rule.
- **Server:** unit and integration tests for distance filtering, TOP ordering, auto-close jobs, complaint thresholds, suspicious words, initData verification, admin gate (wrong phone → 403, wrong code → attempts decrease, 5 failures → lock and bot message, idle timeout, code change), Multicard callback (bad sign rejected, duplicate ignored, extend adds 7 days), Cyrillic coverage (no Latin letters left except the allowed brand words).
- **Smoke:** `docker compose up -d` on a clean machine with only the required `.env` variables, then `/api/health` returns ok, and the bot's webhook is set.

Run all tests and keep fixing until everything is green. When you finish, write `DONE.md` listing every SPEC section number with "done" and the test that proves it. Nothing in SPEC may be left unimplemented or marked "later".
