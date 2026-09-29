---
title: Webhooks
category: developer
---
# Webhooks

Webhooks are HTTP POST callbacks RagPay sends to your server when something changes. They are the reliable way to learn about payment outcomes because the customer's browser may never return to your site.

## Events
- `payment.authorized`
- `payment.captured`: sent when a payment is captured and the order becomes paid.
- `payment.failed`
- `refund.processed`, `refund.failed`
- `settlement.processed`
- `dispute.created`, `dispute.won`, `dispute.lost`

## payment.captured
Payload contains `event`, `payload.payment.entity` (with `id`, `order_id`, `amount`, `status`) and `created_at`. Use `order_id` to mark your order as paid. Make the handler idempotent because the same event can be delivered more than once.

## Signature verification
Every request has an `X-RagPay-Signature` header: an HMAC-SHA256 of the raw request body using your webhook secret. Verify it on the raw bytes before parsing JSON; a parsed-and-reserialised body will not match.

## Delivery and retries
Your endpoint must return HTTP 2xx within 5 seconds. Otherwise RagPay retries with exponential backoff for up to 24 hours (about 12 attempts), then marks the webhook as failed in the dashboard.

