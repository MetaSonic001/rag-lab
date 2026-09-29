---
title: Payments API
category: payments
---
# Payments API

The RagPay Payments API lets you create, fetch and capture payments. All endpoints live under `https://api.ragpay.example/v1` and require HTTP Basic authentication with your `key_id` and `key_secret`.

## Create a payment
`POST /v1/payments` creates a payment against an order. Required fields: `order_id`, `amount` (in the smallest currency unit, so ₹2,499 is `249900` paise), `currency`, and `method` (`card`, `upi`, `netbanking`, `wallet`). Send an `Idempotency-Key` header so a retried request never charges the customer twice.

## Fetch a payment
`GET /v1/payments/{id}` returns the payment object including `status`, `method`, `error_code` and `captured_at`. Use this endpoint to verify the true state of a payment when your own database disagrees with the customer.

## Capture a payment
`POST /v1/payments/{id}/capture` moves a payment from `authorized` to `captured`. You must pass the same `amount` that was authorized. If your account uses auto-capture (the default), you never need to call this endpoint. With manual capture, an authorized payment that is not captured within 5 days is automatically voided and the customer's money is released by the bank.

## Response example
```json
{ "id": "pay_9Xk2mQ", "status": "captured", "amount": 249900, "currency": "INR", "order_id": "order_71Ab", "method": "upi" }
```

