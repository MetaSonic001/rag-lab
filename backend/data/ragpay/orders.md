---
title: Orders API
category: payments
---
# Orders API

An order represents what the customer intends to pay for. You create the order on your server before opening checkout.

## Create an order
`POST /v1/orders` with `amount`, `currency`, `receipt` (your internal id) and optional `notes`. The response contains `id` (for example `order_71Ab`) and `status: created`.

## Order statuses
- `created`: no successful payment yet.
- `attempted`: at least one payment attempt has been made.
- `paid`: a payment on the order has been captured.

## Fetch payments of an order
`GET /v1/orders/{id}/payments` lists every attempt. An order can have several failed attempts and one captured payment. Reconcile your database against this list, not against the client-side checkout callback, which can be lost if the customer closes the browser.

## Amount mismatches
If the captured amount differs from the order amount the payment is rejected at checkout with `BAD_REQUEST_ERROR`. Always compute the amount on the server.

