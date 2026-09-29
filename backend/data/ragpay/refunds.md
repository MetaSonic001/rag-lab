---
title: Refunds
category: refunds
---
# Refunds

A refund returns money from a captured payment to the customer.

## Issue a refund
`POST /v1/payments/{id}/refund` with an optional `amount` (omit for a full refund) and `speed` (`normal` or `optimum`). Fetch a refund with `GET /v1/refunds/{id}`. Partial refunds are allowed; the sum of refunds cannot exceed the captured amount. You can only refund `captured` payments.

## How refunds are funded
The refund amount is deducted from your **next settlement**, not paid from a separate balance. If your next settlement is smaller than the refund, the remainder is carried forward as a negative balance and netted against later settlements. The original processing fee is not returned on refunded payments.

## Refund timelines
- Cards: 5–7 working days after the refund is `processed`.
- UPI and wallets: 1–3 working days.
- Netbanking: 3–5 working days.
`speed: optimum` uses instant refunds where the customer's bank supports them and costs an extra 0.3% of the refund amount.

## Refund statuses
`pending` → `processed`. `processed` means RagPay has sent the money to the bank. The customer still needs to wait for the bank to credit it.

