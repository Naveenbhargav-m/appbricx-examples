# Nook template

Vacation rentals with availability, requests and reviews. Guests sign up. Hosts list stays and accept requests.

This is the contract of the live showcase app at https://nook.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Stays grid with photo carousels
- A stay page of its own (`/stay/:id`) with gallery, AI "Ask about this stay", calendar, reviews and booking panel
- Trips with a featured next trip and a review sheet
- Host listings, requests (decline asks to confirm) and earnings with a chart

Platform features it uses:

- Rules: no overlapping stays, reviews only after a stay
- Booking lifecycle
- Daily completion workflow
- AI plan my stay

| | |
|---|---|
| Tables | `guest`, `host`, `stay`, `booking`, `booked_range`, `review` |
| Custom screens | `NookLogin`, `NookExplore`, `NookTrips`, `NookHost`, `NookStay` |
| Roles | `guest` (consumer), `host` (staff) |

Workflows:

- `request-notify-host`: Booking requested: notify host and hold the dates
- `confirmed-notify-guest`: Booking confirmed: notify guest
- `declined-notify-guest`: Booking declined: notify guest, free the dates
- `complete-past-stays`: Daily: complete bookings whose check-out has passed

## Screens

| Route | Page | Who |
|---|---|---|
| `/explore` | Explore | `guest` |
| `/trips` | Trips | `guest` |
| `/hosting` | Listings | `host` |
| `/hosting/requests` | Requests | `host` |
| `/hosting/earnings` | Earnings | `host` |
| `/team` | Team & access | `host` |
| `/stay/:id` | Stay | `guest` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New stay page at `/stay/:id` (new `NookStay` screen) with the AI "Ask about this stay" feature.
- Contrast and type fixed: deeper coral for buttons and links, DM Sans and Bricolage Grotesque, no bouncy springs; auth decor is now `none`.
- Loading, empty and error states on every list; readable dates and statuses; earnings chart for hosts.
- Seeds rebuilt: photos matched to their stays, duplicate reviews removed, 34 bookings from May 2026 to January 2027.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Nook"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-nook
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Nook template in
> templates/nook/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.

## Before you publish

This template keeps fixed demo sign-ins (`demo_logins`) because its sign-in
screen has quick-fill buttons for them. Anyone who reads this file knows those
passwords. Before you publish a real app, remove the quick-fill buttons from the
sign-in component and delete the `email` and `password` from each
`demo_logins` entry (Appbricx then generates new passwords).
