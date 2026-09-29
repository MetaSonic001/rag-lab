---
title: Test mode
category: developer
---
# Test mode

Test mode simulates the entire platform without moving real money. Use keys starting with `rp_test_`.

## Test cards
- `4111 1111 1111 1111`: succeeds.
- `4000 0000 0000 0002`: declined with `BANK_DECLINED`.
- `4000 0000 0000 3220`: triggers 3-D Secure; use OTP `123456`.

## Test UPI
Use `success@ragpay` to succeed and `failure@ragpay` to fail.

## Test webhooks
Webhooks fire in test mode as well. Use a tunnelling tool to expose your local server over HTTPS, since RagPay does not deliver to `localhost`.

## Differences from live
Settlements are not created, refunds complete instantly, and rate limits are lower (100 requests per minute).

