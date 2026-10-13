# Tablefor template

Restaurant reservations with a live kitchen board. Guests sign up and book. Hosts run the floor. Chefs work the kitchen display.

This is the contract of the live showcase app at https://tablefor.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Restaurant home with an editorial menu, hours and an AI "Ask the menu"
- Book a table (also at `/reserve`) with a confirm bar pinned on phones
- My bookings with a QR door pass (also at `/my-bookings`)
- Host floor: tonight's timeline per sitting, check-in, walk-ins, a floor map and seat/order sheets
- Full-screen kitchen tickets with readable ages ("Just in", "12 min")

Platform features it uses:

- Business rule: no overbooking a slot
- Realtime kitchen tickets
- Hourly no-show sweep
- Guests see only their own bookings

| | |
|---|---|
| Tables | `guest`, `host`, `chef`, `dish`, `opening_hour`, `slot`, `slot_load`, `booking`, `ticket` |
| Custom screens | `TableforLogin`, `GuestApp`, `HostFloor`, `KitchenBoard` |
| Roles | `guest` (consumer), `host` (staff), `chef` (staff) |

Workflows:

- `booking-notify-host`: New booking: host
- `booking-count-seats`: Count seats in slot
- `booking-cancel-free-seats`: Free seats on cancel
- `booking-seated-chef`: Table seated: kitchen
- `ticket-ready-host`: Ticket ready: host
- `noshow-sweep`: Hourly no-show sweep

## Screens

| Route | Page | Who |
|---|---|---|
| `/book` | Fig & Ember | `guest` |
| `/kitchen` | Kitchen | `chef` |
| `/team` | Team & access | `host` |
| `/floor` | Floor | `host` |
| `/reserve` | Book a table | `guest` |
| `/my-bookings` | My bookings | `guest` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New guest pages `/reserve` and `/my-bookings` (the same `GuestApp` screen opened on a tab), and a bottom tab bar on phones (`nav_style: bottomTabs`).
- Theme moved from `vintage-paper` to `modern-minimal`; buttons use a deeper paprika so white text passes contrast; no glows, bounce easing or tiny text.
- Clearer labels everywhere (Confirmed, Seated, No-show, "Table 7"), loading, empty and error states, and a two-step cancel.
- Seeds rebuilt from the refreshed showcase: 45 bookings over about five weeks, a live service and 8 kitchen tickets.
- The showcase's hourly "keep demo bookings current" workflow is left out: it moves every booking date forward and is only there to keep the public demo fresh.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Tablefor"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-tablefor
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Tablefor template in
> templates/tablefor/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
