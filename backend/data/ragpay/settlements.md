---
title: Settlements
category: settlements
---
# Settlements

A settlement is a bank transfer from RagPay to your account covering captured payments.

## Settlement lifecycle
Captured payments are grouped into a settlement batch. Standard cycle is **T+2 working days**: a payment captured on Monday is settled on Wednesday. Weekends and bank holidays are skipped, so a Friday capture settles the following Tuesday.

## Settlement statuses
`created` → `processed` → `reversed` (rare). `processed` means RagPay has initiated the bank transfer; credit usually shows in your account within a few hours, occasionally the next morning.

## Endpoints
- `GET /v1/settlements` lists settlements.
- `GET /v1/settlements/{id}` returns one settlement with `amount`, `fees`, `tax`, `utr` and `status`.
- `GET /v1/settlements/reconciliation` returns a per-payment breakdown for a date range.

## When will my settlement arrive?
Use the capture date, add 2 working days, then allow up to 4 hours for the bank credit. The `utr` (Unique Transaction Reference) on a processed settlement lets your bank locate the credit. New merchants have a 7-day hold on the first settlement.

## Instant settlement
Eligible merchants can request an on-demand settlement any time, including weekends, for a fee of 0.4% of the amount (see Settlement fees and tax).

