# on-the-way — Project State

_Last updated: 2026-05-18_

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

### 🚨 Email parser is creating low-quality / garbage rows (active investigation, deferred)
- Inspected the Supabase `packages` table on 2026-05-18. Cliff's user (`e8496476-50e8-4add-bbf9-538f500ec54c`) has ~13 rows, but the data quality is poor:
  - Most rows have `tracking_number = NULL`.
  - Many rows have `merchant = "Gmail"` or `"Unknown Sender"` and `carrier = "Unknown"`.
  - Only 2 rows have actual tracking numbers (`940015020621763821050…` and one other).
- This means the backend's email-webhook parser is failing on most incoming emails — it's creating package records even when it can't extract real merchant / tracking / carrier data, and treating the From: line of generic Gmail messages as a merchant.
- The post-fix mobile app dedups the 13 raw rows down to 5 visible cards in Active (grouped by carrier+month).
- **Next step when we resume**: open the backend repo (`cg1980-cyber/on-the-way-backend`) and look at the email-webhook handler + `emailParser.js`. Two goals: (a) make the parser reject emails it can't classify instead of creating junk rows, (b) figure out why so many forwarded emails are getting attributed to "Gmail" as the merchant. Also clean up the existing junk rows in Supabase once parser is fixed.

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
- [ ] **Backend email parser data quality** — see "active investigation" above. Pre-launch we want clean rows in the DB so the app looks good to first users.

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

## Where we left off (2026-05-18)

App is fully functional end-to-end. Last confirmed working state on Cliff's phone: signed in as `cgiles1998@yahoo.com`, Active(5) / Archive(0) / Deleted(1).

**Pick up next session with the email parser cleanup** (see "Open issues / outstanding investigations" → email parser). Concretely:

1. Pull the backend repo: `git clone https://github.com/cg1980-cyber/on-the-way-backend.git` (or edit via GitHub web editor — repo is small).
2. Locate the webhook handler (likely `server.js` route `POST /webhook/email`) and `emailParser.js`.
3. Two changes:
   - Reject emails whose parser output doesn't include at least a recognized carrier + a tracking-number-shaped string. Don't insert junk rows.
   - Stop using the From: address as the merchant when the sender is a generic mail provider (gmail.com, yahoo.com, outlook.com, etc.) — those are forwarded messages, the real merchant is somewhere in the body.
4. Once parser is sane, run a one-time cleanup SQL on Supabase to delete or archive existing rows where `merchant IN ('Gmail','Unknown Sender','Unknown')` AND `tracking_number IS NULL`.
5. End-to-end test: forward a real shipping email to the user's tracking address, watch Railway logs, confirm a clean row appears in Supabase and in the app.

Everything else in the production-readiness checklist below is pre-launch polish, not blocking.
