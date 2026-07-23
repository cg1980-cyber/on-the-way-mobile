# On the Way — Project Reference

_Last updated: 2026-07-08_

## How to use this document

This is the standing reference for the On the Way project — the single source of truth for what the app is, where it's going strategically, how it's built, what's been decided, and what's outstanding. Read it at the start of any chat about this project.

Use it both ways: when a question is about features, scope, marketing, positioning, MVP priorities, or competitive trade-offs, ground responses in the strategy section below. When a question is about code, deployment, or operations, the architecture and reference sections are the source of truth. If a request conflicts with the three pillars, flag it directly. If a decision in a chat changes or expands the strategy, update this document so it stays current.

**Keep this file fresh.** Append to "Key decisions" when a meaningful call is made. Update "Active work" at the end of a session. Add a line to "History snapshot" when a major milestone ships. Don't wait to be asked.

**Commits.** As of 2026-07: Claude commits and pushes both repos directly (pre-approved by Cliff for this project). Historically Cliff pushed manually.

---

# Part 1 — Strategy

## What the app is

A mobile app for households to track every package coming to their address — including the ones they don't know about yet — without giving up email privacy.

**Distribution target:** Google Play Store first, iOS App Store later.

## The competitive landscape

The multi-carrier package tracking space is crowded. The main players:

- **Route** — 50M+ users, 600+ carriers, scans email inbox to auto-import shipments. The biggest direct competitor.
- **AfterShip** — 700+ carriers, syncs with Gmail and Amazon to auto-detect shipments.
- **Parcel** — 300 carriers, popular on iOS/Mac/Apple Watch, Amazon integration.
- **17TRACK, OneTracker, Package Tracker** — variations on the same theme: one app, many carriers, push notifications.

Carriers themselves also offer address-based tracking — USPS Informed Delivery, UPS My Choice, FedEx Delivery Manager — but each is siloed to its own carrier. Three separate accounts, three separate apps, no unified view.

## The gap in the market

No current app combines both of these in one experience:

- Unified multi-carrier tracking.
- Address-based auto-detection that pulls from all of the major carriers' authorization systems simultaneously, for a household with multiple people at one address.

Existing multi-carrier apps require tracking numbers or email scraping. Carrier-specific tools do address-based, but only for their own packages. The household angle — where everyone at the address sees every package — is genuinely uncovered.

## The three pillars of differentiation

### Pillar 1 — Household-first design

Every competitor is built around the individual user. On the Way is built around the household.

- One account, multiple household members, shared package feed.
- Per-person filtering — see Cory's packages, Cliff's packages, or the whole household.
- Gift/surprise mode — hide a specific package from a household member so birthday gifts aren't spoiled.
- Pet supply auto-categorization — recurring Chewy orders, vet meds, etc. tagged automatically.

### Pillar 2 — Address-based carrier authorization

The headline feature: see every package coming to your home, even the ones you don't know about yet.

Pull from USPS Informed Delivery, UPS My Choice, and FedEx Delivery Manager simultaneously through carrier authorization rather than email scraping. This catches:

- Gifts mailed by family.
- Packages a spouse ordered without telling the other.
- Anything addressed to the home that never generated an email confirmation.

This is the single feature that no current app does, and it's the strongest reason for someone to switch.

### Pillar 3 — Privacy-first positioning

Route and AfterShip scan user inboxes. That's a real turnoff for a growing share of users. On the Way uses carrier authorization, not email access, so the messaging writes itself:

- **We never read your email.**
- Local storage where possible.
- No ads, no data selling.

## MVP priority

Three features for the initial build:

1. **Household accounts** — multi-member, shared feed, per-person filtering.
2. **Address-based carrier authorization** — USPS Informed Delivery + UPS My Choice + FedEx Delivery Manager.
3. **The "package you didn't know about" hook** — lead marketing message.

Everything else comes later.

## Secondary features (post-MVP)

### Porch-to-person handoff

Once a package is delivered, existing apps go quiet. But the package isn't really done until it's inside and in the right hands.

- "Bring inside" reminder if a package sits on the porch for X hours.
- Notify whoever's home, not just the buyer.
- Mark as "received by [household member]."
- Optional Ring/Nest doorbell snapshot integration at delivery time.

### Smart bundling and arrival prediction

- "3 packages arriving Thursday" instead of three separate alerts.
- "Your Amazon order ships in 2 parts — part 2 arrives Friday."
- Likely-delay alerts based on carrier patterns before the carrier admits it.
- Heat map of the delivery week so you know which days to be home.

### Travel/away mode

Pause non-urgent notifications, alert a designated neighbor automatically, give a single end-of-trip summary. None of the current apps do this well.

### Anti-porch-pirate features

Each carrier takes a delivery photo. Pull them all into one timeline. Add neighborhood theft alerts (opt-in) and automated claim-filing assistance when something goes missing.

## Strategic positioning summary

Don't try to out-feature Route on carrier count — they've spent years on those integrations and will win that fight. Instead, be the best app for a specific use case they're ignoring:

**The multi-person household that wants total visibility without giving up email privacy.**

That's a real, defensible niche, and it aligns naturally with the carrier-authorization approach already part of the concept.

## Competitive risk to watch

Route or AfterShip could add address-based carrier authorization at any time. They have the user base and carrier relationships to do it faster than a solo builder. Speed matters, and the household-first angle has to be sharp enough that even if they catch up on auth, On the Way still wins on use case fit.

## Monetization direction

**Decided 2026-06-05 — phased approach.**

**Phase 1 — Beta era (now → V1 launch). "Free during beta." No ads, no paywall, no monetization.** Communicate openly that subscription comes when V1 ships. Beta lasts as long as needed to stabilize, recruit testers, ship Pillar 1 (household accounts) and Pillar 2 (address-based carrier auth), and prove product quality. Rationale: don't charge users for an unfinished product, and don't burn Pillar 3 with ads during the proving phase. The "we're investing before asking you to pay" narrative actively reinforces the privacy-first positioning.

**Phase 2 — V1 onward.**

- **Primary: household subscription / freemium.** Free tier covers a single user with limited features. Paid tier (~$20–40/year per household) unlocks household members, gift mode, anti-theft tools, longer history. Aligns with Pillar 1 (household-first) — pricing follows the same unit the product is built around. Mental model: Apple Family / Spotify Family.
- **Secondary: B2B landlord tier.** Property managers, apartment buildings, dorms, HOAs — anywhere multiple households share a delivery surface. Different product surface, higher price per door, parallel revenue stream, no consumer privacy compromise.
- **In reserve:** user-initiated affiliate (claims, insurance, hardware partners), hardware bundle partnerships (Ring/Eufy/Nest doorbells).
- **Off the table per Pillar 3:** display ads, behavioral targeting, data selling, tracked affiliate.

**V1 trigger** (when Phase 2 monetization activates): Pillar 1 + Pillar 2 shipped, parser and tracking stable, internal-testing-track feedback positive, production-readiness checklist green. No fixed date — quality bar, not a calendar.

---

# Part 2 — Technical reference

## Architecture

| Layer | Tech | Hosted at |
|---|---|---|
| Mobile app | React Native / Expo SDK 54 | Built via EAS, distributed as APK (preview channel for now) |
| Backend API | Node.js / Express | Railway (Hobby plan, $5/mo) |
| Database | Postgres | Supabase |
| Auth | Supabase Auth (JWT, ES256/JWKS) | Supabase |
| Email ingest (transitional) | Cloudflare Email Routing → Cloudflare Worker `on-the-way-email` → POST `/webhook/email` | Cloudflare |
| Outbound email (support@…) | Brevo SMTP relay via Gmail "Send mail as" | Brevo + Gmail |
| Outbound email (household invites) | Brevo transactional v3 API from backend (`BREVO_API_KEY`) | Brevo |
| OTA updates | EAS Update (preview branch) | Expo CDN |

**Note on the email-ingest pipeline.** It is the current way packages enter the system, but it's transitional. The Pillar 2 architecture (address-based carrier auth) replaces it as the primary mechanism. Keep email ingest as a complementary fallback for emails not covered by carrier auth (e.g. Amazon TBA codes); do not market it as the primary mechanism.

## Repos

- **Mobile:** `cg1980-cyber/on-the-way-mobile`. Local clone: `C:\Users\hicli\on-the-way`.
- **Backend:** `cg1980-cyber/on-the-way-backend`. Local clone: `C:\Users\hicli\on-the-way-backend` (currently one commit behind remote — `git pull` before any local edits).
- **Password-reset page:** GitHub Pages from the mobile repo's `/docs` folder → `https://cg1980-cyber.github.io/on-the-way-mobile/reset.html`.
- **Household invite-accept page:** same GitHub Pages `/docs` folder → `https://cg1980-cyber.github.io/on-the-way-mobile/invite.html` (fetches an invite by `?token=` and displays the join code + instructions).

## Key IDs and URLs

- **Expo account:** `@cgiles1980`
- **EAS project:** `@cgiles1980/on-the-way` (ID `7bc227c6-5c80-4a00-82ab-30b165c89344`)
- **Android package name:** `net.onthewayapp.app` (PERMANENT — cannot change after Play Store release)
- **Brand domain:** `onthewayapp.net` (Cloudflare DNS + Email Routing; Brevo verified as a sender)
- **Backend public URL:** `https://on-the-way-backend-production.up.railway.app` (port 8080). Railway project name in dashboard is `zesty-harmony` but service is still `on-the-way-backend`.
- **Supabase project URL:** `https://clqivishcuwlptoumdre.supabase.co`. Anon key + service-role key live in `.env` (local) and Railway env vars (deployed). Auth Site URL + Redirect URLs point at the GitHub Pages reset page.
- **Brevo SMTP** (outbound from `support@onthewayapp.net`): server `smtp-relay.brevo.com`, port `587`, login `ac572d001@smtp-brevo.com`. SMTP key (named "Gmail Send As" in Brevo, expires 2027-05-23) lives only in Cliff's Gmail Send-as config. **This is for Cliff's support-reply outbound via Gmail only.**
- **Brevo transactional API (household invites):** the backend (`household.js`) sends invite emails via Brevo's v3 HTTP API, NOT the Gmail Send-as SMTP key above. This is a *separate credential* — a Brevo **v3 API key** (Brevo dashboard → SMTP & API → **API Keys** tab) set as `BREVO_API_KEY` on Railway. Same Brevo account, same verified domain/DKIM/DMARC; just a different key type the server can use directly. As of 2026-06-14 not yet set, so invites surface the code/link in-app instead of emailing.

Secrets live in `.env` (local) and EAS env vars under the `production` environment. **Never commit `.env`.**

## Mobile app

### Files
- `App.js` — main app (auth, package list, detail screen, note UI, household management screen, member filter chips, recipient assignment + gift mode).
- `docs/reset.html` — password-reset page (GitHub Pages). `docs/invite.html` — household invite-accept page (GitHub Pages).
- `app.json` — Expo config (name, slug, icons, env-var placeholders).
- `eas.json` — three build profiles: `development` (dev client APK), `preview` (no-dev-tools APK, current daily target), `production` (AAB for Play Store).
- `package.json` — Expo SDK 54, expo-dev-client, supabase-js, react-native-swipe-list-view, etc.
- `.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_BACKEND_URL`.

### Day-to-day workflow

**Editing model — mobile is local-first, backend is cloud-first.**
- **Mobile (`on-the-way`):** edit locally in `C:\Users\hicli\on-the-way` (App.js is too large for the GitHub web editor to be ergonomic). Ship via `eas update`, then commit + push to GitHub so the source SoT stays in sync.
- **Backend (`on-the-way-backend`):** typically edited directly via GitHub's web editor — no local clone required. Railway auto-redeploys on push to main. Local clone exists at `C:\Users\hicli\on-the-way-backend` but is currently behind remote; only matters if doing local backend work.
- **Runtime is fully cloud-hosted:** source SoT on GitHub, backend runtime on Railway, DB + auth on Supabase, mobile bundle distribution on Expo CDN, email infra on Cloudflare + Brevo, password reset page on GitHub Pages.

**Mobile ship loop:**

1. Edit JS/styles on laptop in `C:\Users\hicli\on-the-way`.
2. `eas update --branch preview --message "what changed"` — bundles & uploads to Expo CDN (~1 min).
3. Force-close app on phone, reopen — auto-fetches the new bundle on launch.
4. `git add … && git commit -m "…" && git push` from `C:\Users\hicli\on-the-way` so the source SoT on GitHub matches what's live.

### Rebuild required only when

- Adding a new native module (anything beyond pure JS).
- Bumping Expo SDK version.
- Changing app icon, splash, or `app.json` native config.
- Changing `runtimeVersion`.

### Build commands

- Dev client (with dev menu): `eas build --profile development --platform android`
- Preview (clean app, OTA-updated): `eas build --profile preview --platform android` ← **current target**
- Production (AAB for Play Store): `eas build --profile production --platform android`

## Backend

- Push to `main` on GitHub → Railway auto-deploys.
- Editing via GitHub web editor works fine and is the path used most often (no local clone required).
- Env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBHOOK_SECRET`, etc.) live in Railway dashboard.
- Logs: Railway dashboard → service → Deploys → HTTP logs (filter by `@path:/webhook` to see ingest hits).

### Backend files
- `server.js` — Express app: webhook ingest, packages API, signup/profile, mounts the household router.
- `auth.js` — JWT verification (JWKS/ES256), `authMiddleware`, `getUserId`, rate limiters, webhook signature.
- `household.js` — household router (Pillar 1). Factory `createHouseholdRouter(supabase, auth)`. Sends invite emails via Brevo's v3 API.
- `emailParser.js` — carrier-email parser (`parseCarrierEmail`).

**Backend scoping model:** the server uses the Supabase **service-role** client, which **bypasses RLS**. So every endpoint scopes access in code (by `user_id` or household membership). RLS in the DB is the backstop for any direct mobile→Supabase writes.

### Key endpoints
- `POST /webhook/email` — secret-protected, ingests parsed shipping emails. Skips insert if parser returns `isShipping: false`. Stamps `household_id` + `recipient_member_id` (defaults recipient to the tracking-address owner).
- `POST /api/webhooks` — generic webhook (HMAC-signed).
- `GET /api/packages` — returns the caller's whole **household feed** (minus gift-mode hidden), or just their own packages if they have no household. JWT auth.
- `PATCH /api/packages/:id` — adder or any household member can edit `nickname`, `archived`, `deleted`, `note`, `merchant`, `recipient_member_id`, `hidden_from`.
- `DELETE /api/packages/:id` — package adder or household owner.
- `GET /api/auth/profile` — verify token, return user profile.
- `POST /api/auth/signup` — creates the user + tracking email. **Auto-joins a pending household invite for that email** if one exists (2026-07-06); otherwise auto-creates a household (owner = new user).
- `DELETE /api/auth/account` — permanent account deletion with household ownership handoff (2026-07-06).
- `POST /api/push/register` — store the device's Expo push token (2026-07-06). Backend sends household-wide pushes on new package / status change via `sendHouseholdPush()`.
- `POST /api/refresh-status` — EasyPost live-status refresh for the caller's household (2026-07-06). Returns `{enabled:false}` until `EASYPOST_API_KEY` is set on Railway.
- `GET /api/household/my-invite` — pending invitation for the caller's email (2026-07-06), powers the one-tap Join banner.
- `GET /api/household` — household + members + `{ me, myRole }`.
- `PATCH /api/household` — rename (owner only).
- `POST /api/household/invite` — owner invites by email; creates a pending member + invitation, emails the code via Brevo. Returns `invite_code`.
- `GET /api/household/invite/:token` — unauth (token is the credential); returns household name + `invite_code` for `invite.html`.
- `POST /api/household/accept` — auth; accept by `{ code }` or `{ token }`. Enforces email match. Replaces the invitee's auto-created solo household (moves their packages over, deletes the empty one).
- `PATCH /api/household/members/:id` — edit own display name; owner edits any member's name/role.
- `DELETE /api/household/members/:id` — owner removes a member, or a member leaves (blocks the last owner from orphaning the household).

### Database schema (Supabase)

**`packages`** — `id`, `user_id`, `tracking_number`, `carrier`, `merchant`, `status`, `estimated_delivery`, `nickname`, `note`, `archived`, `deleted`, `last_updated`, **`household_id`**, **`recipient_member_id`**, **`hidden_from uuid[]`** (gift mode — member ids who can't see the package).

**`households`** — `id`, `name`, `created_at`.

**`household_members`** — `id`, `household_id` (FK, cascade), `user_id` (FK auth.users, null until an invite is accepted), `role` (`owner`/`member`), `display_name`, `invite_email` (set while pending, null after accept), `joined_at`. Unique `(household_id, user_id)`.

**`household_invitations`** — `id`, `household_id` (FK), `invited_by` (member id), `email`, `token` (64-hex, auto), `invite_code` (short human code), `role`, `created_at`, `expires_at` (+7 days), `accepted_at`.

**`push_tokens`** (2026-07-06, created via `PUSH_TOKENS_SETUP.sql`) — `token` (PK), `user_id` (FK auth.users, cascade), `platform`, `updated_at`. Service-role only; the app never touches it directly.

RLS is enabled on all four tables and is household-aware. Migration SQL lives in the mobile repo: `HOUSEHOLD_SCHEMA_MIGRATION.sql` (tables + RLS + seed), `HOUSEHOLD_INVITE_CODE.sql` (the `invite_code` column), `HOUSEHOLD_FIX_OWNER.sql` (one-off owner-account correction).

## Email forwarding rules (Cloudflare)

| Address | Action | Destination |
|---|---|---|
| Catch-all | Send to Worker | `on-the-way-email` (parses shipping emails → backend) |
| `cliff@onthewayapp.net` | Send to email | `hicliff1980@gmail.com` |
| `cgiles1998.a940d0@onthewayapp.net` | Send to Worker | `on-the-way-email` (redundant per-user entry; catch-all already covers it) |
| `support@onthewayapp.net` | Send to email | `hicliff1980@gmail.com` (Brevo handles outbound from this address via Gmail "Send mail as") |

Brevo authentication adds 4 DNS records under `onthewayapp.net`: `brevo-code` TXT, `brevo1._domainkey` CNAME, `brevo2._domainkey` CNAME, `_dmarc` TXT.

---

# Part 3 — Decisions and current state

## Key decisions

- **Switched from `dev` build to `preview` build for daily use.** Preview loads the latest published JS bundle silently on launch — closer to production UX, no Expo dev menu clutter.
- **`net.onthewayapp.app` as Android package name.** Reverse-domain matches the brand domain, not tied to a personal Expo username. Permanent.
- **EAS env vars use the `production` environment for all three build profiles.** Single source of truth for Supabase/backend URLs across dev/preview/prod.
- **Backend auth uses JWKS + ES256** (Supabase's asymmetric JWT signing). `auth.js` verifies via JWKS, not a shared HMAC secret.
- **Note field max length = 280 chars,** sanitized of control chars. Matches Twitter for "comfortable on a card."
- **Password reset = static GitHub Pages page** at `docs/reset.html` instead of a deep-link URL scheme. Avoids a native rebuild; ships via OTA-free static hosting.
- **Brand-domain outbound via Brevo + Gmail Send-as,** not via changing MX records. Keeps Cloudflare Email Routing intact for inbound parser; adds outbound capability for support replies.
- **Email parser quality (2026-05-23 fix):** word-boundary carrier detection (no more substring matches on `ups` inside `groups`), snake_case field names matched between parser and server.js, new `isShipping` gate so non-shipping emails are skipped instead of becoming junk rows. Merchant blocklist (`gmail`, `yahoo`, `iphone`, etc.) prevents generic providers from being stored as merchants.
- **SwipeablePackageCard PanResponder claim threshold:** only claim the gesture after horizontal movement > 5px AND horizontal > vertical. Lets taps fall through to the inner TouchableOpacity, lets vertical scroll pass through, still catches swipes. (Previously claimed all touches at start, killing taps.)
- **Backend `PATCH /api/packages/:id` accepts `merchant`** so the in-app "Who it came from" field can override the parsed value. Commit `e085e06`.
- **Monetization decided 2026-06-05 — "Free during beta" (Option D).** No ads, no paywall, no monetization during beta. Subscription (household primary, B2B landlord secondary) activates at V1 when Pillars 1+2 ship and production-readiness checklist clears. Reason: don't charge for an unfinished product; don't burn Pillar 3 with ads during the proving phase; the "investing before charging" narrative reinforces privacy-first positioning. AdMob ruled out permanently — AdMob's Advertising ID + behavioral targeting data flow contradicts "no data selling." Considered and rejected: ads now / remove with premium later (burns Pillar 3 the moment first banner ships, hard to walk back), subscription now (charges for unfinished product), lifetime purchase only (gives up recurring revenue model that fits household-first pricing).
- **Household model (2026-06-14, Pillar 1 build):** one household per user for MVP (simpler RLS/UI; relax later). `hidden_from` stored as a `uuid[]` on `packages` rather than a join table (household sizes are tiny). Member departure nulls `recipient_member_id` (ON DELETE SET NULL); the last owner can't leave while others remain (must transfer ownership first). Every new signup auto-creates a household; when an invitee accepts, their auto-created **solo** household is replaced — packages move to the joined household, the empty one is deleted.
- **Invite accept = short code + in-app entry (2026-06-14),** not deep links — mirrors the `reset.html` precedent. A 6-char human code (no ambiguous chars) is emailed and shown on `invite.html`; the invitee signs up with the invited email, then enters the code in Settings → Household. Deep linking rejected (needs native rebuild); 64-char token kept as the URL credential behind the code.
- **EasyPost cost containment (2026-07-08):** Cliff is a personal creator, not a business — he won't subsidize per-tracker fees (~$0.02–0.03/package) for beta users outside his household (10 households ≈ $12–18/mo, scaling with success). Decision: `/api/refresh-status` is gated to an allowlist of household ids. The default allowlist is hardcoded to The Giles Household (`a60a1695-abb5-4d70-b3d8-b7385cd1e1cd`) so no Railway config is required; the `EASYPOST_ALLOWED_HOUSEHOLDS` env var (comma-separated ids) overrides it to extend/change access without a code change. Backend commits `756e2e5` + `b4869c4`. Non-allowlisted users still get free automatic updates via carrier emails + the tap-the-tracking-link fallback — the original zero-cost design. Server-side scraping of carrier pages was considered and rejected (bot walls, ToS, brittleness); on-device USPS page parsing noted as a possible free fallback but held in reserve. Long-term free path: USPS Tracking 3.2 API via BCG account (revive the MSSC thread) — free forever, majority carrier, also needed for Pillar 2. At V1, subscription revenue (~$20–40/yr vs ~$10/yr tracking cost) absorbs EasyPost for paying households.
- **Household invite email via Brevo v3 transactional API (2026-06-14),** a separate credential (`BREVO_API_KEY` on Railway) from the existing Gmail Send-as SMTP key (which is for Cliff's `support@` replies only and lives inside Gmail). Same Brevo account/verified domain. Chose the HTTP API over SMTP/nodemailer to avoid a new dependency and to keep the Gmail setup untouched.

## Strategic conflicts to resolve

Items currently live or queued that don't match the three pillars. Resolve before continuing in that area.

1. **Task #49 (USPS Tracking 3.2 API) is enrichment, not Pillar 2.** Tracking 3.2 looks up status for already-known tracking numbers. Pillar 2 is USPS *Informed Delivery* + UPS *My Choice* + FedEx *Delivery Manager* — different products that pull packages by address. Task #49 is useful as live-status enrichment for known packages, but the headline differentiator is task #52.
2. **Current email-forwarding ingest model → soft conflict with Pillar 3 ("We never read your email").** Better than Route/AfterShip's inbox scraping (user actively forwards rather than us reading their inbox), but still email-based. Defensible today, fully resolved by Pillar 2 (address-based carrier auth) replacing email ingest entirely. Keep as a transitional / complementary input; do not market the "we never read your email" line in any public-facing copy until Pillar 2 lands.
3. **Cloud-first storage → soft conflict with Pillar 3 ("Local storage where possible").** Every package currently lives in Supabase; mobile pulls fresh on each open + pull-to-refresh, no local cache. Marketing line says "where possible" so it's not a lie, but the honest answer to "what's on your servers?" is "all of it, indefinitely." Long-term shift to local-first cache + cloud sync is a meaningful architectural change; not blocking today, but flag it before committing to the line in public copy.

**Resolved 2026-06-05:** AdSlot/AdMob vs. Pillar 3 conflict — closed via Option D ("Free during beta"). See Key decisions and Monetization direction. Follow-on tasks: remove `AdSlot` component from `App.js`, ship via EAS update, close task #48 (AdMob) as won't-do, add visible "BETA" indicator to the app.

## Production readiness checklist (before Play Store submit)

- [x] **Privacy policy** hosted + live 2026-07-06 at `https://cg1980-cyber.github.io/on-the-way-mobile/privacy.html` (discloses Supabase auth, email-content processing, all processors incl. EasyPost/FCM, no analytics/ads/data selling, household visibility, retention). **Pending Cliff's read-through before Play Store submission.**
- [x] **Account deletion flow** in-app (shipped 2026-07-06): Settings → "Delete my account and data" → double confirm → `DELETE /api/auth/account`. Backend handles household ownership handoff (promotes longest-tenured joined member), dissolves empty households, deletes packages + push tokens + profile + auth user.
- [x] **Data deletion request URL** — `https://cg1980-cyber.github.io/on-the-way-mobile/privacy.html#delete` (in-app steps + 30-day email fallback). Live 2026-07-06.
- [ ] **Data Safety form** filled out in Play Console — **answers pre-drafted 2026-07-06** in `PLAY_STORE_DATA_SAFETY_ANSWERS.md` (copy-paste ready; blocked only on the Play Console account existing).
- [x] **Terms of Service** hosted + live 2026-07-06 at `https://cg1980-cyber.github.io/on-the-way-mobile/terms.html` (beta status, household rules, acceptable use, liability). **Pending Cliff's read-through.**
- [x] **App icons + splash screen** (shipped 2026-07-06): brand icon/adaptive-icon/splash/notification-icon generated from the HousePathLogo mark, wired in `app.json`, baked into the v1.1.0 build.
- [ ] **Play Console developer account** ($25 one-time).
- [ ] **Internal testing track** first (closed group of 10-20 testers) before production rollout.
- [ ] **Sentry or equivalent** for crash reporting.
- [x] **Rate limiting** on backend webhook + API endpoints — API limiter was live since the security pass; webhook limiter was defined but never mounted, fixed 2026-07-07 (backend commit `8cf0c99`).
- [x] **WEBHOOK_SECRET rotation plan** documented 2026-07-06 → `WEBHOOK_SECRET_ROTATION.md` (both storage locations, 5-min procedure, ingest-gap caveat).
- [ ] **Monetization implementation** — at V1 launch, ship household subscription paywall (Stripe via web checkout OR Google Play Billing for in-app subscription; pick at implementation time). Beta era ships with no monetization per 2026-06-05 decision.
- [x] **In-app "BETA" indicator** — satisfied since 2026-06-05: home-screen header reads "On the Way (Beta)". (Checklist item was never ticked; closed 2026-07-07.)
- [x] **Password reset link works end-to-end** (GitHub Pages reset page + Supabase URL config).
- [x] **support@onthewayapp.net inbound** (Cloudflare Email Routing → Gmail).
- [x] **support@onthewayapp.net outbound** (Brevo + Gmail Send-as, DKIM/DMARC verified).
- [x] **Backend email parser data quality** (carrier detection tightened, junk rows cleaned in Supabase).

## ⏸️ Session checkpoint — 2026-07-08 (night)

**Everything below is live and verified. Working trees clean; both repos pushed.**

Shipped this session (on top of the 2026-07-06/07 four-wave run):
- **EasyPost live tracking WORKING** (Task #49 fully closed). Key was mis-named `Easypost_API_Key` on Railway → renamed to `EASYPOST_API_KEY`. Confirmed live: packages flipped to "Available for Pickup" and "Delivered" on pull-to-refresh. Billing confirmed: ~$0.02–0.03 once per tracking number at first registration; refreshes are free.
- **`delivered_at` column** added (via browser-driven SQL — Claude ran it in Supabase after Cliff signed in). Delivered cards show "DELIVERED + real date" (from EasyPost delivery scan / delivery emails) instead of ETA.
- **Refresh scope tightened**: backend already excluded archived/deleted; mobile now only fires `/api/refresh-status` from the Active tab. Debug diagnostics popup removed.
- **Settings "About & Legal" card**: Privacy Policy, Terms of Service, Contact Support links + version line.
- **Household-load resilience fix** (mobile `2c20498`): a transient backend error (e.g. mid-redeploy) no longer wipes the household from the UI — only a genuine "No household" clears it; added a "Try again" button. (Root cause of a scare tonight where the household appeared "gone" — it was always intact in the DB; just a fetch-during-redeploy blip.)

Backend commits this session: `68849fc`, `b0e77af` (+ reverted lockfile `046144b`). Mobile HEAD: `2c20498`. Backend HEAD: `b0e77af`.

**Only remaining user action:** invite Cory (Android — confirmed) via Settings → Household → Invite Someone. The invite email now has a prominent "Download the app (Android)" button → `docs/download.html` (install steps + APK link), and `invite.html` links there too. Cory: download APK → allow unknown-source install → sign up with the invited email → auto-joins. A leftover pending "Test Cliff" invite (to hicliff1980@gmail.com) can be Removed anytime.

**⚠️ Distribution maintenance:** the app is NOT on the Play Store yet — distribution is a preview APK. `docs/download.html` hardcodes the current build's APK URL (currently build `a33d48aa`, v1.1.0, the FCM build). **Every new `eas build` produces a new APK URL → update the href in `docs/download.html` and push.** iOS is unsupported (no Apple Developer account). Proper fix on the checklist: Play Console internal testing track ($25) → testers install from the Play Store with auto-updates.

**Deploy hygiene reminder (learned tonight):** each Railway redeploy briefly fails in-flight requests; batch backend changes into fewer deploys, and always health-check `/` after a backend push.

## Active work

**Improvement wave shipped 2026-07-06 (autonomous four-wave run).** Everything below is live except where a Cliff step is flagged:

- **Wave 1 — mobile polish, live via OTA** (EAS update group `f2861de0-288b-4494-a1ff-db1431e84467`, mobile commit `ab39718`): status color edge + readable status pill on every card; delivery dates humanized ("Today" / "Tomorrow" / "Thu, Jun 18") on cards + detail; active list grouped by arrival day (Arriving today / Tomorrow / This week / Later / No date yet / Delivered); recipient member chip + 🎁 gift indicator on cards; AsyncStorage cache paints packages + household instantly on cold open (first real step toward Pillar 3 "local storage where possible"); household promo card in the empty state; pending-invite one-tap Join banner on the household screen; delete-account flow in Settings; pull-to-refresh now calls `/api/refresh-status` first.
- **Wave 2 — backend features, live on Railway** (commit `417588a`, route-verified): signup **auto-joins** a pending household invite (invitee never types a code); `GET /api/household/my-invite` powers the Join banner; `DELETE /api/auth/account` with household ownership handoff (promotes longest-tenured member, dissolves empty households — Play Store requirement); **parser name-matching** in the webhook (greeting/"delivered to" patterns, then unique-mention fallback; assigns `recipient_member_id` when exactly one member matches); push infra (`POST /api/push/register` + household-wide Expo push on new package / status change — inert until `push_tokens` table + tokens exist); `POST /api/refresh-status` EasyPost live-status endpoint (inert until `EASYPOST_API_KEY` set — task #49 backend HALF is now done, only the key is missing).
- **Wave 3 — brand assets + native rebuild v1.1.0** (mobile commit `f269f05`): real app icon / adaptive icon / splash / notification icon generated from the HousePathLogo mark (emerald path-to-house on dark slate); `app.json` → version 1.1.0 (new runtime isolates old binaries from new OTA bundles), `userInterfaceStyle: dark`, `android.package` set, expo-notifications plugin; App.js registers for push on login (fully guarded). EAS build `de89c2fd-fc1e-421f-b18c-bf041efc3148` (preview APK).
- **Wave 4 — docs + SQL**: `PUSH_TOKENS_SETUP.sql` written (Cliff pastes into Supabase); this doc updated.

**Cliff's steps to finish the wave (in order):**
1. ~~Install the new APK~~ **DONE 2026-07-06** — v1.1.0 installed and visually verified on Cliff's phone (new icon, dark splash, grouped card layout all confirmed good). Future OTA updates target runtime 1.1.0.
2. ~~Run `PUSH_TOKENS_SETUP.sql`~~ **DONE 2026-07-06** — `push_tokens` table created in Supabase, RLS verified (`push_tokens | true`). Devices now register tokens on app open.
3. ~~Firebase FCM credentials~~ **DONE + VERIFIED 2026-07-06.** Firebase project `on-the-way-d7427` created (Spark plan, Analytics off); `google-services.json` in repo root (gitignored — public repo — and uploaded to EAS as secret file env var `GOOGLE_SERVICES_JSON`, injected via new `app.config.js`); FCM V1 service-account key uploaded to Expo credentials; rebuild `a33d48aa` with FCM baked in installed on Cliff's phone. **Test notification delivered end-to-end** (Settings → 🔔 Send Test Notification → `POST /api/push/test`, backend commit `14bb3b5`, OTA group `6f29b27a`). Household-wide package alerts are now fully live.
4. ~~EasyPost production key~~ **DONE 2026-07-07/08** — `EASYPOST_API_KEY` added on Railway, backend redeployed and health-verified. Pull-to-refresh now calls live EasyPost tracking status. **Task #49 is closed.**
6. **Privacy Policy + ToS drafted, hosted, live 2026-07-06** (`docs/privacy.html`, `docs/terms.html` on GitHub Pages). Cliff to read both before Play Store submission; edits welcome.
5. **(Deferred by design) Sentry** — needs a Sentry account; the native module will piggyback the next rebuild after the account exists. Skipped this round to keep build risk low.

**Also still open:** ~~bring Cory in~~ **DONE 2026-07-10** — Cory confirmed The Giles Household showing correctly; multi-member UI (filter chips, recipient assignment, gift mode) now has real second-user data to exercise; Play Console account ($25) → then paste `PLAY_STORE_DATA_SAFETY_ANSWERS.md` into the Data Safety form; internal testing track; Sentry (needs account). **Housekeeping DONE 2026-07-06:** 36 legacy session artifacts moved to `archive/legacy-docs/` (gitignored, kept on disk); `*.log` ignored; `.env.example` + 2026-06-07 chat-archive notes committed; `eas.json` tracked.

**Task #53 progress (2026-06-14):**
- **Schema + RLS DONE, deployed to Supabase.** Created `households`, `household_members`, `household_invitations`; added `household_id`, `recipient_member_id`, `hidden_from uuid[]` to `packages`. RLS rewritten household-aware (members read shared feed minus `hidden_from`; adder OR owner edit/delete; backward-compat for null `household_id`). Seeded "The Giles Household" with Cliff as owner; backfilled existing packages. **Account gotcha:** Cliff signs into the app as `cgiles1998@yahoo.com` (auth id `e8496476-50e8-4add-bbf9-538f500ec54c`) — NOT `hicliff1998@yahoo.com` (`6f428bdf-...`, a second account that owns no packages). The household was first seeded to the wrong account and corrected via `HOUSEHOLD_FIX_OWNER.sql`. Use `cgiles1998@yahoo.com` for anything account-specific. Migration SQL: `HOUSEHOLD_SCHEMA_MIGRATION.sql`. Decisions locked: one household per user (MVP); `hidden_from` array not join table; member departure nulls `recipient_member_id` (ON DELETE SET NULL).
- **Backend layer DONE, deployed to Railway** (commit `5a8105a` on `on-the-way-backend`, verified live 2026-06-14). New `household.js` router (factory `createHouseholdRouter(supabase, auth)`): `GET/PATCH /api/household`, `POST /api/household/invite` (Brevo transactional email — `BREVO_API_KEY` env var, no-ops with logged accept link if unset), `GET /api/household/invite/:token` (unauth, token is the credential), `POST /api/household/accept` (auth; enforces email match + one-household-per-user), `PATCH/DELETE /api/household/members/:id`. `server.js` edits: `GET /api/packages` returns whole household feed minus gift-hidden; `PATCH /api/packages/:id` any member can edit + accepts `recipient_member_id`/`hidden_from`; `DELETE` adder-or-owner; webhook stamps `household_id`+`recipient_member_id`; signup auto-creates a household.
- **Invite codes DONE, deployed** (commit `41987c8`). Short human-friendly codes (no ambiguous chars) added to `household_invitations.invite_code` (column added via `HOUSEHOLD_INVITE_CODE.sql`). Accept by `{ code }` or `{ token }`. Graceful household replacement: when an invitee is the sole owner of their own auto-created household, their packages move into the joined household and the empty one is deleted. Email body + `invite.html` both show the code.
- **Mobile UI DONE, shipped via EAS** (update group `628949be-b39f-498c-af7c-a7c3b4d9211b`, preview branch, 2026-06-14) **and pushed to GitHub** (mobile commit `6681c5d`). `App.js`: household screen (Settings → Household — rename, member list w/ owner/pending badges, invite form, "Have an invite code?" join field, leave/remove), per-member filter chips above the active list (shown only with >1 member), "Who it's for" recipient chips + 🎁 gift-mode checkboxes on the detail screen. `docs/invite.html`: static landing page (mirrors `reset.html`) that fetches the invite by token and shows the code + instructions — **verified live on GitHub Pages** (returned 200 after Pages rebuild).
- **Email sending VERIFIED in production:** `BREVO_API_KEY` (v3 transactional) set on Railway 2026-06-14; a real invite email was received with the join code. IP-blocking left OFF in Brevo (Railway IPs are dynamic).
- **Accept flow design:** short code + in-app entry (no deep links, per the reset.html precedent). Email → invite.html shows code → invitee signs up with invited email → Settings → Household → enter code → joins.
- **Architecture note:** backend uses a separate `users` table (not just `auth.users`) for `tracking_email` lookups; service-role client bypasses RLS, so backend endpoints scope by membership in code (RLS is the backstop for any direct mobile Supabase writes).

**Open / queued items in suggested order:**

1. ~~Task #49 — EasyPost live-status refresh~~ **CLOSED 2026-07-08.** `EASYPOST_API_KEY` live on Railway; `POST /api/refresh-status` active (registers trackers, maps EasyPost statuses to app statuses, updates `status`+`estimated_delivery`, pushes household alerts on change; capped at 30 packages/call). Mobile pull-to-refresh calls it automatically. Pricing (locked 2026-06-07): pay-as-you-go ~$0.60–$0.90/month at Cliff's volume vs $11/mo subscriptions elsewhere. Fallbacks if terms ever change: 17TRACK ($0) or USPS Tracking 3.2 (if MSSC yields BCG creds).
2. ~~Task #53 follow-up — parser name-matching~~ **DONE 2026-07-06** (webhook matches greeting/"delivered to"/unique-mention patterns against member display names; assigns recipient when exactly one member matches). **Task #53 is now 100% complete.** Real-world multi-member testing still pending Cory joining.
3. ~~Push notifications~~ **LIVE + VERIFIED 2026-07-06.** Full pipeline delivering: device registration → `push_tokens` → household-wide Expo/FCM push on new package / status change / test button. The household-wide delivery alert ("notify whoever's home, not just the buyer") is a differentiator no competitor ships — and it's running in production.
4. **Task #52 — Pillar 2 (Address-based carrier auth).** The headline MVP differentiator. Requires USPS Informed Delivery + UPS My Choice + FedEx Delivery Manager API access, each with its own business-account approval cycle. Multi-week timeline. Starts after USPS BCG account exists.
5. **Visual polish** — anytime Cliff flags something.
6. **Pre-launch production readiness** — see checklist above (account deletion + icons/splash now done).
7. **V1 trigger** — when Pillars 1 + 2 ship, parser/tracking stable, internal-testing-track feedback positive, and production-readiness checklist clears, flip from beta to V1: implement subscription paywall, swap "(Beta)" suffix for V1 launch messaging.
8. **Architectural cleanup (low priority).** SwipeListView + SwipeablePackageCard's internal PanResponder are duplicative; either move hidden actions into SwipeListView's `renderHiddenItem` or drop SwipeListView for plain FlatList.

**Recently closed:** **Task #53 (Pillar 1 — Household accounts) shipped + verified in production 2026-06-14** — all four layers live (schema/RLS, backend, mobile, accept page), real invite email confirmed, only the optional parser name-matching remains (now item 2 above). AdSlot cleanup + (Beta) header suffix shipped 2026-06-05 (EAS update group `69e75a69-b772-4210-add5-15f9450edf36`, commit on `cg1980-cyber/on-the-way-mobile`). Task #48 (real AdMob) closed as won't-do 2026-06-05 per the "Free during beta" decision. `tracking_email` display verified correct 2026-06-07: app shows `cgiles1998.a940d0@onthewayapp.net` (Cliff's actual forwarding address) in provider instructions, not the generic placeholder. JWT cutover loose end is closed.

**⚠️ Incident 2026-07-07 (~7:21–7:33 PM, resolved):** adding `package-lock.json` to the backend repo (commit `f962420`) crashed the Railway deployment — total backend outage ~12 min. Locally the exact same dependency set started fine; the failure is in how Railway's builder handles a lockfile (likely `npm ci` + lockfile-version/Node mismatch on the build image). **Fix:** reverted the lockfile (`046144b`); service recovered on the next deploy. **Rules going forward:** (1) verify the `/` health endpoint after EVERY backend push — the outage went unnoticed because two pushes that day were not health-checked; (2) do NOT add a lockfile to the backend repo unless Railway's Node/npm versions are explicitly pinned and the deploy is verified immediately. Impact: carrier emails forwarded during the window were dropped (Cloudflare doesn't retry); statuses self-correct via later emails or EasyPost refresh.

**2026-07-08 polish:** EasyPost live-status confirmed working (key was mis-named `Easypost_API_Key` on Railway → renamed to `EASYPOST_API_KEY`). Added `delivered_at` column (real delivery date from EasyPost scan / delivery emails); Delivered cards show "DELIVERED + date" instead of ETA. Refresh scope: backend already excludes archived/deleted; mobile now only fires `/api/refresh-status` from the Active tab. Settings screen gained an "About & Legal" card (Privacy/Terms/Support links + version). EasyPost billing confirmed: one-time ~$0.02–0.03 per tracking number at first registration, refreshes are free.

**🔥 Incident 2026-07-09/10 (resolved) — signup session hijack.** Cory's signup didn't auto-join his invited household and showed "No household found." Investigation (live test signups with a diagnostic `household_setup` field + SQL forensics via browser) revealed the true root cause: **the backend's shared supabase-js client called `auth.signUp()`, which made the client ADOPT the new user's session** — silently degrading it from service_role to that user's permissions for every subsequent query until process restart. Explains: Cory's failed auto-join + missing invite banner; the 2026-07-08 "household disappeared" episode (backend impersonated Cory for ~an hour after his signup); phantom RLS violations in every test signup. Red herrings chased en route: legacy→new Supabase API-key migration (Railway `SUPABASE_SERVICE_KEY` now holds the new `sb_secret_...` key — a good change regardless), missing RLS policies (explicit `service_role_all` policies added to all 6 tables — good hardening regardless), BYPASSRLS attribute (was fine). **Fixes (backend `937ce67`):** signup now uses `supabase.auth.admin.createUser()` (touches no client session state) + client created with `persistSession:false, autoRefreshToken:false, detectSessionInUrl:false`. **Verified: `household_setup: created` on test signup, and the client stays service_role afterward.** Cory was manually linked to The Giles Household via SQL during the outage (member row + invite accepted) — he just needs to reopen the app. **Rule: NEVER call session-returning auth methods (signUp/signInWith*) on a server's shared service client.** **CONFIRMED FIXED by Cory 2026-07-10:** he force-closed/reopened and The Giles Household now shows up correctly on his device — real second-user validation, not just synthetic test signups. Codebase audited (grep for `auth.signUp|signInWith|signOut|refreshSession|setSession`) — no other call sites; all household CRUD (create/invite/accept/auto-join) is plain `.from(table)` operations with no auth calls, so this is a closed bug class, not Cory-specific. Confirmed safe for any future user signing up solo and inviting others (same code path).

**2026-07-22 follow-up #3 — rate-limit fix (backend `cc28920`):** Cliff hit "API error: 429" in the Tracking Inbox. Cause: `apiLimiter` keyed purely by IP at 100/15min — household members share home Wi-Fi (one IP = one shared bucket) and every app open fires 4–5 calls, so two phones testing together exhausted it. Fix: authenticated requests now bucket per bearer token (sha256-hashed, `tok:` prefix) at 300/15min per device; unauthenticated requests still bucket by IP. Structural fix for the app's core audience (multi-phone households), not just a number bump.

**2026-07-22 follow-up #2 — auto-forward + forward-to-choice (backend `02968db`, mobile `78997a5`, OTA `fd073775`):** (1) **Auto-forward:** every email received at a tracking address is automatically copied to the user's account email (marketing: registering carriers with our address never costs you their notifications — reassurance copy added at all 3 tracking-email spots in-app + privacy policy updated). Safeguards: skipped when the sender IS the user (breaks forwarding loops at hop one) and all outgoing copies carry an `X-OTW-Forwarded` header that the webhook drops on sight if a copy circles back (loop guard requires the raw_base64 worker — headers invisible in the legacy format). (2) **Manual forward to a chosen recipient:** `POST /api/emails/:id/forward` accepts optional `to` (validated, ≤254 chars); UI shows "↗ To my email" + "✉️ To another…" with inline recipient input; choice-recipient forwards are attributed to the sender's account email in the message body (spam accountability); endpoint remains auth-gated + rate-limited. Extracted shared `sendViaBrevo()` helper.

**2026-07-22 follow-up — real HTML email rendering (v1.2.0 REBUILD):** Cliff's screenshot showed the email view as "=20" quoted-printable soup (raw wire encoding, and the text part was actually HTML/CSS). Two-layer fix: (1) backend decodes quoted-printable in `GET /api/emails/:id` and the forward endpoint (`8724f10` — live, fixes text view even on old binaries); (2) mobile v1.2.0 renders `html_body` in a WebView like a real email client — `react-native-webview` added (native module → rebuild), JS disabled, links open in the device browser only, falls back to plain text; detects HTML hiding in the text part. app.json 1.1.0→1.2.0 (new runtime isolates OTA). Build `df871818`; `docs/download.html` updated to the v1.2.0 APK. Mobile `40d4e28`. **Cliff + Cory must install the v1.2.0 APK** (OTA updates for them stay pinned to 1.1.0's last bundle until they do).

**2026-07-22 enhancements (both OTA, no rebuild):** (1) **Tap-to-copy tracking email** — `CopyableEmail` component (RN core `Clipboard`, deprecated-but-present in SDK 54) on the Settings card, empty state, and carrier-instructions screen, with "✓ Copied" feedback. (2) **Tracking Inbox** — users can view + forward (to their own account email only — no arbitrary recipients, no spam surface) emails received at their tracking address. New `received_emails` table (`RECEIVED_EMAILS_SETUP.sql`, 30-day retention pruned by backend, user-private NOT household-shared so gift purchases can't leak, cascades on account deletion); webhook stores all matched emails incl. non-shipping (helps users see why something didn't become a package); endpoints `GET /api/emails`, `GET /api/emails/:id`, `POST /api/emails/:id/forward` (Brevo); mobile screens `inbox` + `emailDetail` via Settings → 📥 View Tracking Inbox. Privacy policy updated (30-day retention replaces "discarded"). Backend `7473e10`, mobile `e6b2076`, OTA group `63ac23aa`. **Cliff must run `RECEIVED_EMAILS_SETUP.sql`** — until then, inbox shows empty and email storage no-ops harmlessly.

**Rollback notes if anything regresses:**
- Junk-row archive is reversible: `UPDATE packages SET archived = false WHERE archived = true AND last_updated >= '2026-05-23'`.
- Mobile changes: revert the relevant commit in `cg1980-cyber/on-the-way-mobile` and republish a previous EAS update (`eas update --branch preview --republish --group <previous-group-id>`; group IDs in EAS dashboard). Pre-household mobile = the commit before `6681c5d`; pre-household EAS group is whatever preceded `628949be`.
- Backend changes: revert in `cg1980-cyber/on-the-way-backend`; Railway auto-redeploys on push. Pre-household backend = the commit before `5a8105a`.
- Household feature: the `GET /api/packages` change is backward-compatible (users with no household fall back to per-`user_id`), so simply having no `household_members` row for a user reverts them to single-user behavior without a code change. The new tables can be left in place harmlessly.

---

# Part 4 — Appendix

## Chat archive

Prior-chat transcripts and synthesized session notes live in `chat-archive/`. When in doubt about *why* a past decision was made and the rationale isn't in "Key decisions" above, check there before assuming.

- `2026-05-23_full_transcript.md` — complete chronological export of the "On The Way — package tracking app" chat (14,390 lines, 1,193 exchanges; covers JWT cutover → password reset page → Cloudflare/email → Railway revival → frontend dedup → editable detail screen → tap fix → AdSlot → Brevo + MSSC → marketing strategy + monetization → this PROJECT_STATE.md refactor). SMTP key redacted.
- `2026-05-23_session_notes.md` — distilled non-obvious reasoning from that chat (full ranked monetization menu, the three Pillar 3 conflicts broken down, Brevo/Gmail operational gotchas, exact MSSC ticket text, etc.). Easier to skim than the full transcript.

## Command cheatsheet

Run from `C:\Users\hicli\on-the-way` unless noted.

```
:: One-time setup (already done)
npm install -g eas-cli
eas login                 :: or: eas login --sso
eas init
eas env:push production --path .env

:: Daily loop — ship a JS/style tweak
eas update --branch preview --message "describe the change"

:: Build a fresh APK (only when native code or app.json changes)
eas build --profile preview --platform android

:: Inspect env vars
eas env:list production

:: Confirm logged in
eas whoami
```

## History snapshot

Short timeline of major milestones. Not exhaustive — for any specific decision-detail, search this file (it's all here in "Key decisions" or in the active section). For commit-level detail, the GitHub history on `on-the-way-mobile` and `on-the-way-backend` is the ground truth.

- **April 2026** — `note` field added to Supabase schema + mobile UI + backend PATCH. Initial card preview of note.
- **2026-05-18** — Backend JWT auth fixed (JWKS/ES256 cutover). Password reset page built and shipped via GitHub Pages. Railway revived after trial expired (upgraded to Hobby). Frontend dedup filter relaxed so packages without tracking numbers still appear.
- **2026-05-23** — Email parser overhaul (carrier detection + field-name fix + `isShipping` gate); 10 junk rows archived in Supabase. Detail screen made editable for "What it is" / "Who it came from" / "Reference Note"; deleted packages show restore-to-edit banner. SwipeablePackageCard tap-stealing PanResponder fixed; swipe-action layer moved behind cards. Cards now stack all populated fields visibly. Tracking numbers became carrier-aware hyperlinks (USPS/UPS/FedEx/DHL + 17track fallback). AdSlot placeholder shipped (later flagged as Pillar 3 conflict). Brevo + Gmail Send-as wired up for outbound from `support@onthewayapp.net`. USPS BCG online signup failed on identity verification; MSSC ticket sent from support@ for manual creation. Marketing angle content formalized into this doc as the strategic source of truth; three pillars locked in; monetization conversation landed on household subscription as the recommended primary model.
- **2026-06-05** — Monetization decision locked: "Free during beta" (Option D). No ads, no paywall, no monetization during beta era; subscription activates at V1 launch when Pillars 1+2 ship and production-readiness clears. AdMob ruled out permanently; task #48 (AdMob) closed as won't-do. AdSlot component + render placements + orphan styles removed from `App.js`; home-screen header changed from "On the Way" → "On the Way (Beta)"; shipped via `eas update --branch preview` (update group `69e75a69-b772-4210-add5-15f9450edf36`) and verified live on phone; source committed and pushed to `cg1980-cyber/on-the-way-mobile`. Full prior-chat transcript and synthesized session notes archived to `chat-archive/` so the project is fully self-contained. Task #53 (Pillar 1 household accounts) scope tiers discussed; MVP-aligned tier recommended pending Cliff's sleep-on-it decision. AfterShip free-tier details captured under task #49 as the MSSC fallback.
- **2026-07-06** — **Autonomous four-wave improvement run** (single session, Opus 4.8→Fable 5 review-then-execute). Wave 1 (OTA, group `f2861de0`): status pills/edges, humanized dates, arrival-day grouping, member chips + gift indicator, instant-open AsyncStorage cache, household promo, invite Join banner, delete-account UI. Wave 2 (Railway `417588a`): signup auto-join of pending invites, `DELETE /api/auth/account` with ownership handoff, webhook parser name-matching (closes Task #53 to 100%), push infra, `/api/refresh-status` EasyPost endpoint (Task #49 backend done — key pending). Wave 3 (mobile `f269f05`): brand icon/splash/notification assets generated from the HousePathLogo mark, app.json v1.1.0 + dark UI + expo-notifications plugin, push registration code, EAS build `de89c2fd` triggered. Wave 4: `PUSH_TOKENS_SETUP.sql` + this doc. Cliff steps pending: install v1.1.0 APK, run push SQL, Firebase FCM creds (+1 rebuild), EasyPost key. Sentry deferred (needs account).
- **2026-06-14** — **Task #53 (Pillar 1 — Household accounts) shipped end-to-end across one session.** All four layers live: (1) schema + RLS in Supabase (`households`, `household_members`, `household_invitations`, package columns `household_id`/`recipient_member_id`/`hidden_from`); (2) backend API on Railway (`household.js` router — household CRUD, invite by email via Brevo, code/token accept with solo-household replacement; `server.js` made household-aware for GET/PATCH/DELETE packages + webhook stamping + signup auto-creates a household); (3) mobile UI shipped via EAS update (household management screen, join-by-code, per-member filter chips, recipient assignment + gift mode); (4) `docs/invite.html` accept landing page. Backend commits `5a8105a` + `41987c8`; mobile commit `6681c5d`; EAS update group `628949be`. Verified in production: real invite email received (`BREVO_API_KEY` set on Railway), `invite.html` live on GitHub Pages. Remaining: multi-member testing by inviting Cory; parser name-matching is the one optional refinement (recipient currently defaults to the tracking-address owner). Account gotcha surfaced + fixed: Cliff's app account is `cgiles1998@yahoo.com`, not `hicliff1998@yahoo.com` (household first seeded to wrong account, corrected via `HOUSEHOLD_FIX_OWNER.sql`).
- **2026-06-07** — Task #53 scope locked at **Full version** (~15–30 focused hours / 2–3 weeks of evenings) — Cliff wants the polished version matching the marketing doc, not concept validation. `tracking_email` JWT-cutover loose end verified closed. **Task #49 went through a pivot today:** initial plan was AfterShip free tier; on signup Cliff hit a paywall — turns out AfterShip discontinued their free Tracking API in 2026 (now requires Essentials at ~$11/month). Researched alternatives (EasyPost, ShipEngine, 17TRACK, Shippo, TrackingMore, ShipAware, Karrio). **EasyPost wins** for pay-as-you-go model (~$1/month total at Cliff's volume vs. $11/mo subscription elsewhere). Cliff started EasyPost signup at the For Business path; paused mid-flow. MSSC phone call still on calendar for next week — if it yields BCG creds, USPS Tracking 3.2 remains a free-forever fallback option for USPS-only coverage, but EasyPost's all-carrier coverage at ~$1/month is likely better than swapping. Order of operations: complete EasyPost signup + wire-up next session, then schema + RLS design pass for #53.
