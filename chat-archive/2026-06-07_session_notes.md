# Session notes — 2026-06-07

_Companion to PROJECT_STATE.md. Captures the non-obvious reasoning and the live-tracking-API research that wouldn't fit cleanly in PROJECT_STATE.md's summary form._

## Session arc

1. **Resumed work after 2026-06-05 sleep break.** Cliff said "proceed."
2. **Re-orientation Q&A.** Asked three clarifying questions via AskUserQuestion: task #53 scope tier, MSSC reply status, `tracking_email` verification. Cliff answered: Full version for #53, MSSC came back wanting a phone call (taking it next week), `tracking_email` shows correctly.
3. **Cory misgendering correction.** I referred to Cory as Cliff's wife in a task #53 user-facing example. Cliff corrected: Cory is his husband. Saved memory file `cliff_household.md` + indexed in `MEMORY.md` so this doesn't recur in future sessions.
4. **Task #49 pivot — AfterShip free tier no longer exists.** Cliff started AfterShip signup, hit the "Upgrade and unlock" paywall on the Tracking API permission row. Web-searched current pricing — AfterShip discontinued their free Tracking API in 2026, now requires Essentials at ~$11/month minimum. Pivoted away.
5. **Research pass on alternatives.** Searched EasyPost, ShipEngine, 17TRACK, and general multi-carrier landscape. Distilled into a ranked recommendation.
6. **Cliff picked EasyPost.** Started signup at easypost.com → account setup page → selected "For Business" path. Paused before completing the business details form.

## 1. Live-tracking API research — the full landscape evaluated 2026-06-07

For future reference, the full set of options I evaluated and why each landed where it did:

### Picked

**EasyPost** — pay-as-you-go. $0.02 per non-USPS tracker registered, $0.03 per USPS tracker. One-time charge per tracking number, not per status check. Status updates after registration flow via webhook for free. Free 120 API calls/month tier covers all tracker-creation calls. **At Cliff's volume (~20–30 packages/month): ~$0.60–$0.90/month total.** No subscription, no monthly minimum. Honest unit pricing that scales naturally with usage. Mature ecosystem, well-documented Node.js SDK, used by many indie devs.

### Strictly-$0 fallback if EasyPost ever pivots

**17TRACK** — 100 free tracking quotas/month, refreshes monthly. 3,300+ carriers. **Catch:** beyond 100/month requires a *12-month prepaid* plan (no month-to-month at the paid tier). Fine at Cliff's normal volume but the prepaid wall is annoying for any spike or future growth.

### USPS-only free option (depends on MSSC outcome)

**USPS Tracking 3.2** — free forever for low-volume use. Blocked on USPS BCG account, which is blocked on Cliff's phone call with MSSC next week. Only covers USPS. Inferior to EasyPost on coverage; equivalent only if non-USPS carriers don't matter. Likely not worth the rework if EasyPost is already wired.

### Ruled out

- **AfterShip** — Free Tracking API discontinued in 2026. Essentials plan ($11/month) covers 100 shipments. Same price point as TrackingMore, no advantage over EasyPost's pay-as-you-go.
- **TrackingMore** — Free tier exists but Basic at $11/month for real usage. Same price point as AfterShip. No reason to pick over EasyPost.
- **ShipEngine** (rebranded ShipStation API late 2025) — Tracking is tied to label generation on the free plan. Since On the Way doesn't generate labels, we'd hit overage fees fast. Wrong product fit.
- **Shippo** — 30 labels/month free, but it's a label-focused product. Tracking is secondary. Wrong fit for tracking-only use case.
- **ShipAware** — 60 shipments/month free, $9/month for 600. Less mature ecosystem than EasyPost or AfterShip.
- **Karrio** — Open-source self-hosted. Genuinely free of subscription cost, but you'd be running the infrastructure on top of Railway. Engineering overhead far exceeds the ~$1/month EasyPost charges. Not worth it for a one-person beta.

### Why pay-per-tracker beats subscription at this scale

Subscription plans assume steady volume close to the tier ceiling. For a beta with ~30 packages/month, a $11/month subscription means $11/30 packages ≈ $0.37 per package. EasyPost's $0.02–$0.03 per tracker is 10–15× cheaper at this scale. The subscription model is only competitive once you're regularly above ~400 packages/month — far beyond Cliff's individual-household usage.

## 2. EasyPost signup — exact business form recommendations

Captured for resume next session:

- **Business name:** `On the Way`
- **Business type:** Sole Proprietor (no LLC filed)
- **EIN:** Skip if optional. If forced, blank field or SSN — EasyPost stores it for IRS 1099-K reporting if ever crossing threshold; tracking-only usage won't.
- **Business address:** Real address (compliance requirement).
- **Website:** `https://onthewayapp.net`
- **Phone:** Real number.
- **Industry / use case:** "Software" or "Mobile App" dropdown. "Package tracking app for households" free-text.
- **Monthly shipment volume:** Lowest bracket ("Less than 100" typically).
- **Credit card:** Should NOT be required for pay-as-you-go tier. If forced, **pause and ask** — wandered into a paid-plan flow.

Why Business not Personal: consistency with Brevo + Cloudflare + support@onthewayapp.net all registered to "On the Way" brand. Personal-tier accounts sometimes hit limits or trigger reviews for high API activity. Business pathway is the honest representation of what this is.

## 3. Backend wire-up plan (queued, ~30 min after API key arrives)

When Cliff pastes the EasyPost Production API key, the backend changes:

1. Add `EASYPOST_API_KEY` to Railway env vars.
2. Install `@easypost/api` npm package in `on-the-way-backend`.
3. Add new endpoint `POST /api/refresh-status`:
   - Loop active packages from Supabase (`archived = false AND deleted = false AND tracking_number IS NOT NULL`)
   - For each, check if it already has an `easypost_tracker_id` column; if not, create a Tracker via EasyPost API and persist the ID
   - Fetch latest tracker status from EasyPost
   - Update `status` (mapped from EasyPost's status enum) and `estimated_delivery` columns
   - Return the updated package list to the mobile client
4. Schema change: add `easypost_tracker_id` text column to packages table for caching the EasyPost tracker reference.
5. Mobile change: point pull-to-refresh handler at `/api/refresh-status` instead of just `/api/packages` (or have it call both in sequence).
6. Optionally: set up an EasyPost webhook endpoint for push-based status updates (more efficient than polling) — defer to V1 polish if push isn't needed for beta.

## 4. The Cory correction — saved to memory

I assumed Cory was Cliff's wife from the first name. Cliff corrected: Cory is his husband. Saved as a user memory at `[memory dir]/cliff_household.md` with index entry in `MEMORY.md`, so future sessions will know. The rule: don't infer relationship type or gender from names; use he/him for Cory; ask if unsure for any future household members.

## 5. Loose ends carried forward

- **EasyPost signup** — Cliff paused at the For Business / Personal Use chooser screen, selecting Business. Needs to complete the business-details form and grab the Production API key.
- **MSSC phone call** — Cliff scheduled for next week. If it yields USPS BCG creds, USPS Tracking 3.2 becomes a free-forever fallback (USPS-only) — but unlikely to displace EasyPost given coverage advantage.
- **Task #53 schema + RLS design** — load-bearing first step of the household-accounts build, queued for after #49 ships.
