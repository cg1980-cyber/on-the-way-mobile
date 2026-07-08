# WEBHOOK_SECRET rotation plan

The email-ingest webhook (`POST /webhook/email`) is protected by a shared
secret sent as the `X-Webhook-Secret` header. It lives in exactly two places,
and rotation means updating both:

| Where | What |
|---|---|
| Cloudflare Worker `on-the-way-email` | Sends the header on every forwarded email (Worker → Settings → Variables) |
| Railway `on-the-way-backend` | `WEBHOOK_SECRET` env var the server compares against |

## When to rotate

- Immediately if the secret may have been exposed (pasted in a chat, committed, logged).
- Otherwise once a year as hygiene.

## Steps (~5 minutes, brief ingest gap)

1. **Generate a new secret** (PowerShell):
   ```powershell
   -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
   ```
2. **Cloudflare first:** dash.cloudflare.com → Workers & Pages → `on-the-way-email`
   → Settings → Variables → update the secret value → Deploy.
3. **Railway immediately after:** service → Variables → update `WEBHOOK_SECRET`
   → auto-redeploys (~1 min).
4. **Verify:** forward any shipping email to the tracking address, then check
   Railway HTTP logs (`@path:/webhook`) for a 200. A 401 means the two values
   don't match — recheck for stray whitespace.

## Notes

- Between steps 2 and 3 (a minute or two), forwarded emails will be rejected
  with 401 and are **not retried** — rotate at a quiet time. Any package email
  lost in the window will be corrected by the next status email or an
  EasyPost refresh.
- The generic `/api/webhooks` endpoint uses HMAC signatures derived from the
  same `WEBHOOK_SECRET`; no separate rotation needed.
- Never reuse the old value; never put the secret in a file that gets
  committed.
