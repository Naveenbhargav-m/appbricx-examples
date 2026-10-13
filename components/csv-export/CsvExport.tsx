import { useEffect, useMemo, useState } from "react";
import { Download, Table } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type CsvExportProps = { title?: string; entity?: string; columns?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const SYSTEM = new Set(["user_id", "org_id", "created_by", "_search"]);
const cell = (v: unknown) => {
  const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function CsvExport({ title = "Export", entity = "", columns = "", app }: CsvExportProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const revision = entity && app ? app.revision(entity) : 0;

  useEffect(() => {
    if (!app || !entity) return;
    let live = true;
    setLoading(true);
    (async () => {
      const out: Row[] = [];
      let count = 0;
      for (let page = 0; page < 10; page++) {
        const r = await app.query(entity, { sort: { field: "created_at", dir: "desc" }, limit: 500, offset: page * 500 });
        out.push(...r.rows);
        count = r.total;
        if (r.rows.length < 500) break;
      }
      if (live) { setRows(out); setTotal(count); }
    })()
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [app, entity, revision]);

  const cols = useMemo(() => {
    const asked = columns.split(",").map((c) => c.trim()).filter(Boolean);
    if (asked.length > 0) return asked;
    const seen: string[] = [];
    for (const r of rows.slice(0, 50)) for (const k of Object.keys(r)) if (!SYSTEM.has(k) && !seen.includes(k)) seen.push(k);
    return seen;
  }, [rows, columns]);

  const csv = useMemo(() => [cols.map(cell).join(","), ...rows.map((r) => cols.map((c) => cell(r[c])).join(","))].join("\r\n"), [rows, cols]);
  const href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`;

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">
            {loading ? "Gathering rows" : `${rows.length} of ${total} rows, ${cols.length} columns`}
            {total > rows.length ? ". Exports stop at 5,000 rows." : ""}
          </p>
        </div>
        <a
          href={rows.length > 0 ? href : undefined}
          download={`${entity || "export"}-${new Date().toISOString().slice(0, 10)}.csv`}
          aria-disabled={rows.length === 0}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${rows.length > 0 ? "bg-primary text-primary-foreground" : "pointer-events-none bg-muted text-muted-foreground"}`}
        >
          <Download className="h-4 w-4" /> Download CSV
        </a>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {rows.length === 0 && !loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Table className="h-4 w-4" /> {entity ? "No rows to export yet." : "Pick a table to export."}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>{cols.map((c) => <th key={c} className="whitespace-nowrap border-b border-border px-2 py-1.5 font-medium text-muted-foreground">{c}</th>)}</tr>
            </thead>
            <tbody>
              {rows.slice(0, 5).map((r, i) => (
                <tr key={i}>{cols.map((c) => <td key={c} className="max-w-[14rem] truncate border-b border-border px-2 py-1.5 text-foreground">{r[c] == null ? "" : String(r[c])}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
