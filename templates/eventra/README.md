# Eventra template

Event ticketing with QR passes and door check-in. Attendees sign up. Organizers run events. Door staff check people in.

This is the contract of the live showcase app at https://eventra.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Discover with search, availability bars and relative dates
- Event page with an accessible pass picker, lineup, venue map and sold-out state
- My tickets split into coming up and past, each with a QR pass
- Backstage: events table, sales-by-day chart, guest list and an editor with "Draft with AI"
- Door check-in per show with "Still to arrive", recent check-ins and wrong-night refusals

Platform features it uses:

- Rules: no selling past capacity, no double check-in
- Live counters
- Reminder the day before

| | |
|---|---|
| Tables | `attendee`, `organizer`, `door`, `event`, `ticket_tier`, `ticket`, `reminder` |
| Custom screens | `EventraAuth`, `EventraDiscover`, `EventraEvent`, `EventraTickets`, `EventraOrganizer`, `EventraDoor` |
| Roles | `attendee` (consumer), `organizer` (staff), `door` (staff) |

Workflows:

- `ticket-confirm-attendee`: Confirm ticket to attendee
- `ticket-notify-organizer`: Tell organizer about a sale
- `ticket-count-sold`: Count sold tickets
- `ticket-count-checkin`: Count check-ins
- `remind-tomorrow`: Remind attendees of tomorrow's events
- `reminder-notify`: Push reminder to attendee

## Screens

| Route | Page | Who |
|---|---|---|
| `/discover` | Discover | `attendee` |
| `/event/:id` | Event | `attendee` |
| `/tickets` | My tickets | `attendee` |
| `/backstage` | Backstage | `organizer` |
| `/gate` | Check-in | `door` |
| `/team` | Team | `organizer` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- Theme `electric-slate` (was `cosmic-night`); one hot-pink accent, no gradient text or glow, nothing smaller than 12px.
- Discover gained search and availability; the event page, My tickets, Backstage and door screens were rebuilt (see above). The Team page matches the dark theme.
- Editor fix: opening it before data loaded could save duplicate pass types.
- Seeds rebuilt: 24 attendees and 170 tickets spread over the last two weeks, with check-ins for tonight's shows.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Eventra"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-eventra
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Eventra template in
> templates/eventra/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
