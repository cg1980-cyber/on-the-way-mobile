# Play Console Data Safety form — prepared answers

Copy-paste reference for when the Play Console developer account exists.
Answers reflect the app as of 2026-07-06 (beta: no ads, no analytics, no
monetization). Re-check before V1 if a subscription SDK gets added.

## Overview questions

| Question | Answer |
|---|---|
| Does your app collect or share any of the required user data types? | **Yes** (collects; does not "share" per Play's definition — all processors act as service providers) |
| Is all of the user data collected by your app encrypted in transit? | **Yes** (HTTPS/TLS everywhere) |
| Do you provide a way for users to request that their data is deleted? | **Yes** — in-app (Settings → Delete my account and data) and via https://cg1980-cyber.github.io/on-the-way-mobile/privacy.html#delete |

## Data types collected

### Personal info
- **Email address** — Collected. Required. Purpose: Account management. Not shared. Deletable.
- **Name** — Collected (household display names, e.g. "Cliff"). Required for household features. Purpose: App functionality. Not shared.
- **Address** — Collected only if the user enters it at signup (optional). Purpose: App functionality. Not shared.

### Messages
- **Emails** — Collected (shipping-notification emails the user actively forwards
  to their unique tracking address; parsed for package details, non-shipping
  emails discarded). Purpose: App functionality. Not shared.
  *Note: the app never accesses the user's inbox; ingestion is entirely
  user-initiated forwarding.*

### App activity / identifiers
- **Other user-generated content** — Collected (package nicknames, notes). Purpose: App functionality. Not shared.
- **Device or other IDs** — Collected (push notification token). Purpose: App functionality (delivery alerts). Not shared beyond the push transport (Expo → Firebase Cloud Messaging, acting as service providers). Deleted with account.

## Data types NOT collected (answer "No")

Location (precise or coarse), financial info, health & fitness, photos &
videos, audio, files & docs, calendar, contacts, browsing history, search
history, installed apps, diagnostics/crash logs (no Sentry yet — update this
answer if Sentry is added), advertising IDs.

## Security practices section

- Encrypted in transit: **Yes**
- Users can request deletion: **Yes**
- Committed to Play Families Policy: **No** (app is 13+, not child-directed)
- Independent security review: **No**

## Reminders when filling the real form

1. If Sentry ships before submission, add **Diagnostics → Crash logs** (collected, App functionality).
2. If Google Play Billing ships at V1, add **Financial info → Purchase history** (handled by Google, but declare per current policy).
3. Data Safety answers must match the privacy policy URL:
   https://cg1980-cyber.github.io/on-the-way-mobile/privacy.html
