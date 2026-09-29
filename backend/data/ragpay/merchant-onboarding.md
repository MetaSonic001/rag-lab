---
title: Merchant onboarding
category: onboarding
---
# Merchant onboarding

## Steps
1. **Sign up** with email and phone. You get instant access to test mode.
2. **Integrate** using test keys (see Test mode) and payment flows from the Payments API.
3. **Submit KYC** with business, bank and identity details (see KYC and merchant verification).
4. **Activation**: on approval, live keys are generated and live payments are enabled.
5. **First settlement**: subject to a 7-day hold, then the regular T+2 cycle.

## Go-live checklist
- Webhooks configured on a public HTTPS endpoint and signature verified.
- Refund and terms pages published.
- Server-side amount calculation.
- Idempotency keys on payment creation.
- Live keys stored in environment variables, not in source control.

## Team access
Roles: Owner, Admin, Developer (keys and webhooks only), Finance (settlements and reports), Support (read-only payments).
