# Overdue alerts

Each morning, flags rows past their due date, tells the person assigned and
sends the team one list.

## What it adds

- Field `overdue_since` (timestamp) on your table.
- Workflow `overdue-check` (daily, 09:00 UTC): every row that isn't done and
  whose due date has passed gets `overdue_since`. The first time a row goes
  overdue, the assigned person gets a notification. The team role gets one
  notification listing everything overdue (up to 15 lines).
- Workflow `overdue-clear`: when the status changes to the done value,
  `overdue_since` is cleared.

A date field counts as overdue the day after it (due 12 October is overdue
from 13 October); a timestamp as soon as it passes.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `entity` | The table (tasks, jobs, invoices). | `task`, `job`, `card` or `invoice` |
| `due_field` | Date or timestamp field. | `due_on`, `due`, `due_date` or `due_at` |
| `status_field` | The status enum. | `status`, `stage` or `state` |
| `done_value` | The value that means finished. | `done`, `completed`, `closed`, `resolved`, `paid` or `shipped` |
| `assignee_ref` | Optional ref to the responsible person (their own row, so they can be told). | none |
| `notify_role` | The staff role that gets the list. | your first staff role |

## Use it

```
appbricx templates use overdue-alerts --param entity=task --param assignee_ref=owner_id
```

Change the time with `patch_contract` `set_workflow` (`"schedule": "daily 07:30"`, `"tz": "Europe/London"`).
