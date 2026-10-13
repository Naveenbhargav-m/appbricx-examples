# Kanbo template

Team project board with drag and drop. Managers and members, invited by the team.

This is the contract of the live showcase app at https://kanbo.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Board with columns and draggable cards
- Card sheet with checklist, comments and an AI "Break it down" panel
- My work and Projects views
- Team workload: in-progress against the WIP limit, open, overdue and done per person, recent activity
- Sign-in access page (`/access`) for inviting people

Platform features it uses:

- Rule: work-in-progress limit per person
- Realtime board
- Notify the assignee
- Daily overdue flag

| | |
|---|---|
| Tables | `manager`, `member`, `project`, `card`, `checklist_item`, `comment`, `assignment` |
| Custom screens | `KanboLogin`, `KanboBoard`, `KanboWork` |
| Roles | `manager` (staff), `member` (staff) |

Workflows:

- `assign-notify`: Tell people when a card is assigned to them
- `comment-notify`: Tell the assignee about new comments
- `overdue-flag`: Flag overdue cards every morning

## Screens

| Route | Page | Who |
|---|---|---|
| `/board` | Board | `manager`, `member` |
| `/my-work` | My work | `manager`, `member` |
| `/projects` | Projects | `manager` |
| `/team` | Team | `manager` |
| `/access` | Sign-in access | `manager` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- The Team page is now a real workload view in the app's own shell; inviting people moved to the new `/access` page. The separate `KanboNavBar` component is gone (the shell is built into each screen).
- Theme `midnight-gold` with direction `techno` and brand colour `#7152F7` (white on it passes AA).
- Sign-in uses the app's dark theme, with a proper form and Google sign-in.
- AI "Break it down" is a labelled panel with loading, results you add one by one and a retry on failure.
- Seeds rebuilt: 34 cards, 47 checklist items and 18 comments.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Kanbo"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-kanbo
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Kanbo template in
> templates/kanbo/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
