---
title: Recurring payments and subscriptions
category: payments
---
# Recurring payments and subscriptions

Use the **Subscriptions API** for any repeating charge such as SaaS plans, memberships or EMIs.

## Which API should I use?
- One-off payments: Payments API (`POST /v1/payments`).
- Fixed schedule (monthly, yearly): Subscriptions API (`POST /v1/subscriptions`) with a `plan_id`.
- Variable amounts on demand (usage billing): Mandates API (`POST /v1/mandates`) then charge with `POST /v1/mandates/{id}/charge`.

## Plans
Create a plan first: `POST /v1/plans` with `period` (`daily`, `weekly`, `monthly`, `yearly`), `interval`, and `item.amount`.

## Customer authorisation
The first payment includes an e-mandate authorisation (card or UPI AutoPay). Subsequent charges are automatic. UPI AutoPay charges above ₹15,000 need customer approval each time.

## Failed renewals
A failed renewal is retried on days 1, 3 and 5. After the third failure the subscription moves to `halted` and a `subscription.halted` webhook fires. The customer must update the payment method.

