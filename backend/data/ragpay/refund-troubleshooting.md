---
title: Refund troubleshooting
category: refunds
---
# Refund troubleshooting

## Customer says the refund has not arrived
1. Fetch the refund with `GET /v1/refunds/{id}`. If `status` is `pending`, RagPay has not yet sent the money; this can take up to 48 hours.
2. If `status` is `processed`, the money has left RagPay. Card refunds then take 5–7 working days at the bank. Weekends and bank holidays do not count.
3. Share the **ARN** (Acquirer Reference Number) shown in the refund object with the customer. Their bank can trace the credit with it.
4. If the refund is `processed` for more than 10 working days and the ARN is present, ask the customer to raise a query with the issuing bank quoting the ARN.

## Refund failed
`refund.failed` means the bank rejected the credit (closed card, expired account). RagPay returns the amount to your settlement balance; pay the customer by bank transfer instead.

## Refund amount exceeds captured amount
Error `BAD_REQUEST_ERROR: refund amount exceeds payment amount`. Sum all existing refunds first via `GET /v1/payments/{id}/refunds`.

## Refund on an uncaptured payment
Authorized payments cannot be refunded. Void by letting the authorization expire (5 days) or capture and then refund.

