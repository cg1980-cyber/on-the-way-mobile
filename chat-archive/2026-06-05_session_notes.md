# Session notes — 2026-06-05 (resumed "On The Way" work, post-archive)

_First working session after PROJECT_STATE.md became the standing project context and the 2026-05-23 chat got archived. Notes capture the substantive decisions and side conversations so future sessions don't need to reconstruct them._

## Session arc

1. **Re-orientation pass.** Re-read PROJECT_STATE.md; confirmed the chat-archive folder structure (full transcript + session notes + stub).
2. **Monetization decision.** Cliff pushed back on the household-subscription recommendation, proposing "ads now, premium removes them later, without calling much attention to it." Pushed back honestly — flagged that this materially abandons Pillar 3 rather than softening it, walked through why AdMob is behavioral targeting (not just visual ads), why "quietly add ads" doesn't survive contact with users, and why "premium removes ads" implies ads are the baseline. Offered four Pillar-3-compatible alternatives that solve the underlying concern (don't charge for an unfinished product). Cliff picked **Option D — "Free during beta."**
3. **AdSlot cleanup shipped.** Removed `AdSlot` component, both render placements, ad-injection IIFE in SwipeListView data prop, `if (item.__ad)` branch in renderItem, and four orphan styles from `App.js`. Changed home-screen header from "On the Way" → "On the Way (Beta)" (Cliff picked option 2 from three BETA-indicator choices). Shipped via single `eas update --branch preview`, verified live on phone, committed + pushed.
4. **Roadmap planning.** Walked through task #53 scope tiers and AfterShip details so the next session can hit the ground running.

## 1. Monetization — why Option D won

Cliff's instinct ("don't charge users for an unfinished product") is sound and was treated as the load-bearing concern. The recommendation pushback wasn't about ignoring it — it was about not solving the timing problem by burning the durable advantage.

**Why I refused to soft-pedal the AdMob path:**

- **AdMob is behavioral targeting, not just banners.** It collects the device Advertising ID, usage signals, and feeds them into Google's ad ecosystem. That's the exact mechanic Pillar 3 explicitly rules out ("No ads, **no data selling**"). The data flow is the issue, not just the visual presence.
- **"Without calling much attention to it" doesn't survive contact.** Beta users see the banner immediately. Reviewers mention it. Privacy-first positioning is burned the moment the first banner ships. Route/AfterShip can copy any technical feature but can't uninstall their ad-supported business model — that's where the durable moat is.
- **"Premium removes ads" implies ads are the baseline.** Brand position becomes "free ad-supported app" not "privacy-first app." Removing ads later feels like a takeaway, not an upgrade. Conversion math gets ugly.

**The four Pillar-3-compatible alternatives I presented:**

- **A — Free, no monetization, during proving phase.** Zero ads, zero paywall while stabilizing; launch subscription at a meaningful milestone.
- **B — Free + lifetime / one-time purchase.** No subscription anxiety; user pays once.
- **C — Free tier + paid tier with no time pressure.** Hard feature limits on free; user decides when to pay.
- **D — Explicit "Free during beta" framing** (chosen). Label current era beta, communicate openly that subscription comes at V1, beta lasts as long as needed.

Option D *strengthens* Pillar 3 rather than just preserving it — "we believe in this enough to invest before charging you" is a privacy-first brand story. V1 trigger is a quality bar (Pillars 1+2 shipped, parser/tracking stable, internal testing positive, production-readiness clear), not a calendar.

## 2. AdSlot cleanup — exact changes to `App.js`

For future-me trying to reconstruct what was removed:

- **Component definition** — `AdSlot` function and its preceding 5-line comment block (~lines 192–209 pre-edit). Comment described it as a placeholder to be swapped for `<BannerAd />` from `react-native-google-mobile-ads` when AdMob was wired — that whole intent is now off the roadmap.
- **Empty-state placement** — `<AdSlot />` rendered at the top of `styles.emptyContent`, above the package icon, with a `{/* Ad slot — top of the empty state */}` comment. Removed.
- **Active-list injection** — the `data` prop of `SwipeListView` was an IIFE that inserted a sentinel `{ id: '__ad_active__', __ad: true }` at the midpoint of the active packages array; `renderItem` had an `if (item.__ad) return <AdSlot />` branch. Both removed; `data` is now just `activePackages`.
- **Orphan styles** — `adSlot`, `adSlotLabel`, `adSlotTitle`, `adSlotSubtitle` (~5 lines in the StyleSheet block). Removed.
- **Header title** — `<Text style={styles.headerLogoText}>On the Way</Text>` (in the home-screen header `View`, line 1084 pre-edit) → `<Text style={styles.headerLogoText}>On the Way (Beta)</Text>`. Auth-screen `logoText` at line 840 was deliberately left as "On the Way" — the beta framing applies to in-app usage, not the brand mark on the login screen.

**EAS update reference for rollback:** group `69e75a69-b772-4210-add5-15f9450edf36`, Android update `019e9b2e-8beb-7ca3-a06e-3b1cf14e5957`, iOS update `019e9b2e-8beb-7f7c-b503-cc56315bf6a9`. Rollback via `eas update --branch preview --republish --group <previous-group-id>` if needed.

## 3. Task #53 — three scope tiers and what's recommended

Already in PROJECT_STATE.md under task #53, but the reasoning behind the recommendation:

- **Why not minimum viable?** It validates the concept but misses the marketing promise. "We tracked it as a household" without per-person filtering or gift mode doesn't deliver what Pillar 1 actually pitches.
- **Why not full version?** Email invitations + parser smart-routing + member roles + departure logic add weeks of edge-case work for marginal user value during beta. Better to ship MVP-aligned, learn from real households using it, then layer those in if needed.
- **Why MVP-aligned?** Delivers the marketing promise (multi-member, shared feed, per-person filter chips, gift mode), uses a 6-character invite code instead of email invites (no infra needed), defers fancy parser routing to post-V1. ~8–12 focused hours / 1–2 weeks of evenings is realistic for Cliff's pace.

**Load-bearing decision to do FIRST in the next session.** Schema design + RLS policy rewrites in Supabase. The rule shift from "users see only their packages" to "members see their household's packages" is the load-bearing piece — easy to get wrong, painful to fix once data has flowed through it. Sketch the schema and the RLS together before any code lands.

## 4. AfterShip — why it's the MSSC fallback of choice

Already captured under task #49 in PROJECT_STATE.md. Key reasoning:

- **Carrier coverage.** 700+ carriers in one API call vs. wiring USPS / UPS / FedEx separately. One MSSC dependency replaced by one signup.
- **Free-tier quota mechanics.** 100 *new* tracking numbers per month, not 100 status checks. Once registered, a tracking number flows updates automatically until delivery. For a single household's ~20–30 packages/month, plenty.
- **Pillar 3 cleanness.** AfterShip's consumer app does email scraping; their API product does not. We send tracking numbers we already have, they return status. No data flow contradicts "no data selling." Important to note this distinction explicitly because the brand carries baggage.
- **Trade-off.** Tracking 3.2 is free indefinitely (USPS-native); AfterShip caps at 100/month free and gets expensive at scale. So if MSSC ever replies, we prefer Tracking 3.2 for USPS + same approach for UPS/FedEx, and use AfterShip only if MSSC stalls indefinitely.

**Alternatives if AfterShip ever outgrows or pricing shifts:** ShipEngine (~250/mo free), EasyPost (basic tier), 17track (different model — Chinese-focused multi-carrier, free tier with own limits). Default remains AfterShip.

## 5. Cloud-vs-local workflow clarification

Cliff asked mid-session "didn't we move all of this coding into the cloud or am I mistaken?" The honest answer: mostly yes, with one nuance worth keeping in PROJECT_STATE.md (now folded into the Day-to-day workflow section in Part 2):

- **Runtime is 100% cloud-hosted.** GitHub (source SoT), Railway (backend), Supabase (DB + auth), Expo CDN (mobile bundle), Cloudflare (email + DNS), Brevo (outbound SMTP), GitHub Pages (password reset).
- **Mobile editing is local-first.** App.js is too large for the GitHub web editor to be ergonomic. We edit in `C:\Users\hicli\on-the-way`, ship via `eas update`, then commit + push so source SoT stays in sync.
- **Backend editing is cloud-first.** Direct via GitHub's web editor; Railway auto-redeploys on push. Local clone at `C:\Users\hicli\on-the-way-backend` exists but is currently behind remote — only matters if doing local backend work.

This came up because Cliff was about to forget which workflow goes with which repo. Worth flagging in PROJECT_STATE.md so it's not relitigated next time.

## 6. Computer-use tooling limit observed

When Cliff approved the "clipboard-pipe" path for getting the EAS update command into his terminal, the request got blocked by a guardrail: Terminal is tier "click" (clickable but not typeable), and the system refuses to write to clipboard when only a tier-click app is frontmost (it can't be pasted via UI clicks into Terminal's input). Workaround would have been to open a tier-full app like Notepad first, write clipboard there, then bring Terminal forward — Cliff said stop and just took commands pasted into chat.

**Implication for future sessions:** the chat-paste path is the cleaner default for Cliff's Windows + Terminal setup. Don't try the clipboard-pipe via computer-use unless the workflow benefits enough to justify the Notepad-detour.

## 7. Loose ends for next session

- **`tracking_email` 30-second check.** Still outstanding from before. Open the app, look at provider instructions, confirm it shows `cgiles1998.a940d0@onthewayapp.net` (not the generic `packages@onthewayapp.net`).
- **MSSC reply status.** Check `support@onthewayapp.net` for a USPS Marketing & Services Support Center reply. Ticket sent 2026-05-23; today is 2026-06-05 (13 days). If reply landed with BCG creds, slot task #49 (Tracking 3.2 wire-up) ahead of #53.
- **Task #53 scope choice.** Cliff is sleeping on it. Recommendation: MVP-aligned tier.
- **Schema + RLS design.** Once tier is picked, design schema + RLS before any code lands. This is the load-bearing decision.
