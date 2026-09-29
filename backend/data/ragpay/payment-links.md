---
title: Payment Links
category: payments
---
# Payment Links

Payment Links let you collect money without writing code: share a URL by SMS, email or WhatsApp.

## Create a link
`POST /v1/payment_links` with `amount`, `description`, `customer` and optional `expire_by` (Unix time). The response contains `short_url`.

## Statuses
`created` → `partially_paid` (if partial payments are enabled) → `paid` | `expired` | `cancelled`.

## Notifications
Set `notify.sms` or `notify.email` to true to send the link automatically. Reminders can be scheduled up to 3 times.

## Reconciliation
Each link is tied to an order; payments made through it are reported through the usual `payment.captured` webhook with `notes.payment_link_id`.

