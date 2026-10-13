# The template format

Every template is a folder with a `template.json`, a README and a payload:

- **app** (`templates/<slug>`, `studio-bookings`): `app.json`, a complete
  contract. Using it creates a new project.
- **block**, **workflow**, **component** (`blocks/`, `workflows/`,
  `components/`): `fragment.json`, the part of a contract it adds to an
  existing app, plus any component sources it names.

The folder name is the template's slug.

## template.json

```json
{
  "slug": "comments",
  "kind": "block",
  "title": "Comments",
  "summary": "One sentence for cards and search.",
  "description": "A short paragraph for the detail page.",
  "category": "collaboration",
  "tags": ["comments", "mentions"],
  "params": [
    { "name": "attach_to", "type": "entity", "label": "Comment on", "description": "The table people comment on.", "example": "task" }
  ],
  "requires": { "integrations": [], "secrets": [], "notes": [] },
  "fragment": "fragment.json",
  "includes": ["What you get, in plain words"],
  "highlights": ["Platform features it shows off"]
}
```

Apps name `"contract": "app.json"` instead of a fragment and add
`demo_url`, `screenshots` and `roles_summary`. Categories: bookings,
payments, teams, collaboration, notifications, reporting, commerce, health,
learning, finance, productivity, support, events, hospitality, ui.

## Params

A param says where the template attaches to the app it is added to.

| type | value | options |
|---|---|---|
| `entity` | one of the app's tables | `default`: names tried in order, or `@first_consumer`, `@first_staff`, `@first` (a persona's own table) |
| `role` | one of the app's personas (it needs a table of its own) | `kind`: `staff` or `consumer` |
| `field` | a field of the table that `of` names (an entity param, a role param, or a ref field param: the table it points at) | `field_types`, `points_to` (must be a ref to that entity or role) |
| `value` | one of the values of the enum field that `of` names | |
| `text` | free text | `pattern` |

Every param is required unless it has a `default` or `"required": false`.

## fragment.json

```json
{
  "personas": [],
  "entities": [ { "name": "comment", "fields": [ { "name": "subject_id", "type": "ref", "ref": "{{param.attach_to}}" } ] } ],
  "extend": [ { "entity": "{{param.attach_to}}", "fields": [ { "name": "pinned", "type": "boolean", "optional": true } ] } ],
  "workflows": [],
  "pages": [],
  "components": [ { "name": "CommentThread", "kind": "code", "source_file": "CommentThread.tsx" } ],
  "seeds": {}
}
```

- `{{param.name}}` is filled everywhere, keys included. Filters:
  `{{param.name|title}}`, `|pascal`, `|kebab`. Accessors:
  `{{param.<entity or role>.label_field}}` (its label field) and
  `{{param.<ref field>.ref}}` (the table it points at). A choice:
  `{{param.org_field?org:all}}` is `org` when the param has a value and
  `all` when it doesn't (either side may be empty). Workflow
  placeholders such as `{{title}}` are left alone; write
  `{{{{param.field}}}}` to build one from a param.
- An array item with `"$if": "<param>"` is kept only when that param has a
  value.
- In `access` keys and page `personas`, `@staff`, `@consumers` and
  `@everyone` stand for every such persona of the app. A page or server
  function for a group the app doesn't have is left out.
- `extend` adds fields, rules, unique constraints or access to tables the app
  already has, and `org_field` (the ref naming a row's organisation, for
  "org" access cells). A field that is already there with the same type is
  kept.
- `seeds` may only fill the fragment's own new tables.

## Using a template

The merge never overwrites anything. A name the app already has (a table,
workflow, page, route or component) is refused; pass a prefix (`crm` gives
`crm_comment`, `crm-comment-notify`, `/crm-discussion`, `CrmCommentThread`,
with every reference renamed). The merged contract must check as cleanly as
the app did before, and is applied to the dev environment only.

```
appbricx templates use comments --param attach_to=task --dry-run
```
