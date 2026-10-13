# Workflows

Automations you add to an app you already have, with any fields they need.
Each folder holds a `template.json`, a `fragment.json` and a README.

| Workflow | What it does |
|---|---|
| [Welcome email](./welcome-email) | Emails every new person a welcome when they sign up. |
| [Slack message on signup](./slack-on-signup) | Posts new signups to a Slack channel. |
| [Booking confirmation and reminder](./booking-confirmation-and-reminder) | A confirmation email on booking and a reminder the day before. |
| [Daily digest](./daily-digest) | A morning summary of yesterday's new rows, in-app and by email. |
| [Overdue alerts](./overdue-alerts) | Flags rows past their due date and tells the assignee and the team. |
| [Reply deadline escalation](./reply-deadline-escalation) | Escalates tickets nobody answered within your deadline. |
| [Stripe payment received](./stripe-payment-received) | Records completed Stripe payments once, tells staff, emails a receipt. |

```
appbricx templates use daily-digest --param entity=order --param time=07:30
```

How params work: [the template format](../TEMPLATE_FORMAT.md).
