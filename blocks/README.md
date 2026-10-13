# Blocks

Features you add to an app you already have. Each folder holds a
`template.json` (what it is, its params), a `fragment.json` (the tables,
access, rules, workflows, pages and components it adds), any component
sources, and a README.

| Block | What it adds |
|---|---|
| [Organisations and teams](./organisations-and-teams) | Organisations, teams, roles and email invitations, managed by owners and admins. |
| [Stripe subscriptions](./stripe-subscriptions) | Plans paid through Stripe Checkout, a billing page and Stripe's billing settings. |
| [One-off payments](./one-off-payments) | A card payment for any record (a booking, an order), confirmed by the server. |
| [Booking calendar](./booking-calendar) | Time slots with capacity, a day picker, my bookings, and no double-booking. |
| [Comments](./comments) | Threaded comments on any record, with @mentions, edits and live updates. |
| [Notifications](./notifications) | An in-app inbox with email and text message preferences. |

Use one with your coding agent ("add the comments template to my project,
on tasks") or the CLI:

```
appbricx templates use comments --param attach_to=task --dry-run
```

How params, clashes and prefixes work: [the template format](../TEMPLATE_FORMAT.md).
