---
title: Disputes and chargebacks
category: disputes
---
# Disputes and chargebacks

A dispute (chargeback) happens when a customer asks their bank to reverse a payment.

## Lifecycle
`open` → `under_review` → `won` | `lost` (or `closed` if you accept it). RagPay emails you and sends a `dispute.created` webhook.

## Deadlines
You have **7 calendar days** to respond with evidence via `POST /v1/disputes/{id}/evidence`. Missing the deadline means an automatic loss.

## Financial impact
When a dispute opens, the disputed amount is placed on hold and deducted from your next settlement. If you win it is credited back; if you lose it stays deducted and a ₹500 chargeback fee applies.

## Evidence that works
Proof of delivery, customer communication, invoice, terms accepted at checkout, IP and device logs. For digital goods include usage logs.

## Reducing disputes
Use clear billing descriptors, send order confirmation emails, and refund promptly when a customer asks; a refund costs less than a chargeback.

