# Session notes — 2026-05-23 ("On The Way — package tracking app")

_Companion to `2026-05-23_full_transcript.md` (the complete chronological chat export, 14,390 lines, 1,193 user/assistant exchanges, covering the entire arc from the opening JWT_SECRET troubleshooting through the final PROJECT_STATE.md refactor and project handoff). PROJECT_STATE.md is the working source of truth; the full transcript is the audit trail; this file is the middle layer — distilled non-obvious reasoning and side details that PROJECT_STATE.md's summary form deliberately leaves out, kept here so you don't have to re-skim 14k lines to find them._

## 1. The full monetization conversation

PROJECT_STATE.md records the recommendation (household subscription primary, B2B landlord secondary, affiliate + hardware bundles in reserve, ads off the table). The full ranked menu from the chat:

**Tier 1 — Cleanest (keep Pillar #3 fully intact)**

1. **Household subscription / freemium.** Free tier = single user, limited features. Paid tier ~$20–40/year per household unlocks members, gift mode, anti-theft tools, longer history. Aligns with Pillar #1; pricing follows the same unit the product is built around. Mental model: Apple Family / Spotify Family.
2. **One-time / lifetime purchase.** Lower lifetime revenue per user but better conversion, fits indie/privacy branding. Some users prefer this strongly.
3. **B2B / landlord tier.** Property managers, apartment buildings, dorms, HOAs. Different product surface, much higher price point per door, parallel revenue stream, doesn't touch consumer privacy positioning.

**Tier 2 — Decent (preserves Pillar #3 if implemented carefully)**

4. **User-initiated affiliate.** Commission on actions the user is already going to take — missing-package claims, shipping insurance, doorbell upgrade. Discipline: never behaviorally target, always show the same offer to everyone in the same situation, always disclose. Then it's a referral fee, not data selling.
5. **Hardware bundles.** Partnership with smart doorbell company (Ring / Eufy / Nest) — buy through the app, get a year of premium. Adjacent product synergy with the porch-to-person handoff feature.

**Tier 3 — Risky (close enough to ads to undercut the message)**

6. **Sponsored partner placements.** E.g. "Featured Partner: Chewy" tile in pet supply category. Even with disclosure, lives close enough to ads that a careful user could call it a violation. Avoid unless subscription proves it doesn't scale.

**Tier 4 — Off the table per Pillar #3**

7. Display ads (AdMob and similar).
8. Behavioral targeting / data selling.
9. Affiliate that requires tracking user behavior to optimize recommendations.

**Why subscription is the recommendation, not the alternatives.** It's the only option that reinforces *both* Pillar #1 (household-first) and Pillar #3 (privacy-first) simultaneously. The product strategy and the business model stop fighting each other. Everything else either weakens privacy positioning (affiliate, sponsored placements, ads) or is structurally weaker as primary revenue (lifetime purchase, B2B alone).

## 2. The three Pillar 3 conflicts (only the first is in PROJECT_STATE.md)

The doc currently lists only the ads conflict in its "Strategic conflicts" section. The chat distinguished hard vs. soft:

- **Hard — "No ads, no data selling."** Placeholder AdSlot is live in `App.js` middle of Active list with "SPONSORED" amber styling. Task #48 queues real AdMob via `react-native-google-mobile-ads`. Both directly contradict the proof point. The *placeholder* alone signals to a current beta user "ads are coming," which undercuts the message before any real ad ships. **Most urgent because it's the only conflict currently visible to the user.**
- **Soft — "We never read your email."** User actively forwards to `*.onthewayapp.net` — not OAuth inbox scraping like Route/AfterShip. Strict claim "we never access your inbox" is honest, but a careful prospect could push back with "you read my forwarded emails." Defensible today, fully resolved by Pillar #2 (address-based carrier auth) replacing email ingest entirely.
- **Soft — "Local storage where possible."** Everything currently lives in Supabase; mobile pulls fresh on each open + pull-to-refresh, no local cache. Effectively cloud-first. Marketing line says "where possible" so it's not a lie, but if a privacy-conscious user pokes ("what's on your servers?"), the honest answer is "all of it, indefinitely." Long-term architectural shift to local-first cache + cloud sync; not blocking today.

**How to apply:** the two soft conflicts don't need immediate action but they shape the architectural roadmap. If we ever launch with messaging that leans hard on the "we never read your email" line, do it after Pillar #2 ingest replaces email forwarding. Local-first cache is a longer-tail bet; flag it as a meaningful architectural shift before committing to the marketing line in any public-facing copy.

## 3. The AdSlot real-estate replacement idea

If task #51 lands as "drop ads, do subscription": the current AdSlot rendering position in the Active list is real estate that doesn't have to go to waste. Repurpose it for subscription-promotion content like:

- "Invite a household member to share your feed" (drives Pillar #1 + activation)
- "Upgrade to track unlimited packages" (drives subscription conversion once paid tier exists)

That's monetization-aligned content, not advertising. Mentioned in chat as the natural follow-on to closing task #48 — not yet a task itself.

## 4. Pillar #2 distinction the chat made sharper than PROJECT_STATE.md

PROJECT_STATE.md notes that USPS Tracking 3.2 (task #49) is enrichment, not Pillar #2. The chat had a tighter explanation of why:

- **Tracking 3.2** = status lookup for tracking numbers you already have. Useful as live-status enrichment for known packages.
- **USPS Informed Delivery** (the actual Pillar #2 product on the USPS side) returns scans of mail addressed to your physical address *regardless of whether you have a tracking number*. That's the mechanism that catches "the package you didn't know about" — the headline differentiator.
- Equivalents on the other carriers: UPS My Choice, FedEx Delivery Manager.

This matters for prioritization: when MSSC replies with BCG creds, the question of whether to subscribe to Tracking 3.2 OR pursue Informed Delivery registration is the next branch. They're different USPS API products with different approval processes. Tracking 3.2 likely unlocks faster; Informed Delivery is the real Pillar #2 prize.

## 5. Brevo / SMTP / Gmail Send-as operational gotchas

Things that came up during the Brevo configuration that are worth remembering for any future email-infra work:

- **DKIM CNAMEs must be DNS-only (not Cloudflare proxied).** Cloudflare's UI will warn "Proxying is required" on `brevo1._domainkey` and `brevo2._domainkey` — ignore it. Mail authentication doesn't tolerate the proxy layer.
- **Brevo SMTP keys are shown exactly once.** Modal pops up at generation, then the key is masked forever. Capture immediately. If missed, delete and regenerate.
- **Brevo admin UI fights browser automation.** Generating the SMTP key via Claude in Chrome failed because the tab froze; ended up doing it manually in Cliff's regular Chrome window. Worth assuming the same for any future Brevo key rotation.
- **Gmail "Add another email address" opens a popup outside the Chrome extension's tab group.** Can't be driven by Claude in Chrome — has to be done manually. The data to type in is straightforward (server, port, username, key, TLS on, "Treat as alias" UNCHECKED) but the click sequence has to be human.
- **DKIM/SPF alignment sanity check** after wiring Send-as: send a test message from `support@…` to your own Gmail, expand sender details, look for `signed-by: onthewayapp.net` (DKIM passes) and `mailed-by: smtp-relay.brevo.com`. If "via brevo.com" or "via gmail.com" appears in the From line, alignment is off.

## 6. MSSC ticket — exact text sent

For traceability if MSSC follow-up needed:

> **From:** `support@onthewayapp.net` (via Brevo Send-as)
> **To:** `mssc@usps.gov`
> **Subject:** `USPS.com Business Account Creation Help`
>
> Hello,
>
> I attempted to create a USPS.com Business Account online at https://reg.usps.com but the process failed at the identity verification step. Per the on-screen instructions, I'm reaching out to MSSC to request manual account creation.
>
> Please use the following information to create the account:
>
> - **Business name:** On The Way
> - **Business address:** [Cliff's address]
> - **Email:** support@onthewayapp.net
> - **Phone:** [Cliff's phone]
>
> Once the account is created, I'd like to register it with the USPS APIs developer portal in order to use the Tracking 3.2 API for a package-tracking mobile application I'm building.
>
> Thank you for your help.
>
> Best,
> Cliff Giles

MSSC closed on weekends. Earliest reply expected Monday 2026-05-25. Fallback if they stall: AfterShip free tier (100 trackings/month, all carriers) — Cliff signs up, hands over API key, ~30 min wire-in.

## 7. Backend repo state — operational note

Local `on-the-way-backend` clone is one commit behind GitHub. The missing commit is `e085e06` (backend `PATCH /api/packages/:id` accepts `merchant`, made via GitHub web editor mid-session). Before any local backend work, `git pull` first or local edits won't push cleanly. Already noted in PROJECT_STATE.md but worth restating.

## 8. Cowork project framing — why PROJECT_STATE.md is what it is

The doc was iterated twice in the prior session:

1. First it was a session-recovery aid — written assuming a context-blown chat needs to re-orient itself. Lots of "read this first" framing, long session log.
2. Then refactored for standing project context — present-tense "Active work," "History snapshot" replaced the session log, strategy moved to the front. This is the version that survives.
3. Then merged with the marketing angle content so it stands fully on its own as a single project-level reference.

**Why this matters going forward:** PROJECT_STATE.md is the file to attach to any new Cowork project / chat for this app. The standalone `On_the_Way_Marketing_Angle.docx` is now redundant with Part 1 of PROJECT_STATE.md, but is being kept as a polished standalone artifact for sharing with investors/advisors/collaborators who'd prefer a Word doc over a markdown reference. If you ever edit one, edit both — they're meant to stay in sync.

## 9. Session limit observed

Anthropic session limit hit once during the prior chat (reset 12:50am America/Chicago). The marketing-strategy upload prompt got re-sent three times by Cliff trying to get through it. Worth knowing for any future long planning session — if hitting a wall mid-flow, the right move is to wait for reset, not to retry repeatedly.

## 10. Loose ends from earlier (older) session

A separate older Cowork session ("Mobile app development capability") covered the JWT_SECRET / Railway / Supabase auth troubleshooting before the JWKS/ES256 cutover. PROJECT_STATE.md captures that the cutover landed on 2026-05-18, so the auth architecture outcome is fine. One loose thread from that session that wasn't explicitly confirmed:

- **`tracking_email` display in provider instructions** — the in-app provider instructions were showing the generic `packages@onthewayapp.net` instead of Cliff's actual tracking email `cgiles1998.a940d0@onthewayapp.net`. Fix was conditional on the JWT issue being resolved. JWT got fixed (per PROJECT_STATE.md history snapshot). The end-to-end verification that the email now displays correctly in the app was never explicitly confirmed in either session. **Worth a 30-second check the next time the app is open.**
