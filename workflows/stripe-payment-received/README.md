# Stripe payment received

Records every paid Stripe Checkout session the moment Stripe reports it,
once, and tells your team.

## What it adds

- Table `stripe_payment`: `session_id` (unique), `amount`, `currency`,
  `email`, `payer_name`, `description`, `paid_at`. Only staff can read it.
- Webhook workflow `stripe-checkout-events`, verified as a Stripe webhook:
  the `Stripe-Signature` header is checked on the raw request body (5-minute
  tolerance), and each Stripe event runs once. A paid
  `checkout.session.completed` (or `checkout.session.async_payment_succeeded`)
  is recorded as a `stripe_payment` row, unless that session is already
  there.
- Workflow `stripe-payment-received`: on each new row, notify staff and email
  the payer a receipt.
- Server function `stripe-sync-payments` (staff only), the fallback: asks
  Stripe for the latest 50 completed Checkout sessions and records each paid
  one that isn't recorded yet, with `STRIPE_SECRET_KEY` read on the server.
- Component `StripePayments` on a staff page, `/stripe-payments`: the live
  list, the total and a Check Stripe now button.

## Before it works

1. In Stripe, open Developers, Webhooks, and add an endpoint with the URL of
   `stripe-checkout-events` (the builder shows it under Backend, API;
   `get_contract` lists it under `webhooks`). Select
   `checkout.session.completed` and
   `checkout.session.async_payment_succeeded`.
2. Put the endpoint's signing secret (`whsec_…`) in the project secret
   `STRIPE_WEBHOOK_SECRET` (several endpoints: their secrets separated by
   commas).
3. For the Check Stripe now fallback, connect Stripe in the builder (its key
   is mapped to `STRIPE_SECRET_KEY`) or add `STRIPE_SECRET_KEY` yourself. A
   restricted key with read access to Checkout Sessions is enough.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `staff_role` | The staff role that manages payments. | your first staff role |

## Use it

```
appbricx templates use stripe-payment-received --param staff_role=admin
```
