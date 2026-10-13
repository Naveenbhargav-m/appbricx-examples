# Booking calendar

Bookable time slots with capacity, a day picker, my bookings with cancel, and
rules that stop double-booking.

## What it adds

- Table `slot`: `title`, `resource_id` (a ref to the thing being booked),
  `starts_at`, `ends_at`, `capacity`, `booked`, `status` (open, closed),
  `note`. Rules: a slot ends after it starts, is at most 24 hours, holds 1 to
  500 people, and doesn't overlap another open slot for the same resource.
- Table `reservation`: `slot_id`, `booker_id` (stamped by the server), `seats`,
  `status` (booked, attended, cancelled), `cancel_request`, `note`. People see
  only their own. Rules refuse a closed, started or full slot, more places
  than are left, and a second booking that overlaps one the person already
  has. People can only cancel (never edit) their own booking, before it
  starts.
- Components `SlotPicker` (`/book`) and `MyReservations` (`/my-bookings`).
- Staff pages: `/time-slots` (week calendar, add times) and `/reservations`
  (grouped by status, book someone in).
- Workflows: `reservation-count` adds the places to the slot,
  `reservation-cancel-request` applies a cancel request, and
  `reservation-free-places` gives the places back.

## Organisation scope (optional)

Used with organisations-and-teams, pass `org_field`: the ref on the booked
table naming its organisation. Time slots then carry that organisation
(`slot-organisation` copies it from what is booked; a rule keeps it equal),
and only its members see and book them (`read: org`, enforced by Postgres).
Reservations stay personal: each person reads their own.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `attach_to` | The table of things people book (rooms, coaches, services). | required |
| `booker_role` | The role that books (it needs its own table). | your first consumer role |
| `org_field` | Optional ref on that table to its organisation. | none |

## Use it

```
appbricx templates use booking-calendar --param attach_to=room --param booker_role=member
```

If your app already has a `slot` or `reservation` table, add a prefix:
`--prefix studio` gives `studio_slot`, `studio_reservation` and `/studio-book`.
