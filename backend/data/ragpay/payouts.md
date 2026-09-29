---
title: Payouts
category: settlements
---
# Payouts

Payouts let you send money from your RagPay balance to bank accounts, for example vendor payments or salaries. This is different from settlements, which pay YOU for customer payments.

## Create a payout
`POST /v1/payouts` with `fund_account_id`, `amount`, `mode` (`IMPS`, `NEFT`, `UPI`) and `purpose`.

## Modes
IMPS and UPI are instant, 24×7. NEFT is batched. Fees: ₹3 per IMPS payout, ₹2 per NEFT, ₹1 per UPI.

## Failures
`payout.failed` with reasons such as `INVALID_ACCOUNT` or `BENEFICIARY_BANK_DOWN`. Failed payouts are auto-reversed to your balance within an hour.

