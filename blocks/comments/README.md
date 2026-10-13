# Comments

Threaded comments on any record, with replies, @mentions, edits and live
updates.

## What it adds

- Table `comment`: `subject_id` (a ref to your table), `parent_id` (the
  comment it replies to), `author_id` (a ref to the commenting role's own
  table, stamped by the server so nobody can post as someone else), `body`,
  `mentions` (the ids of the people mentioned) and `edited_at`.
- Rules: a comment can't be empty or longer than 4,000 characters, a reply
  stays in the thread of the comment it answers, and a comment keeps its
  author.
- Component `CommentThread`: on a record page (a route ending in `/:id`) it
  shows that record's thread; elsewhere it shows a picker. Typing `@` suggests
  people; authors can edit and delete their own comments; new comments arrive
  live (`app.live("comment")`).
- Pages: `/discussion` for the commenting role, `/comments-admin` for staff.
- Workflow `comment-notify`: in-app notification to everyone mentioned, and to
  the author of the comment being replied to.

## Organisation scope (optional)

Used with organisations-and-teams, pass `org_field`: the ref on your table
naming its organisation (`organisation_id`). Each comment then carries its
subject's organisation (`organisation_id`, kept equal to the subject's by a
rule), and only members of that organisation read the thread (`read: org`,
enforced by Postgres). `CommentThread` fills it in for you.

## Parameters

| Param | What it is | Default |
|---|---|---|
| `attach_to` | The table people comment on. | required |
| `author_role` | The role that writes comments (it needs its own table). | your first role |
| `org_field` | Optional ref on that table to its organisation. | none |

## Put the thread on your record page

The component reads the record id from the route, so add it to your own
detail page, for example with `patch_contract`:

```json
{ "op": "set_page", "page": "task-detail", "layout": { "kind": "stack", "children": [
  { "kind": "block", "block": "EntityDetail", "props": { "entity": "task", "sections": [{ "title": "Task", "fields": ["title", "status"] }] } },
  { "kind": "custom", "custom": "CommentThread", "props": { "title": "Discussion" } }
] } }
```

## Use it

```
appbricx templates use comments --param attach_to=task --param author_role=member
```
