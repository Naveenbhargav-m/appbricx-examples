# Reply deadline escalation

Escalates tickets nobody has answered within your deadline.

## What it adds

- Fields `waiting_since` and `escalated_at` (timestamps) on your table.
- Workflow `reply-deadline-check`, every 30 minutes: rows in the waiting
  status for longer than the deadline (counted from `waiting_since`, else
  from when they were created) get `escalated_at`, the assignee is told, and
  the escalation role gets one list.
- Workflow `reply-deadline-restart`: when a row moves into the waiting status,
  `waiting_since` is set to now and `escalated_at` cleared.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `ticket` | The table. | `ticket`, `request`, `enquiry` or `inquiry` |
| `status_field` | The status enum. | `status`, `state` or `stage` |
| `waiting_value` | The status that means a reply is owed. | `new`, `open`, `waiting`, `waiting_on_agent` or `pending` |
| `hours` | Deadline in hours. | `4` |
| `escalate_role` | The staff role told about late rows. | your first staff role |
| `assignee_ref` | Optional ref to the person who should reply. | none |

## Use it

```
appbricx templates use reply-deadline-escalation --param hours=2 --param escalate_role=lead
```
