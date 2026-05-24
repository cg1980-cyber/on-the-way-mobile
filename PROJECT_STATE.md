# On the Way — Project Reference

_Last updated: 2026-05-23_

## How to use this document

This is the standing reference for the On the Way project — the single source of truth for what the app is, where it's going strategically, how it's built, what's been decided, and what's outstanding. Read it at the start of any chat about this project.

Use it both ways: when a question is about features, scope, marketing, positioning, MVP priorities, or competitive trade-offs, ground responses in the strategy section below. When a question is about code, deployment, or operations, the architecture and reference sections are the source of truth. If a request conflicts with the three pillars, flag it directly. If a decision in a chat changes or expands the strategy, update this document so it stays current.

**Keep this file fresh.** Append to "Key decisions" when a meaningful call is made. Update "Active work" at the end of a session. Add a line to "History snapshot" when a major milestone ships. Don't wait to be asked.

**Commits.** Cliff commits and pushes this file from `C:\Users\hicli\on-the-way`. The sandbox can edit but doesn't push.

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

**Recommended (decision pending — see Active work, task #51):**

- **Primary: household subscription / freemium.** Free tier covers a single user with limited features. Paid tier (~$20–40/year per household) unlocks household members, gift mode, anti-theft tools, longer history. Aligns with Pillar 1 (household-first) — pricing follows the same unit the product is built around. Mental model: Apple Family / Spotify Family.
- **Secondary: B2B landlord tier.** Property managers, apartment buildings, dorms, HOAs — anywhere multiple households share a delivery surface. Different product surface, higher price per door, parallel revenue stream, no consumer privacy compromise.
- **In reserve:** user-initiated affiliate (claims, insurance, hardware partners), hardware bundle partnerships (Ring/Eufy/Nest doorbells).
- **Off the table per Pillar 3:** display ads, behavioral targeting, data selling, tracked affiliate.

This recommendation supersedes the earlier plan ("small-format ad monetization") which conflicted with Pillar 3. Cliff has the call on whether to accept the recommendation or revise the strategy.

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
| OTA updates | EAS Update (preview branch) | Expo CDN |

**Note on the email-ingest pipeline.** It is the current way packages enter the system, but it's transitional. The Pillar 2 architecture (address-based carrier auth) replaces it as the primary mechanism. Keep email ingest as a complementary fallback for emails not covered by carrier auth (e.g. Amazon TBA codes); do not market it as the primary mechanism.

## Repos

- **Mobile:** `cg1980-cyber/on-the-way-mobile`. Local clone: `C:\Users\hicli\on-the-way`.
- **Backend:** `cg1980-cyber/on-the-way-backend`. Local clone: `C:\Users\hicli\on-the-way-backend` (currently one commit behind remote — `git pull` before any local edits).
- **Password-reset page:** GitHub Pages from the mobile repo's `/docs` folder → `https://cg1980-cyber.github.io/on-the-way-mobile/reset.html`.

## Key IDs and URLs

- **Expo account:** `@cgiles1980`
- **EAS project:** `@cgiles1980/on-the-way` (ID `7bc227c6-5c80-4a00-82ab-30b165c89344`)
- **Android package name:** `net.onthewayapp.app` (PERMANENT — cannot change after Play Store release)
- **Brand domain:** `onthewayapp.net` (Cloudflare DNS + Email Routing; Brevo verified as a sender)
- **Backend public URL:** `https://on-the-way-backend-production.up.railway.app` (port 8080). Railway project name in dashboard is `zesty-harmony` but service is still `on-the-way-backend`.
- **Supabase project URL:** `https://clqivishcuwlptoumdre.supabase.co`. Anon key + service-role key live in `.env` (local) and Railway env vars (deployed). Auth Site URL + Redirect URLs point at the GitHub Pages reset page.
- **Brevo SMTP** (outbound from `support@onthewayapp.net`): server `smtp-relay.brevo.com`, port `587`, login `ac572d001@smtp-brevo.com`. SMTP key (named "Gmail Send As" in Brevo, expires 2027-05-23) lives only in Cliff's Gmail Send-as config.

Secrets live in `.env` (local) and EAS env vars under the `production` environment. **Never commit `.env`.**

## Mobile app

### Files
- `App.js` — main app (auth, package list, detail screen, note UI, ad-slot placeholder).
- `app.json` — Expo config (name, slug, icons, env-var placeholders).
- `eas.json` — three build profiles: `development` (dev client APK), `preview` (no-dev-tools APK, current daily target), `production` (AAB for Play Store).
- `package.json` — Expo SDK 54, expo-dev-client, supabase-js, react-native-swipe-list-view, etc.
- `.env` — `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_BACKEND_URL`.

### Day-to-day workflow

1. Edit JS/styles on laptop in `C:\Users\hicli\on-the-way`.
2. `eas update --branch preview --message "what changed"` — bundles & uploads to Expo CDN (~1 min).
3. Force-close app on phone, reopen — auto-fetches the new bundle on launch.

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

### Key endpoints
- `POST /webhook/email` — secret-protected, ingests parsed shipping emails. Skips insert if parser returns `isShipping: false`.
- `POST /api/webhooks` — generic webhook.
- `GET /api/packages` — list user's packages (JWT auth).
- `PATCH /api/packages/:id` — update `nickname`, `archived`, `deleted`, `note`, `merchant`.
- `GET /api/auth/profile` — verify token, return user profile.

### Database schema (Supabase `packages` table)

Columns: `id`, `user_id`, `tracking_number`, `carrier`, `merchant`, `status`, `estimated_delivery`, `nickname`, `note`, `archived`, `deleted`, `last_updated`.

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

## Strategic conflicts to resolve

Items currently live or queued that don't match the three pillars. Resolve before continuing in that area.

1. **AdSlot placeholder is live + Task #48 (real AdMob) queued → hard conflict with Pillar 3 ("No ads, no data selling").** The placeholder banner ships today in `App.js` (`AdSlot` component, middle of Active list). The placeholder alone signals "ads coming soon" to current beta users, which undercuts the message before any real ad ships. Recommendation pending Cliff's decision: drop ads entirely, monetize via household subscription (primary) + B2B landlord tier (secondary). See task #51. If subscription wins, repurpose the AdSlot real estate for subscription-promo content ("Invite a household member to share your feed" / "Upgrade to track unlimited packages") instead of just deleting it.
2. **Task #49 (USPS Tracking 3.2 API) is enrichment, not Pillar 2.** Tracking 3.2 looks up status for already-known tracking numbers. Pillar 2 is USPS *Informed Delivery* + UPS *My Choice* + FedEx *Delivery Manager* — different products that pull packages by address. Task #49 is useful as live-status enrichment for known packages, but the headline differentiator is task #52.
3. **Current email-forwarding ingest model → soft conflict with Pillar 3 ("We never read your email").** Better than Route/AfterShip's inbox scraping (user actively forwards rather than us reading their inbox), but still email-based. Defensible today, fully resolved by Pillar 2 (address-based carrier auth) replacing email ingest entirely. Keep as a transitional / complementary input; do not market the "we never read your email" line in any public-facing copy until Pillar 2 lands.
4. **Cloud-first storage → soft conflict with Pillar 3 ("Local storage where possible").** Every package currently lives in Supabase; mobile pulls fresh on each open + pull-to-refresh, no local cache. Marketing line says "where possible" so it's not a lie, but the honest answer to "what's on your servers?" is "all of it, indefinitely." Long-term shift to local-first cache + cloud sync is a meaningful architectural change; not blocking today, but flag it before committing to the line in public copy.

## Production readiness checklist (before Play Store submit)

- [ ] **Privacy policy** hosted at a public URL. Must disclose: Supabase auth, email content processing, any analytics. Excludes ads if monetization decision lands as recommended.
- [ ] **Account deletion flow** in-app (Google requires this, not just "contact us"). User taps a button → backend deletes their packages + auth row.
- [ ] **Data deletion request URL** (Google Play Data Safety form requires it).
- [ ] **Data Safety form** filled out in Play Console (what data, why, encrypted in transit, etc.).
- [ ] **Terms of Service** hosted at a public URL.
- [ ] **App icons + splash screen** at proper resolutions (currently using defaults).
- [ ] **Play Console developer account** ($25 one-time).
- [ ] **Internal testing track** first (closed group of 10-20 testers) before production rollout.
- [ ] **Sentry or equivalent** for crash reporting.
- [ ] **Rate limiting** on backend webhook + API endpoints.
- [ ] **WEBHOOK_SECRET rotation plan** documented.
- [ ] **Monetization implementation** — implement chosen path from task #51 (subscription paywall + Stripe/Apple/Google billing integration, OR ads if strategy revises).
- [x] **Password reset link works end-to-end** (GitHub Pages reset page + Supabase URL config).
- [x] **support@onthewayapp.net inbound** (Cloudflare Email Routing → Gmail).
- [x] **support@onthewayapp.net outbound** (Brevo + Gmail Send-as, DKIM/DMARC verified).
- [x] **Backend email parser data quality** (carrier detection tightened, junk rows cleaned in Supabase).

## Active work

**Next action when work resumes:** decide task #51 (monetization), since it unblocks AdSlot cleanup and informs subscription-paywall UI design.

**Open / queued items in suggested order:**

1. **Task #51 — Monetization decision.** Drop ads vs. revise strategy. Recommended path on file: household subscription + B2B landlord, no ads.
2. **Task #53 — Pillar 1 (Household accounts).** Multi-member, shared feed, per-person filtering, gift mode. No external dependencies — can start anytime. Large schema/auth/UI change.
3. **Task #49 — Live tracking status refresh.** Blocked on USPS MSSC reply (Mon 2026-05-25 at earliest). When BCG creds arrive: subscribe Tracking 3.2 on https://developer.usps.com, paste client_id + client_secret, we wire it in ~30 min. Fallback if MSSC stalls: AfterShip free tier (100 trackings/month, all carriers).
4. **Task #52 — Pillar 2 (Address-based carrier auth).** The headline MVP differentiator. Requires USPS Informed Delivery + UPS My Choice + FedEx Delivery Manager API access, each with its own business-account approval cycle. Multi-week timeline. Starts after USPS BCG account exists.
5. **Task #48 — Real AdMob.** Likely closes as "won't do" depending on #51.
6. **Visual polish** — anytime Cliff flags something.
7. **Pre-launch production readiness** — see checklist above.
8. **Architectural cleanup (low priority).** SwipeListView + SwipeablePackageCard's internal PanResponder are duplicative; either move hidden actions into SwipeListView's `renderHiddenItem` or drop SwipeListView for plain FlatList.

**Loose end worth a 30-second check next time the app is open:** the in-app provider instructions should now display Cliff's actual tracking email (`cgiles1998.a940d0@onthewayapp.net`) instead of the generic `packages@onthewayapp.net`. The fix was conditional on the JWT cutover landing (which it did on 2026-05-18), but end-to-end verification was never explicitly confirmed.

**Rollback notes if anything regresses:**
- Junk-row archive is reversible: `UPDATE packages SET archived = false WHERE archived = true AND last_updated >= '2026-05-23'`.
- Mobile changes: revert the relevant commit in `cg1980-cyber/on-the-way-mobile` and republish a previous EAS update (`eas update --branch preview --republish --group <previous-group-id>`; group IDs in EAS dashboard).
- Backend changes: revert in `cg1980-cyber/on-the-way-backend`; Railway auto-redeploys on push.

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
