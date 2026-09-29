---
title: Payment failure codes
category: payments
---
# Payment failure codes

When a payment fails, the `error_code`, `error_source` and `error_reason` fields explain why.

## Common codes
| error_code | Meaning | What to do |
|---|---|---|
| `BANK_DECLINED` | The issuing bank refused the transaction | Ask the customer to retry or use another method |
| `INSUFFICIENT_FUNDS` | Balance is too low | Customer must top up or use another method |
| `PAY_ERR_3DS_FAILED` | 3-D Secure / OTP authentication failed or timed out | Customer retries and completes OTP within 5 minutes |
| `CARD_EXPIRED` | Card expiry date is in the past | Use a different card |
| `UPI_TIMEOUT` | Customer did not approve the UPI collect request in 5 minutes | Resend collect request |
| `GATEWAY_TIMEOUT` | Bank did not respond in time | Poll the payment, do not retry blindly; money may still be captured |
| `RISK_BLOCKED` | RagPay risk engine flagged the payment | Contact support with the payment id |

## Retrying safely
Never create a second payment for the same order until you have fetched the first one. If the first payment shows `captured`, the customer has already paid. Use the `Idempotency-Key` header on retries.

## Error sources
`error_source` is one of `customer`, `bank`, `gateway` or `business`. Bank and customer errors are usually transient; `business` errors (for example a blocked merchant account) need support.

