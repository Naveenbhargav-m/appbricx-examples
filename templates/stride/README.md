# Stride template

Fitness coaching: plans, workout logs and check-ins. Athletes sign up. Coaches follow their athletes.

This is the contract of the live showcase app at https://stride.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Athlete home with a live streak, check-in and workout log
- Activity heatmap with a 12-week summary
- Coach roster with a review queue, and an athlete detail page for replies and notes

Platform features it uses:

- Rules: one check-in a day, no future workouts
- Weekly digest on a schedule
- AI coach's tip
- Coaches see only their athletes

| | |
|---|---|
| Tables | `coach`, `athlete`, `plan_day`, `workout`, `checkin`, `feedback`, `digest` |
| Custom screens | `AthleteHome`, `StrideLogin`, `CheckIn`, `LogWorkout`, `Activity`, `CoachRoster`, `CoachAthlete`, `CoachNav` |
| Roles | `athlete` (consumer), `coach` (staff) |

Workflows:

- `workout-logged-notify-coach`: Workout logged: notify the coach
- `feedback-notify-athlete`: Coach feedback: notify the athlete
- `weekly-digest`: Monday 07:00 weekly digest

## Screens

| Route | Page | Who |
|---|---|---|
| `/` | Home | `athlete` |
| `/checkin` | Check-in | `athlete` |
| `/log` | Log | `athlete` |
| `/activity` | Activity | `athlete` |
| `/coach` | Roster | `coach` |
| `/coach/athlete/:id` | Athlete | `coach` |
| `/team` | Team & access | `coach` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New `CoachNav` component gives the coach's Team & access page the coach navigation.
- Theme `electric-slate` with direction `editorial`; text glow removed and contrast fixed.
- Activity heatmap gets a 12-week summary; the coach roster and athlete pages use initials avatars and clearer review-queue rows.
- Seeds rebuilt from the refreshed showcase: the 200 most recent workouts (the per-table limit), 94 check-ins, 135 coach replies and 32 weekly digests.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Stride"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-stride
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Stride template in
> templates/stride/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
