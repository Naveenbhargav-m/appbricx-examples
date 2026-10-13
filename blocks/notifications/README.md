# Notifications

An in-app inbox for each person, with email and text message preferences
they control.

## What it adds

- Table `notification`: `recipient_id`, `title`, `body`, `link` (an app route
  such as `/orders`), `category` (general, account, activity, reminder),
  `priority` (normal, high), `read_at`, `emailed_at`, `sms_to`,
  `text_message`. People read only their own; a rule lets them mark one read
  but not change it.
- Table `notification_preference` (one per person): `email`, `sms`, `phone`.
  A rule asks for a valid mobile number before texts are turned on.
- Components `NotificationInbox` (`/inbox`) and `NotificationSettings`
  (`/notification-settings`), and a staff page `/notifications-admin` to send
  one by hand.
- Workflow `notification-deliver`: emails each new notification unless the
  person turned email off, and queues a text for people who opted in.
- Workflow `notification-sms` (only when you pass `sms_from`): sends queued
  texts through the Twilio integration.

## Send one from your own workflow

```js
await ctx.db.create("notification", {
  recipient_id: String(row["member_id"]),
  title: "Your order is ready",
  body: "Collect it from the front desk.",
  link: "/orders",
  category: "activity",
  priority: "normal",
});
```

## Organisation scope

Notifications are personal: each person reads only their own (`own`), which
is already narrower than an organisation, so this block takes no
`org_field`. A workflow in an organisation-scoped app can still send
notifications to its members.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `recipient_role` | The role that receives notifications (it needs its own table). | your first role |
| `email_field` | Optional email field on that table. | `email` |
| `sms_from` | Optional Twilio number, E.164. Without it texts stay off. | none |

## Use it

```
appbricx templates use notifications --param recipient_role=member --param sms_from=+15550100
```
