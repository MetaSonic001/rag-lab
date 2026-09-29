---
title: Security and PCI compliance
category: security
---
# Security and PCI compliance

RagPay is PCI-DSS Level 1 compliant. You stay out of scope by never touching raw card data.

## Rules
- Use hosted Checkout or the client SDK: card numbers go straight from the customer's browser to RagPay.
- Never log card numbers, CVV or OTPs.
- Serve every page that opens checkout over HTTPS.
- Verify webhook signatures.
- Store `key_secret` in a secrets manager.

## Data retention
RagPay stores tokenised card references (`token_xxx`) and never CVV. Customer data is retained for 8 years as required by financial regulation.

## Reporting a vulnerability
Email security@ragpay.example. Do not include customer data in the report.

