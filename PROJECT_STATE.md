# on-the-way — Project State

_Last updated: 2026-05-23_

> **Claude: read this file first, every session, before doing anything else.** It's the only continuity layer between sessions. The full chat transcripts in `/sessions/.../.claude/projects/` are the raw record, but this curated summary is what gets you back up to speed fastest.
>
> **Keep it updated as you work** — don't wait for the user to ask. Append to "Session log" whenever you reach a meaningful milestone (resolved issue, decision made, change shipped, new direction chosen). Refresh "Where we left off" at the end of each session, or any time you're about to be context-consolidated. If you can feel the context window filling up mid-task, that is the cue to write to this file before continuing.
>
> Commit and push the file at the end of each session so it travels with the repo on GitHub. The user runs the commit from their own terminal (sandbox can't always remove `.git/index.lock` itself).

This file is the single source of truth for what this project is, where its pieces live, and what's outstanding.

---

## What this is

A mobile app that automatically tracks packages by parsing shipment-confirmation emails. User signs up, the app gives them a forwarding email address (`<their-id>@onthewayapp.net`), they forward shipping confirmations there, and the parsed packages show up in the app with status, ETA, tracking number, carrier, merchant, and a user note field.

Goal: ship to the Google Play Store (and later iOS App Store) with proper user/legal protections and small-format ad monetization.

---

## Architecture

| Layer | Tech | Hosted at |
|---|---|---|
| Mobile app | React Native / Expo SDK 54 | Built via EAS, distributed as APK (preview) for now |
| Backend API | Node.js / Express | Railway |
| Database | Postgres | Supabase |
| Auth | Supabase Auth (JWT, ES256/JWKS) | Supabase |
| Email ingest | Cloudflare Email Routing → Cloudflare Worker `on-the-way-email` → POST /webhook/email | Cloudflare |
| OTA updates | EAS Update | Expo CDN |

Repos:
- Backend: `cg1980-cyber/on-the-way-backend` on GitHub
- Mobile: `cg1980-cyber/on-the-way-mobile` on GitHub (pushed 2026-05-18; remote = `https://github.com/cg1980-cyber/on-the-way-mobile.git`). Local clone at `C:\Users\hicli\on-the-way`.
- Password reset page: hosted via GitHub Pages from the mobile repo's `/docs` folder at `https://cg1980-cyber.github.io/on-the-way-mobile/reset.html`.

---

## Key IDs and URLs

- Expo account: `@cgiles1980`
- EAS project: `@cgiles1980/on-the-way`
- EAS project ID: `7bc227c6-5c80-4a00-82ab-30b165c89344`
- Android package name: `net.onthewayapp.app` (PERMANENT — never change after Play Store release)
- Email forwarding domain: `onthewayapp.net`
- Backend service: Railway, **Hobby plan $5/mo** (upgraded 2026-05-18 — trial had expired, taking the backend offline). Project name in dashboard now reads `zesty-harmony` but service is still `on-the-way-backend`. Public URL: `https://on-the-way-backend-production.up.railway.app` (port 8080). Same URL as before the trial expiry, so no app-side config changes were needed.
- Supabase project: URL = `https://clqivishcuwlptoumdre.supabase.co`. Anon key + service-role key in `.env`. Auth URL config (Site URL + Redirect URLs) updated 2026-05-18 to point password reset emails at the GitHub Pages reset page.

Secrets live in `.env` (local) and EAS env vars under the `production` environment. Never commit `.env`.

---

## Mobile app build & deploy

### Files
- `App.js` — main app (auth, package list, detail screen, note UI)
- `app.json` — Expo config (name, slug, icons, env-var placeholders)
- `eas.json` — three build profiles: `development` (dev client APK), `preview` (no-dev-tools APK), `production` (AAB for Play Store)
- `package.json` — Expo SDK 54, expo-dev-client, supabase-js, etc.
- `.env` — three `EXPO_PUBLIC_*` vars (Supabase URL, Supabase anon key, backend URL)

### Day-to-day workflow (after preview APK is installed on phone)

1. Edit JS/styles on laptop in `C:\Users\hicli\on-the-way`
2. `eas update --branch preview --message "what changed"` — bundles & uploads to Expo CDN (~1 min)
3. Force-close app on phone, reopen — it auto-fetches the new bundle on launch

### Rebuild required only when

- Adding a new native module (anything beyond pure JS)
- Bumping Expo SDK version
- Changing app icon, splash, or `app.json` native config
- Changing `runtimeVersion`

### Build commands

- Dev client (with dev menu): `eas build --profile development --platform android`
- Preview (clean app, OTA-updated): `eas build --profile preview --platform android` ← **current target**
- Production (AAB for Play Store): `eas build --profile production --platform android`

---

## Backend deploy

- Push to `main` on GitHub → Railway auto-deploys
- Edit via GitHub web editor (CodeMirror) — no local clone needed
- Env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WEBHOOK_SECRET, etc.) live in Railway dashboard
- Logs: Railway dashboard → service → Deploys → HTTP logs (filter by `@path:/webhook` to see ingest hits)

### Key endpoints
- `POST /webhook/email` — secret-protected, ingests parsed shipping emails
- `POST /api/webhooks` — generic webhook
- `GET /api/packages` — list user's packages (JWT auth)
- `PATCH /api/packages/:id` — update nickname / archived / deleted / **note** (note added 2026-04 in this session)
- `GET /api/auth/profile` — verify token, return user profile

### Database schema (Supabase `packages` table)

Columns include: `id`, `user_id`, `tracking_number`, `carrier`, `merchant`, `status`, `eta`, `nickname`, `note`, `archived`, `deleted`, `created_at`. The `note` column was added in this session (April 2026).

---

## Recent decisions (and why)

- **Switched from `dev` build to `preview` build for Cliff's daily use.** Dev builds require the Updates tab dance and show the Expo dev menu. Preview builds load the latest published JS bundle silently on launch — closer to production UX, no menu clutter. Day-to-day OTA workflow stays the same.
- **Chose `net.onthewayapp.app` as Android package name** instead of the auto-suggested `com.cgiles1980.ontheway`. Reverse-domain matches the brand domain, isn't tied to a personal Expo username, and reads professional in Play Store listings. Permanent choice.
- **EAS env vars use the `production` environment for all three build profiles.** Single source of truth for Supabase/backend URLs across dev/preview/prod. If we ever need a separate staging backend, split into a `staging` environment then.
- **Backend auth uses JWKS + ES256** (Supabase's JWT signing key style). `auth.js` was rewritten earlier this session to verify tokens via JWKS rather than a shared HMAC secret — required because Supabase moved to asymmetric signing.
- **Note field max length = 280 chars**, sanitized of control chars before send. Matches Twitter for "comfortable to read on a card."

---

## Open issues / outstanding investigations

### ✅ RESOLVED 2026-05-23 — Email parser data quality
Two compounding bugs, both shipped as commit `ef84aeb` on `cg1980-cyber/on-the-way-backend`:

1. **Field-name mismatch in `server.js` (the smoking gun).** The webhook handler was reading `parsed.trackingNumber` and `parsed.estimatedDelivery`, but `emailParser.js` exports those fields as snake_case (`tracking_number`, `estimated_delivery`). Result: every insert wrote `NULL` for tracking and undefined for ETA, and the dedup-by-tracking-number check never matched anything — so each status-update email created a brand-new duplicate row. Fixed by switching the reads to snake_case.

2. **Over-permissive carrier detection in `emailParser.js`.** The old code used `content.includes('ups')`, which matches the substring `ups` inside `groups`, `setups`, `support`, etc. — turning any random email containing those words into a "UPS shipment" with merchant captured from the next "from <X>" line in the body. Replaced with word-boundary regexes (`\bups\b`, `\busps\b`, `\bfedex\b`) plus carrier-specific phrase checks (`ups.com`, `usps.com`, UPS-shape `1Z…` tracking numbers, etc.).

Also added in the same commit:
- New `isShipping` flag returned by `parseCarrierEmail`. True only when we found a recognized carrier + a shipping keyword (or a tracking-number-shaped string). The webhook now returns `200 {message:'Not a shipping email, ignoring'}` and skips the insert when `isShipping === false`, so non-shipping email forwarded to the user's tracking address no longer creates junk rows.
- Merchant blocklist (`gmail`, `yahoo`, `iphone`, `unknown sender`, etc.) so the parser never stores a generic mail-provider name as the merchant.

**Cleanup pass on existing junk rows (2026-05-23):** ran the inspect query in Supabase, found 10 junk rows for Cliff's user (4 "Unknown Sender / USPS", 4 "Gmail / Unknown", 2 "Gmail / UPS"), all with `tracking_number IS NULL`. Archived all 10 via SQL `UPDATE packages SET archived = true WHERE …` (reversible — rows remain, just hidden from the Active tab). Final per-user counts: active=4, archived=10, deleted=1, total=15. SQL is preserved in `_backend_review/cleanup_junk_packages.sql` for future reference.

### ✅ RESOLVED 2026-05-18 — "Active(0) packages" issue
Compound root cause, three layers:
1. **Mobile app was sending the wrong auth header** (`x-user-id` instead of `Authorization: Bearer <JWT>`) — fixed in `App.js` last session via `makeAuthenticatedRequest` helper, committed in `72cc824`.
2. **Railway backend was offline** — trial had expired, the service was at "0/1 service online", and curl returned `{"status":"error","code":404,"message":"Application not found","X-Railway-Fallback:true}`. Upgraded to Hobby plan ($5/mo) on 2026-05-18 — service came back at the same public URL, no app-side changes needed.
3. **Frontend filter was over-strict** — `deduplicatePackages` required `p.tracking_number` to be truthy, dropping every row whose tracking number the parser hadn't extracted. Relaxed the filter in `App.js` (commit `62debd9`); now packages without tracking numbers also appear. Shipped via `eas update --branch preview` and confirmed on phone: Active shows 5 cards, Deleted shows 1.

### ✅ RESOLVED 2026-05-18 — Password reset link broken
- Symptom: Supabase password reset emails linked to `http://localhost:3000` (the default `Site URL`), unreachable from any device.
- Fix: built a static reset page at `docs/reset.html` (commit `8b03f61`), enabled GitHub Pages from the mobile repo's `/docs` folder, updated Supabase Auth → URL Configuration to set both the Site URL and Redirect URLs to `https://cg1980-cyber.github.io/on-the-way-mobile/reset.html`. Verified end-to-end: requesting a fresh password reset email now lands on a working "Set New Password" form, and the password actually updates in Supabase.
- This supersedes the older "deep link via `onthewayapp://` URL scheme" plan from task #26. Going the GitHub Pages route avoided an APK rebuild — deep links require native config that can't be shipped via OTA.

### Email forwarding rules currently in place (Cloudflare Email Routing)
| Address | Action | Destination |
|---|---|---|
| Catch-all | Send to Worker | `on-the-way-email` |
| `cliff@onthewayapp.net` | Send to email | `hicliff1980@gmail.com` |
| `cgiles1998.a940d0@onthewayapp.net` | Send to Worker | `on-the-way-email` (redundant per-user entry — catch-all already does this) |
| `support@onthewayapp.net` | Send to email | `hicliff1980@gmail.com` |

---

## Production readiness checklist (before Play Store submit)

- [ ] **Privacy policy** hosted at a public URL (link from Play Store listing). Must disclose: Supabase auth, email content processing, AdMob ad tracking.
- [ ] **Account deletion flow** in-app (Google requires this, not just "contact us"). User taps a button → backend deletes their packages + auth row.
- [ ] **Data deletion request URL** (Google Play Data Safety form requires it).
- [ ] **Data Safety form** filled out in Play Console (what data, why, encrypted in transit, etc.).
- [ ] **Terms of Service** hosted at a public URL.
- [ ] **AdMob** integration (`react-native-google-mobile-ads`) — banner on package list, no ads on detail screen. Requires AdMob account + ad unit IDs.
- [ ] **App icons + splash screen** at proper resolutions (currently using defaults).
- [ ] **Play Console developer account** ($25 one-time).
- [ ] **Internal testing track** first (closed group of 10-20 testers) before production rollout.
- [ ] **Sentry or equivalent** for crash reporting.
- [ ] **Rate limiting** on backend webhook + API endpoints.
- [ ] **WEBHOOK_SECRET rotation plan** documented.
- [x] **Password reset link works end-to-end** — done 2026-05-18 via GitHub Pages reset page + Supabase URL config update. See "RESOLVED" section above for details.
- [x] **support@onthewayapp.net mailbox** — forwarding via Cloudflare Email Routing rule to `hicliff1980@gmail.com`.
- [x] **Backend email parser data quality** — done 2026-05-23. Fixed snake_case/camelCase mismatch + tightened carrier detection + added `isShipping` gate to skip non-shipping emails. Existing junk rows archived in Supabase. See "RESOLVED" section above.

---

## Command cheatsheet

Run all from `C:\Users\hicli\on-the-way` unless noted.

```
:: One-time setup (already done)
npm install -g eas-cli
eas login                 :: or: eas login --sso
eas init
eas env:push production --path .env

:: Deploy a JS-only tweak (the daily loop)
eas update --branch preview --message "describe the change"

:: Build a fresh APK (only when native code or app.json changes)
eas build --profile preview --platform android

:: Check what env vars are uploaded
eas env:list production

:: Confirm logged in
eas whoami
```

---

## Session-history pointer

Full chat transcripts auto-saved by Claude live in the sandbox at:
`/sessions/.../.claude/projects/...`

If a future session needs to recover a specific past detail (exact code we wrote, error messages, alternative approaches we considered), Claude can read those JSONL transcripts. This file is the curated summary; the JSONL is the raw record.

---

## Session log

Append-only running record of meaningful events. Newest at the top. One line per event when possible; multi-line only when context is genuinely needed for recovery.

### 2026-05-23 (much later — visual round 2 + tracking attempt)
- **Visual round 2 (shipped):** SwipeablePackageCard now shows each populated field on its own line — nickname (big), merchant ("From X" subtitle when nickname is set, otherwise main title), carrier+status dot, tracking number, note. Blank fields hide. Card grows naturally. Commit `33394e0`, EAS update group `f0436452`.
- **Tracking number is now a tappable hyperlink** on the card AND detail screen. `getTrackingUrl(carrier, trackingNumber)` helper routes to carrier-specific tracking pages (USPS, UPS, FedEx, DHL) with 17track.net as the generic fallback. Implemented in `App.js`.
- **Ad slot placeholder (shipped):** `AdSlot` component injected at the middle of the active list (or at top of the empty state). Amber "SPONSORED" styling so it can't be confused with a package. Real AdMob is queued as task #48 — requires a native rebuild + Google AdMob account.
- **Live tracking-status feature (blocked, queued as task #49):** Cliff asked for status to auto-refresh on app open and pull-to-refresh, with delivered packages staying in Active until the user swipes them. Plan: USPS Tracking 3.2 API for USPS packages first, then FedEx/UPS later. Attempted to register for the USPS Business Customer Gateway via the online portal at https://reg.usps.com — failed at the identity-verification step. USPS instructed Cliff to email `mssc@usps.gov` (subject "USPS.com Business Account Creation Help") with business name, address, email, phone. MSSC hours Mon-Fri 7am-7pm CST, so earliest response is Monday 2026-05-25. Pivot alternative on the table: AfterShip free tier (100 trackings/month, covers all carriers via one API, no identity verification needed). See task #49 for the full implementation plan once we have credentials.
- Note for next session: the screenshot Cliff sent of the failed BCG signup confirmed identity verification was the blocker. If MSSC takes too long or pushes back, default to AfterShip — same architecture, faster path to a working demo.

### 2026-05-23 (later)
- Moved to a visual-changes swimlane. Cliff asked: tapping a package card should open an editable detail screen with three fields ("What it is" / "Who it came from" / "Reference Note") that work for Active and Archived packages; the Deleted detail screen should show a note that edits require restoring first.
- Backend: added `merchant` to the destructure and update payload in `PATCH /api/packages/:id`. Committed via GitHub web editor (driven by Claude-in-Chrome MCP) as `e085e06`. Note for next time: the local `on-the-way-backend` clone on Cliff's machine is now one commit behind remote — `git pull` before any local edits.
- Mobile (`App.js`): added `updateMerchant()` helper. Detail screen replaced "Add a Label" with **"What it is"** (still writes `nickname`), added **"Who it came from"** input writing to `merchant`, renamed "Note:" → **"Reference Note"**. For deleted packages, edit cards are hidden behind a single banner card ("📦 Restore to edit. Swipe right on the card in the Deleted tab…") so the user can't accidentally edit data that's about to be purged.
- After the OTA shipped, Cliff reported tapping a card did nothing (but swipe still worked). Diagnosis: pre-existing bug in `SwipeablePackageCard`'s internal `PanResponder` — `onStartShouldSetPanResponder: () => true` claimed every touch at the start, so the `TouchableOpacity` underneath never got its tap. Fix: claim the touch only once horizontal movement exceeds 5px AND is greater than vertical movement (lets vertical scroll through, lets taps fall through). Also fixed `rowBack` style which was missing `position: 'absolute'` — was rendering the green ARCHIVE / red DELETE bar in normal flow above each card instead of hiding it behind the card.
- Shipped both as commit `8730343a` (initial detail-screen change) and a follow-up commit for the tap/layout fix, plus EAS updates to the preview branch. Cliff verified end-to-end on his phone — tap opens the detail screen with new editable fields, swipe still reveals (and acts on) the action bars, deleted package shows the restore-to-edit banner.

### 2026-05-23
- Cloned the backend repo locally on Cliff's machine (`C:\Users\hicli\on-the-way-backend\`) and copied `emailParser.js` + `server.js` into the mobile repo's `_backend_review/` folder so the sandbox could read them.
- Diagnosed root cause of the Active(0)/junk-row issue as a compound: (a) snake_case/camelCase field-name mismatch in `server.js` was discarding every parsed `tracking_number` and `estimated_delivery` value the parser produced, (b) carrier detection in `emailParser.js` used loose substring matching (`content.includes('ups')`) that misclassified any email containing the word `groups`/`setups`/`support` as a UPS shipment.
- Rewrote `emailParser.js`: word-boundary carrier regex, merchant blocklist, new `isShipping` flag that's true only when we detected a real carrier + shipping keyword (or a tracking-number-shaped string). Edited `server.js` to fix the field names and to early-return `200 {ignoring}` when `isShipping === false`.
- Shipped both fixes as commit `ef84aeb` on `cg1980-cyber/on-the-way-backend` (Railway auto-deployed).
- Drove the cleanup SQL via the Claude-in-Chrome MCP on Supabase SQL Editor. Inspect query returned 10 junk rows for Cliff's user; archived all 10 via UPDATE. Verified per-user counts (active=4, archived=10, deleted=1, total=15).
- PowerShell quirk encountered during the deploy: `copy /Y` is a cmd.exe flag, not PowerShell. PowerShell's `Copy-Item` (aliased to `copy`) overwrites silently by default — no flag needed. Worth remembering for future cross-shell deploy instructions.
- Lefts open: end-to-end verification by forwarding a real shipping email to the tracking address; live confirmation that mobile app Active drops to a clean count after the cleanup; deletion of the auto-saved "Find Packages Without Tracking Numbers" query in Supabase (cosmetic only).

### 2026-05-18
- Confirmed the JWT-auth fix from the previous session was committed (`72cc824`) and shipped via EAS update.
- Discovered local `App.js` had drifted to a stale shorter version (851 lines vs 1299 committed) — restored from HEAD with `git show HEAD:App.js > /tmp/x && cat /tmp/x > App.js`.
- Built static password reset page at `docs/reset.html` (commit `8b03f61`); enabled GitHub Pages on the repo (main branch `/docs` folder); updated Supabase Auth → URL Configuration Site URL + Redirect URLs to `https://cg1980-cyber.github.io/on-the-way-mobile/reset.html`. Verified end-to-end.
- Diagnosed why app still showed Active(0) after the JWT fix: Railway trial had expired, backend service was offline (`X-Railway-Fallback:true`, `Application not found`). Upgraded Railway to Hobby plan ($5/mo). Service came back at the same URL — no app-side config change needed.
- After backend came back online, app still showed Active(0). Root cause: `deduplicatePackages` in `App.js` was filtering on `&& p.tracking_number`, dropping all rows whose tracking number the email parser hadn't extracted (which was most of them). Relaxed the filter (commit `62debd9`), shipped via EAS update. Active now shows 5 cards.
- Committed and pushed PROJECT_STATE.md update (`ae862c3`).
- Added this "Session log" + "read first, update as you go" convention to the doc itself so future sessions follow the same pattern.

### Pre-2026-05-18
For all events prior to this session, see the task list (`#1`–`#43` in Claude's TaskList tool) and the JSONL transcripts under `/sessions/.../.claude/projects/`. The current state of the project as of 2026-05-18 captures everything that resulted from those earlier sessions.

---

## Where we left off (2026-05-23, end of session)

App is fully working end-to-end with the new visual round shipped:
- Detail screen has three editable fields ("What it is" / "Who it came from" / "Reference Note") for Active+Archived, restore-to-edit banner for Deleted.
- List cards show nickname + merchant on separate lines, hiding any blank field.
- Tracking number is a tappable hyperlink that opens the carrier's tracking page (or 17track.net for unknown carriers).
- Ad slot placeholder lives in the middle of the active list (or top of the empty state).
- Swipe-to-archive / swipe-to-delete still works; action layer sits behind the card; tap opens detail.

**Open/queued items (no priority order — pick what you want next):**

1. **Task #49 — Live tracking status refresh.** BLOCKED on Cliff getting access to the USPS Tracking 3.2 API. Online BCG signup failed at identity verification (2026-05-23); next step is either (a) wait until Monday 2026-05-25 to email `mssc@usps.gov` for manual BCG creation, or (b) pivot to AfterShip free tier (100 trackings/month, all carriers in one API, simple email signup — strongly recommended if MSSC is slow). Full implementation plan lives in the task description.
2. **Task #48 — Real AdMob.** Replace the placeholder `AdSlot` with `<BannerAd/>` from `react-native-google-mobile-ads`. Requires Cliff's AdMob account + ad unit IDs + a native EAS build (not OTA). Not blocking, but needed before any monetization.
3. **More visual polish.** Cliff is in a "visual changes" swimlane — anything else he flags about the UI lands here.
4. **Pre-launch production readiness** (privacy policy, in-app account deletion, Data Safety form, Play Console setup) — see the checklist above.
5. **Architectural cleanup (low priority).** SwipeListView + SwipeablePackageCard's internal PanResponder are duplicative; could be simplified by moving hidden actions into SwipeListView's `renderHiddenItem` or dropping SwipeListView for a plain FlatList.

**Cosmetic cleanup (still optional):** "Find Packages Without Tracking Numbers" saved query lingers in Supabase SQL Editor's PRIVATE list. Delete any time.

**Rollback notes if anything regresses:**
- Parser-cleanup SQL is reversible: `UPDATE packages SET archived = false WHERE archived = true AND last_updated >= '2026-05-23'`.
- Mobile-side changes: revert relevant commits in `cg1980-cyber/on-the-way-mobile` and republish an earlier EAS update (`eas update --branch preview --republish --group <previous-group-id>`; group IDs visible in the EAS dashboard).
- Backend-side changes: revert in `cg1980-cyber/on-the-way-backend`; Railway auto-redeploys on push.
