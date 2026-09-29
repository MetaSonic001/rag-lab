---
title: Rate limits and API errors
category: developer
---
# Rate limits and API errors

## Rate limits
Live mode allows **1,000 requests per minute** per key; test mode allows 100. Exceeding it returns `429 RATE_LIMIT_EXCEEDED` with a `Retry-After` header. Back off exponentially.

## Error format
```json
{ "error": { "code": "BAD_REQUEST_ERROR", "description": "amount must be an integer", "field": "amount", "source": "business" } }
```

## HTTP status codes
- `400 BAD_REQUEST_ERROR`: invalid parameters (amount not in paise, missing `order_id`).
- `401`: authentication problem (see Authentication).
- `404 NOT_FOUND`: wrong id or wrong mode (test id in live).
- `409 IDEMPOTENCY_CONFLICT`: same `Idempotency-Key` used with a different body.
- `429`: rate limit.
- `5xx SERVER_ERROR`: retry with the same `Idempotency-Key`.

