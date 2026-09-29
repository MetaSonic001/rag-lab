---
title: Idempotency
category: developer
---
# Idempotency

Networks fail. Idempotency keys make retries safe.

## How it works
Send an `Idempotency-Key` header (any unique string up to 64 characters, such as a UUID) on every `POST`. If RagPay has already seen the key it returns the original response instead of creating a duplicate payment, order or refund.

## Rules
- Keys are remembered for 24 hours.
- Reusing a key with different request parameters returns `409 IDEMPOTENCY_CONFLICT`.
- Generate the key once per logical operation, before the first attempt, and store it.

## Typical bug
Creating a new UUID inside the retry loop defeats idempotency and can double-charge a customer.

