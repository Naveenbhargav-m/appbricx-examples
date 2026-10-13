# Daily digest

Every morning, a digest of yesterday's new rows in one table, to a role.

## What it adds

- Workflow `daily-digest` on a daily schedule over your table: an in-app
  notification and an email to everyone with the role, with the count for
  the last 24 hours and up to ten of the newest rows.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `entity` | The table to summarise. | required |
| `role` | Who receives it (a staff role). | your first staff role |
| `time` | Time of day, `HH:MM`. | `08:00` |
| `tz` | IANA time zone. Empty means UTC. | empty |

## Make it yours

The body can use `{{count}}`, `{{items}}`, `{{period}}`, `{{date}}`, and
aggregates over the table: `{{by:status}}` (a line per value),
`{{total:amount}}` (a sum). Change it with `patch_contract` `set_workflow`.
