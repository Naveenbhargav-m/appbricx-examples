# Kanbo template

Team project board with drag and drop. Managers and members, invited by the team.

This is the contract of the live showcase app at https://kanbo.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Board with columns and draggable cards
- Card sheet with checklist and comments
- My work and project progress

Platform features it uses:

- Rule: work-in-progress limit per person
- Realtime board
- Notify the assignee
- Daily overdue flag

| | |
|---|---|
| Tables | `manager`, `member`, `project`, `card`, `checklist_item`, `comment`, `assignment` |
| Custom screens | `KanboLogin`, `KanboBoard`, `KanboWork`, `KanboNavBar` |
| Roles | `manager` (staff), `member` (staff) |

Workflows:

- `assign-notify`: Tell people when a card is assigned to them
- `comment-notify`: Tell the assignee about new comments
- `overdue-flag`: Flag overdue cards every morning

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
