# Welcome email

Emails every new person a short welcome the moment they sign up.

## What it adds

- Workflow `welcome-email`: when a row is created in your signup table, send
  an email to its email field. The greeting uses the row's name (its label
  field).

## Parameters

| Param | What it is | Default |
|---|---|---|
| `person` | The table a new person lands in when they sign up (named after the role, such as `customer`). | your first consumer role |
| `email_field` | The email field on that table. | `email` |

## Use it

With your coding agent (Appbricx MCP connected):

```
Add the welcome-email template to my project.
```

The agent calls `use_template` with `{ "slug": "welcome-email", "params": { "person": "customer" } }`.

With the CLI:

```
appbricx templates use welcome-email --param person=customer
```

## Change it

Edit the subject and body in the workflow (`patch_contract` with
`set_workflow`). Placeholders such as `{{name}}` fill from the new row.
