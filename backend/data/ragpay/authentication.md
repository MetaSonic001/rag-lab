---
title: Authentication and API keys
category: developer
---
# Authentication and API keys

RagPay uses HTTP Basic authentication: `key_id` as username and `key_secret` as password.

## Key types
- Test keys start with `rp_test_` and only touch test mode data.
- Live keys start with `rp_live_` and are available only after KYC approval.

## Authentication errors
- `401 AUTH_INVALID_KEY`: the `key_id` does not exist or you used a test key against live data (or the reverse). This is the most common integration error.
- `401 AUTH_SIGNATURE_MISMATCH`: wrong `key_secret`. Secrets are shown once; regenerate if lost.
- `403 AUTH_KEY_DISABLED`: the key was revoked or the account is suspended.
- `403 AUTH_IP_NOT_ALLOWED`: an IP allow-list is configured and your server's IP is not on it.

## Keep secrets server-side
Never ship `key_secret` in a mobile app or browser bundle. Call RagPay from your backend and expose only the order id to the client.

## Rotating keys
Generate a new key pair in Dashboard → API Keys. Old keys stay valid for 24 hours to allow a zero-downtime rollout.

