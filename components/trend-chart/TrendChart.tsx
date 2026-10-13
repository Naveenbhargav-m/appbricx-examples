import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type TrendChartProps = { title?: string; entity?: string; dateField?: string; days?: number; app?: AppHandle };
type Row = Record<string, unknown>;

const DAY = 24 * 3600 * 1000;
const str = (v: unknown) => (v == null ? "" : String(v));
const key = (t: number) => new Date(t).toISOString().slice(0, 10);

export default function TrendChart({ title = "Activity", entity = "", dateField = "created_at", days = 30, app }: TrendChartProps) {
  const span = Math.min(Math.max(Math.round(days) || 30, 7), 90);
  const [rows, setRows] = useState<Row[]>([]);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const revision = entity && app ? app.revision(entity) : 0;

  useEffect(() => {
    setNow(Date.now());
    if (!app || !entity) return;
    let live = true;
    app.query(entity, { sort: { field: dateField, dir: "desc" }, limit: 500 })
      .then((r) => { if (live) setRows(r.rows); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [app, entity, dateField, revision]);

  const data = useMemo(() => {
    if (!now) return [];
    const start = now - (span - 1) * DAY;
    const counts = new Map<string, number>();
    for (let i = 0; i < span; i++) counts.set(key(start + i * DAY), 0);
    for (const r of rows) {
      const t = new Date(str(r[dateField])).getTime();
      if (!Number.isFinite(t)) continue;
      const k = key(t);
      if (counts.has(k)) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return [...counts.entries()].map(([day, total]) => ({ day: day.slice(5), total }));
  }, [rows, now, span, dateField]);

  const half = Math.floor(data.length / 2);
  const recent = data.slice(half).reduce((s, d) => s + d.total, 0);
  const before = data.slice(0, half).reduce((s, d) => s + d.total, 0);
  const total = recent + before;
  const change = before === 0 ? null : Math.round(((recent - before) / before) * 100);

  return (
    <section className="space-y-3 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{total} in the last {span} days</p>
        </div>
        {change !== null && (
          <p className={`inline-flex items-center gap-1 text-sm ${change >= 0 ? "text-foreground" : "text-muted-foreground"}`}>
            {change >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
            {change >= 0 ? "+" : ""}{change}% on the {Math.floor(span / 2)} days before
          </p>
        )}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!entity ? (
        <p className="text-sm text-muted-foreground">Pick a table to chart.</p>
      ) : (
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
              <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip cursor={{ fill: "hsl(var(--muted))" }} />
              <Bar dataKey="total" name="Added" fill="hsl(var(--primary))" radius={3} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
