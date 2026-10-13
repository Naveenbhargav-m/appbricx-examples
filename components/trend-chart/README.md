# Trend chart

A daily bar chart of new rows in any table, with the change against the
period before.

## What it adds

- Component `TrendChart` with props `title`, `entity` (a table name),
  `dateField` (default `created_at`) and `days` (7 to 90, default 30). It
  reads up to 500 of the newest rows the viewer may see, counts them per day
  and draws bars in the theme's primary colour.
- A `/trends` page for the role you choose, charting your table.

## Place it elsewhere

```json
{ "kind": "custom", "custom": "TrendChart", "props": { "title": "Orders per day", "entity": "order", "days": 14 } }
```

## Parameters

| Param | What it is | Default |
|---|---|---|
| `entity` | The table to chart on the Trends page. | required |
| `page_role` | Who sees the Trends page. | your first staff role |

## Use it

```
appbricx templates use trend-chart --param entity=order
```
