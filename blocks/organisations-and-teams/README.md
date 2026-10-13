# Organisations and teams

Let people create organisations, form teams, invite colleagues by email and
give them owner, admin or member roles.

## What it adds

- Tables `organisation` (`name`, `about`, `website`, `owner_id`), `team`,
  `membership` (`organisation_id`, `member_id`, `team_id`, `role`: owner,
  admin, member; `status`) and `invitation` (`email`, `role`, `team_id`,
  `status`: pending, accepted, revoked).
- Rules on every write: only an organisation's owner or admins add teams,
  members and invitations or change roles; a membership never moves to
  another person or organisation; there is one owner, the creator.
- Workflows: `organisation-owner` makes the creator the owner,
  `invitation-send` adds an existing person at once (and tells them) or emails
  the invitation, `invitation-join` adds a new signup to every organisation
  that invited their email.
- Pages: `/organisations` (list, create), `/organisations/:id` with the
  `OrganisationConsole` component (members, roles, teams, invitations), and
  `/organisations-admin` for staff.
- With `attach_to`, an `organisation_id` field on that table (its
  `org_field`), and that table becomes private to each organisation too.

## Who sees what

Everything is private to the members of the same organisation, enforced by
Postgres row-level security (organisation scope: `org` and `org_admin`
access, the `membership` table marked with `org_membership`):

| Table | Members of the organisation | Owners and admins |
|---|---|---|
| `organisation` | read (its creator and owner too) | change, delete |
| `team`, `membership` | read | create, change, delete |
| `invitation` | none | read, create, change, delete |
| your `attach_to` table | read, create, change | delete |

Only active memberships count (`status` = active); pausing one takes the
person out at once. People in no organisation see none of these rows. Staff
roles keep seeing every organisation (the All organisations page). The rules
add the messages and the finer points (one owner, a membership never moves).

With `attach_to`, rows of that table that have no `organisation_id` yet are
visible to staff only. A member who belongs to exactly one organisation gets
it filled in automatically on a new row; someone in several picks it in the
form.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `member_role` | The role that creates and joins organisations (it needs its own table). | your first role |
| `email_field` | Optional email field on that table, to match invitations. | `email` |
| `attach_to` | Optional table of yours that gets `organisation_id`. | none |

## Use it

```
appbricx templates use organisations-and-teams --param member_role=member --param attach_to=project
```
