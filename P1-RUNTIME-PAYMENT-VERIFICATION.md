# P1 — Runtime & Payment Verification

**Status:** P1 EXECUTION GATE — external runtime verification still required
**Canonical repository:** `kayzjoel-hue/booking-system`

## Verified in GitHub

- The repository is public and its default branch is `main`.
- The latest commit (`54d9c1b`) has a successful Vercel status check.
- The application is a Next.js application with Supabase and Stripe dependencies.
- Stripe server initialization and payment/verification routes are present.
- Required runtime configuration is documented in `README.md`.

## Evidence boundary

A GitHub commit or Vercel CI/status success does **not** prove that the live application can create a booking, persist it to Supabase, create/confirm a Stripe payment, receive a webhook, or produce revenue.

## P1 acceptance gates

1. Confirm the canonical Vercel production URL is reachable.
2. Confirm the production Supabase URL and credentials resolve to the intended project.
3. Confirm required tables exist: `profiles`, `services`, `bookings`, `payments`.
4. Execute a test booking from the public UI.
5. Confirm booking persistence in Supabase.
6. Execute a test payment using Stripe test mode where appropriate.
7. Confirm payment verification and webhook behavior.
8. Confirm the resulting booking/payment state is visible to the intended dashboard/admin path.
9. Record timestamped runtime evidence before classifying the system as runtime-proven.

## Current blocker

The repository README records that the Supabase URL previously failed local resolution. Therefore this repository must remain classified as **implemented + deployment-signal present, runtime/payment proof pending** until the live environment is independently verified.

## Rule

Do not mark this P1 complete from source code, commit history, or deployment status alone. Completion requires observed runtime behavior and evidence.