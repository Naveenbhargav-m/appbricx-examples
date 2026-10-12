# Tablefor template

Restaurant reservations with a live kitchen board. Guests sign up and book. Hosts run the floor. Chefs work the kitchen display.

This is the contract of the live showcase app at https://tablefor.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Menu, opening hours and a slot picker
- Bookings with a QR code for the door
- Host floor timeline and walk-ins
- Full-screen kitchen tickets

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
