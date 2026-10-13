# Components

Custom React components (the standard signature: your props plus
`app: AppHandle`) you add to an app and place on any page. Each folder holds
a `template.json`, a `fragment.json`, the component's `.tsx` and a README.

| Component | What it is |
|---|---|
| [Trend chart](./trend-chart) | A daily bar chart of new rows in any table. |
| [CSV export](./csv-export) | A Download CSV button for any table, with a preview. |

```
appbricx templates use trend-chart --param entity=order
```

How params work: [the template format](../TEMPLATE_FORMAT.md).
