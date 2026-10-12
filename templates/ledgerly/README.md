# Ledgerly template

Personal finance: accounts, budgets, bills and insights. Members sign up and manage only their own money.

This is the contract of the live showcase app at https://ledgerly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Dashboard with balances and a spending donut
- Transactions grouped by day
- Monthly budgets and recurring bills

Platform features it uses:

- Strictly private rows
- Rules on amount and date
- Daily recurring bills workflow
- AI explains your month

| | |
|---|---|
| Tables | `admin`, `member`, `account`, `budget`, `bill`, `transaction` |
| Custom screens | `DashboardScreen`, `TransactionsScreen`, `BudgetsScreen`, `InsightsScreen`, `LedgerlyAuth` |
| Roles | `member` (consumer), `admin` (staff) |

Workflows:

- `daily-recurring-bills`: Create today's recurring bill transactions
- `check-budget-on-create`: Flag transactions that push a category over budget
- `notify-over-budget`: Notify the member when a category is over budget

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Ledgerly"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-ledgerly
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Ledgerly template in
> templates/ledgerly/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.

## Before you publish

This template keeps fixed demo sign-ins (`demo_logins`) because its sign-in
screen has quick-fill buttons for them. Anyone who reads this file knows those
passwords. Before you publish a real app, remove the quick-fill buttons from the
sign-in component and delete the `email` and `password` from each
`demo_logins` entry (Appbricx then generates new passwords).
