# Relay template

Support desk with SLA timers and an email-to-ticket webhook. Customers sign up. Agents work the queue. A lead watches the numbers.

This is the contract of the live showcase app at https://relay.apps.appbricx.com, exported so you can
start your own app from it. Seed rows come from the showcase's preview data
(people are fictional, emails are on example.com).

## What you get

- Help centre for customers: tickets, conversation, new-ticket dialog with an AI priority suggestion, ratings
- Agent queue sorted by SLA, with reply, internal notes and "Draft reply with AI"
- Desk health dashboard for the lead: KPIs, needs-attention list, 7-day opened vs solved chart, CSAT comments and agent workload

Platform features it uses:

- Inbound webhook creates tickets
- SLA escalation every 15 minutes
- Internal notes customers never see
- AI triage and suggested replies

| | |
|---|---|
| Tables | `customer`, `agent`, `lead`, `ticket`, `message`, `note` |
| Custom screens | `RelayLogin`, `CustomerPortal`, `AgentInbox`, `LeadDashboard` |
| Roles | `customer` (consumer), `agent` (staff), `lead` (staff) |

Workflows:

- `email-to-ticket`: Email to ticket
- `ticket-defaults`: Fill ticket defaults and alert agents
- `sla-escalation`: Escalate tickets past SLA
- `agent-reply-notify`: Tell the customer about an agent reply
- `solved-notify`: Invite a rating when solved

## Screens

| Route | Page | Who |
|---|---|---|
| `/portal` | My tickets | `customer` |
| `/dashboard` | Dashboard | `lead` |
| `/inbox` | Queue | `agent`, `lead` |
| `/team` | Team & access | `agent` |

## What changed in this version

The showcase app was polished on design, phones and data, and this template follows it:

- Direction `crisp-saas` (was `editorial`) and brand colour `#0369A1` so white text on buttons passes AA.
- All four screens rewritten: SLA times as plain text ("Due in 40 min", "Overdue 2 h"), loading, empty and error states, bottom tab bar for staff on phones.
- Dashboard rebuilt with real median first-reply time, a 7-day chart and CSAT comments.
- Seeds rebuilt: 4 agents, 28 tickets across all statuses and 29 messages.

## Use this template

With the CLI (install it from this repo, see [the CLI docs](https://appbricx.com/docs/reference/cli)):

```sh
appbricx login
appbricx create "My Relay"
appbricx apply app.json      # run from this folder
appbricx verify
appbricx deploy --subdomain my-relay
```

With Claude Code or another agent connected to Appbricx:

> Start a new Appbricx project from the Relay template in
> templates/relay/app.json, rename it to "<your name>", apply it and verify it.

Then change it in plain words: your brand colour, your own tables, a new rule.
