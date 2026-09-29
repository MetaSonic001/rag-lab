---
title: Payment lifecycle and states
category: payments
---
# Payment lifecycle and states

Every RagPay payment moves through a fixed set of states. Knowing the state is the first step of any investigation.

## Payment lifecycle
`created` → `authorized` → `captured` → (`refunded` | `partially_refunded`). A payment can also end in `failed` at the `created` or `authorized` step.

- **created**: the customer opened checkout; no money has moved.
- **authorized**: the bank has approved and reserved the funds. Money is NOT yet yours.
- **captured**: funds are confirmed and will be included in your next settlement. Only captured payments are settled.
- **failed**: the attempt did not succeed. `error_code` explains why (see Payment failure codes).
- **refunded / partially_refunded**: all or part of a captured payment was returned.

## Why order status and payment status can differ
An order is marked `paid` only when at least one payment on it is `captured`. A customer can therefore see a bank debit while your system still shows the order as failed. This usually means the payment reached `captured` at RagPay, but your server never processed the `payment.captured` webhook. Always fetch the payment with `GET /v1/payments/{id}` to see the source of truth.

## Pending debits
For UPI and netbanking a customer may be debited before RagPay receives the final bank response. The payment stays `authorized` or `created` for up to 30 minutes. If the bank confirms failure, the debit is auto-reversed to the customer within 5–7 working days.

