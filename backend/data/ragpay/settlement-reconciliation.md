---
title: Settlement reconciliation
category: settlements
---
# Settlement reconciliation

Reconciliation answers: "Why is my settlement amount different from what I expected?"

## The reconciliation formula
```
net settlement = gross captured amount
               − platform fees
               − GST on fees
               − refunds issued in the period
               − chargebacks / dispute holds
               ± adjustments
```

## Steps to reconcile
1. Call `GET /v1/settlements/{id}` for `amount`, `fees`, `tax`.
2. Call `GET /v1/settlements/reconciliation?settlement_id={id}` to list every payment, refund and adjustment in the batch.
3. Sum captured payments to get gross. Then subtract fees, GST, refunds and dispute holds.
4. Compare to `amount`. The result must match to the paisa.

## Common reasons a settlement is lower than expected
- **Refunds netted off**: refunds issued between two settlements are deducted from the next one.
- **Fees and GST** deducted at source.
- **Dispute holds**: the disputed amount is held until the case closes.
- **Negative carry-forward** from a previous settlement that was smaller than refunds.

## Worked example
Gross ₹50,000, fee ₹1,000, GST ₹180, refund ₹888 → net ₹47,932.

