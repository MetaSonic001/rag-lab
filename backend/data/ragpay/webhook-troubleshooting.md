---
title: Webhook troubleshooting
category: developer
---
# Webhook troubleshooting

Use this checklist when webhooks are missing or your order state is wrong.

## Missing webhook events
1. Open Dashboard → Developers → Webhooks → Delivery log and find the event. If it shows `delivered`, RagPay did its job and the bug is in your handler.
2. If it shows `failed`, check the HTTP status your server returned. Anything other than 2xx, or a response slower than 5 seconds, counts as failure.
3. The endpoint URL must be public HTTPS. `localhost`, self-signed certificates and redirects (301/302) are not followed.
4. Confirm the event is actually subscribed: `payment.captured` is not enabled by default for accounts created before 2023.

## Signature mismatch (401 from your own handler)
Most common cause is verifying against a re-serialised JSON body. Use the raw body. A second cause is using the API key secret instead of the webhook secret.

## Replaying events
Failed events can be resent from the delivery log with **Resend**. Replays keep the same event id, so deduplicate on it.

## Order shows failed but customer was debited
Check whether `payment.captured` was delivered and processed. If it was never processed, fetch the payment via `GET /v1/payments/{id}`; if it is `captured`, mark the order paid and fulfil it.

