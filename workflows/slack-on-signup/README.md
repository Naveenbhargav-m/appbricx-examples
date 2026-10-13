# Slack message on signup

Posts to a Slack channel whenever someone new signs up.

## What it adds

- Workflow `slack-on-signup`: when a row is created in your signup table,
  post "New Customer signed up: Ava Chen" to your channel through the Slack
  integration.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `person` | The table new people land in when they sign up. | your first consumer role |
| `channel` | The Slack channel id (Slack: channel details, bottom of the About tab, like `C0123ABCD`). | required |

## Before it posts

Connect Slack in the builder (Integrations). Until it is connected the step
is skipped and the run log says so; nothing fails.

## Use it

```
appbricx templates use slack-on-signup --param channel=C0123ABCD
```

or ask your coding agent: "Add the slack-on-signup template, channel C0123ABCD".
