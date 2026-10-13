# One-off payments

Take a card payment for any record (a booking, an order, an invoice) through
Stripe Checkout, confirmed by Stripe's own signed webhook.

## What it adds

- Table `payment`: `record_id` (a ref to your table), `payer_id` (stamped by
  the server), `amount`, `currency`, `status` (pending, paid, failed), `check`,
  `stripe_session_id`, `paid_at`. Payers read only their own.
- Rules: a new payment starts pending and its amount must equal the record's
  price; a payer can't change a payment except to ask for a check.
- Server functions (the Stripe key stays on the server):
  - `payment-checkout` reads the record as the payer, charges its price,
    starts a Stripe Checkout and records a pending payment. Stripe sends
    people back to `app.url + /my-payments`, the app's own address.
  - `payment-confirm` is the manual fallback: it asks Stripe whether the
    session was paid for the right amount.
- Webhook workflow `stripe-payment-events`, verified as a Stripe webhook
  (`Stripe-Signature` on the raw body, 5-minute tolerance, each event applied
  once): `checkout.session.completed` and
  `checkout.session.async_payment_succeeded` mark the payment paid when
  Stripe charged exactly the server's amount; `checkout.session.expired` and
  `checkout.session.async_payment_failed` mark it not completed.
- Workflows: `payment-apply-check` applies what the manual check found;
  `payment-paid-notify` thanks the payer.
- Components `PayableList` (`/pay`) and `MyPayments` (`/my-payments`, live,
  with a "Check with Stripe" button if a payment stays pending), and
  `/payments-admin` for staff.

## Before it works

1. Connect Stripe in the builder (or add `STRIPE_SECRET_KEY`).
2. In Stripe, open Developers, Webhooks, and add an endpoint with the URL of
   `stripe-payment-events` (the builder shows it under Backend, API;
   `get_contract` lists it under `webhooks`), for the four checkout events
   above.
3. Put the endpoint's signing secret (`whsec_…`) in the project secret
   `STRIPE_WEBHOOK_SECRET` (several endpoints: their secrets separated by
   commas).

No `APP_URL` is needed: return links are built from the app's own address.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `attach_to` | The table people pay for. | required |
| `price_field` | Its number field with the price. | `price`, `total`, `amount` or `fee` |
| `payer_role` | The role that pays (it needs its own table). | your first consumer role |
| `payer_ref` | Optional ref on the table to the person who owes it. | none |
| `currency` | Three-letter code, lower case. | `usd` |

## Use it

```
appbricx templates use one-off-payments --param attach_to=booking --param price_field=total --param payer_ref=guest_id
```
