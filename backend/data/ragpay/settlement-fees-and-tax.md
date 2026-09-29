---
title: Settlement fees and tax
category: settlements
---
# Settlement fees and tax

The amount you receive is lower than the sum of captured payments because of fees and tax.

## Standard pricing
- Cards, UPI and wallets: **2% platform fee** per captured payment (MDR).
- Netbanking: 2.5% platform fee.
- International cards: 3% platform fee.
- Instant settlement: extra 0.4% on the settled amount.

## Tax on fees
**GST at 18%** is charged on the platform fee (not on the payment amount). On ₹50,000 of card payments the fee is ₹1,000 and GST on the fee is ₹180, so ₹1,180 is deducted in total.

## Where fees appear
Every settlement object has `fees` and `tax` fields. Fees are deducted before the transfer: you are never invoiced separately. A monthly tax invoice is available under Dashboard → Reports → Tax.

## Fees on refunds
The platform fee of a refunded payment is not returned, because the payment was processed successfully. Refund amounts are additionally deducted from the settlement (see Refunds and Settlement reconciliation).

