# CSV export

A Download CSV button for any table, with a preview of the first rows.

## What it adds

- Component `CsvExport` with props `title`, `entity` (a table name) and
  `columns` (comma-separated field names; empty means every field). It pages
  through up to 5,000 of the newest rows the viewer may read (row-level
  security applies, as everywhere) and builds the CSV in the browser.
- An `/export` page for the role you choose.

## Place it elsewhere

```json
{ "kind": "custom", "custom": "CsvExport", "props": { "title": "Orders", "entity": "order", "columns": "customer_id,total,status,created_at" } }
```

## Parameters

| Param | What it is | Default |
|---|---|---|
| `entity` | The table the Export page offers. | required |
| `page_role` | Who sees the Export page. | your first staff role |

## Use it

```
appbricx templates use csv-export --param entity=order
```
