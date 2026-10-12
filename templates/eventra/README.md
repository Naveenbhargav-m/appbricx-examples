# Eventra template

Event ticketing with QR passes and door check-in. Attendees sign up. Organizers run events. Door staff check people in.

This is the contract of the live showcase app at https://eventra.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Event discovery and ticket tiers
- Tickets as QR passes
- Live organizer dashboard and a check-in screen

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
