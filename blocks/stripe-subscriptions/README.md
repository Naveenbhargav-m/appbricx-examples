# Stripe subscriptions

Monthly or yearly plans paid through Stripe Checkout, confirmed by Stripe's
own signed webhook, with a billing page and Stripe's billing settings.

## What it adds

- Table `plan`: `name`, `description`, `price`, `currency`, `interval`
  (month, year), `stripe_price_id`, `features` (one per line or separated by
  `;`), `active`, `sort`. Two starter plans are seeded; paste your own Stripe
  price ids into them.
- Table `subscription`: `subscriber_id`, `plan_id`, `status` (pending,
  active, past_due, canceled), `sync`, the Stripe session, subscription and
  customer ids, and `current_period_end`. People read only their own.
- Webhook workflow `stripe-subscription-events`, verified as a Stripe
  webhook (`Stripe-Signature`, checked on the raw body, 5-minute tolerance,
  each event applied once). It handles `checkout.session.completed`,
  `invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated`
  and `customer.subscription.deleted`: links the checkout to the Stripe
  subscription and customer, marks it active, past due or cancelled, and
  keeps the renewal date.
- Server functions (the Stripe key stays on the server):
  - `subscription-checkout` starts a Stripe Checkout for a plan and records a
    pending subscription. Stripe sends people back to `app.url + /billing`,
    the app's own address (the preview, or the published app).
  - `billing-portal` opens Stripe's customer portal (card, plan, cancel).
  - `subscription-sync` is the manual fallback: it asks Stripe about a
    pending subscription and hands the answer to `subscription-apply-sync`.
- Workflows: `subscription-apply-sync` writes what the manual check found;
  `subscription-active-notify` tells the subscriber.
- Component `BillingPanel` on `/billing` (live: it updates the moment the
  webhook lands, and offers "Check with Stripe" if a checkout stays pending),
  and `/subscriptions-admin` for staff.

## How a payment is confirmed

The browser never decides a subscription is paid. Stripe sends the event to
the app's webhook, signed with your endpoint's secret; the platform checks
the signature before anything runs, and the workflow, which runs as the app,
updates the row. Rules refuse any change to `status` or the Stripe ids by
the subscriber, so marking yourself active is impossible.

## Before it works

1. In Stripe, create a product with a recurring price per plan and copy each
   `price_…` id into the plan (staff page, Plans tab).
2. Connect Stripe in the builder (its key is mapped to `STRIPE_SECRET_KEY`),
   or add `STRIPE_SECRET_KEY` in the project settings.
3. In Stripe, open Developers, Webhooks, and add an endpoint with the URL of
   `stripe-subscription-events` (the builder shows it under Backend, API;
   `get_contract` lists it under `webhooks`). Select the five events above.
4. Copy the endpoint's signing secret (`whsec_…`) into the project secret
   `STRIPE_WEBHOOK_SECRET`. Using more than one Stripe endpoint (a test and a
   live one, or another Stripe template)? Put each signing secret in it,
   separated by commas.
5. Turn on the customer portal in Stripe (Settings, Billing, Customer portal).

No `APP_URL` is needed: return links are built from the app's own address.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `subscriber_role` | The role that subscribes (it needs its own table). | your first consumer role |

## Use it

```
appbricx templates use stripe-subscriptions --param subscriber_role=member
```
