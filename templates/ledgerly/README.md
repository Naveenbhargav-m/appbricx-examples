# Ledgerly template

Personal finance: accounts, budgets, bills and insights. Members sign up and manage only their own money.

This is the contract of the live showcase app at https://ledgerly.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Home with total balance, an account card stack and an "Explain my month" card
- Activity grouped by day with an add/edit sheet
- Budgets with a daily allowance, and recurring bills with a monthly total
- Insights: up to six months of spending and the AI explanation

Platform features it uses:

- Strictly private rows
- Rules on amount and date
- Daily recurring bills workflow
- AI explains your month

| | |
|---|---|
| Tables | `admin`, `member`, `account`, `budget`, `bill`, `transaction` |
| Custom screens | `DashboardScreen`, `TransactionsScreen`, `BudgetsScreen`, `InsightsScreen`, `LedgerlyAuth`, `TeamHeader` |
| Roles | `member` (consumer), `admin` (staff) |

Workflows:

- `daily-recurring-bills`: Create today's recurring bill transactions
- `check-budget-on-create`: Flag transactions that push a category over budget
- `notify-over-budget`: Notify the member when a category is over budget

## Screens

| Route | Page | Who |
|---|---|---|
| `/dashboard` | Home | `member` |
| `/transactions` | Activity | `member` |
| `/budgets` | Budgets | `member` |
| `/insights` | Insights | `member` |
| `/team` | Team & access | `admin` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- New `TeamHeader` component for the Team & access page, with a privacy note.
- Direction `calm-health` (was `editorial`); greys, links and money colours pass contrast; headings in Manrope; no glows or bounce easing.
- Phone fixes: sign-out reachable from the header, 44px tap targets, transactions grouped one card per day.
- Insights shows up to six months; budgets show a daily allowance and bills a monthly total.
- Seeds rebuilt: 91 transactions so trends, Today and Yesterday all have data.

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
