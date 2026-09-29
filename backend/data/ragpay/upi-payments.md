---
title: UPI payments
category: payments
---
# UPI payments

UPI supports two flows: **collect** (RagPay sends a request to the customer's UPI app) and **intent** (the customer's app opens on mobile).

## Timeouts
The customer has 5 minutes to approve a collect request; after that the payment fails with `UPI_TIMEOUT`. On intent flows the payment stays `created` until the app returns.

## Pending status
If money is debited but the payment is not yet captured, wait up to 30 minutes for the final bank status. Debits for failed payments are auto-reversed in 1–3 working days.

## Limits
UPI payments are limited to ₹1,00,000 per transaction (₹2,00,000 for verified categories such as education and healthcare).

## Refunds
UPI refunds arrive in 1–3 working days.

