import { useEffect, useState } from "react";
import { Bell, CheckCircle, Info, AlertTriangle, Clock, User } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type NotificationInboxProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const PEOPLE = "{{param.recipient_role}}";
const str = (v: unknown) => (v == null ? "" : String(v));
const ICONS: Record<string, typeof Bell> = { general: Info, account: User, activity: CheckCircle, reminder: Clock };

function when(iso: string, now: number): string {
  const t = new Date(iso).getTime();
  if (!iso || !Number.isFinite(t) || !now) return "";
  const m = Math.max(0, Math.round((now - t) / 60000));
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function NotificationInbox({ title = "Inbox", app }: NotificationInboxProps) {
  const me = app?.me(PEOPLE) ?? "";
  const [rows, setRows] = useState<Row[]>([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const revision = app?.revision("notification") ?? 0;

  useEffect(() => (app ? app.live("notification") : undefined), [app]);
  useEffect(() => {
    setNow(Date.now());
    if (!app || !me) { setRows([]); return; }
    let live = true;
    app.query("notification", { where: { recipient_id: me }, sort: { field: "created_at", dir: "desc" }, limit: 100 })
      .then((r) => { if (live) setRows(r.rows); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [app, me, revision]);

  const unread = rows.filter((r) => !r.read_at);
  const shown = unreadOnly ? unread : rows;

  async function markRead(ids: string[]) {
    if (!app || ids.length === 0) return;
    setError("");
    const at = new Date().toISOString();
    setRows((rs) => rs.map((r) => (ids.includes(str(r.id)) ? { ...r, read_at: at } : r)));
    try {
      for (const id of ids) await app.update("notification", id, { read_at: at });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  function open(r: Row) {
    if (!r.read_at) void markRead([str(r.id)]);
    const link = str(r.link);
    if (app && link.startsWith("/")) app.navigate(link);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground">{unread.length === 0 ? "You're all caught up." : `${unread.length} unread`}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-1 text-sm" role="group" aria-label="Show">
            <button type="button" aria-pressed={!unreadOnly} onClick={() => setUnreadOnly(false)} className={`rounded-md px-3 py-1 ${!unreadOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>All</button>
            <button type="button" aria-pressed={unreadOnly} onClick={() => setUnreadOnly(true)} className={`rounded-md px-3 py-1 ${unreadOnly ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"}`}>Unread</button>
          </div>
          {unread.length > 0 && (
            <button type="button" onClick={() => void markRead(unread.map((r) => str(r.id)))} className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
              Mark all read
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Bell className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">{unreadOnly ? "Nothing unread." : "Nothing here yet. Updates about your account land here."}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {shown.map((r) => {
            const Icon = str(r.priority) === "high" ? AlertTriangle : ICONS[str(r.category)] ?? Bell;
            return (
              <li key={str(r.id)}>
                <button type="button" onClick={() => open(r)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-muted/50">
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${str(r.priority) === "high" ? "text-destructive" : "text-muted-foreground"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate ${r.read_at ? "text-muted-foreground" : "font-medium text-foreground"}`}>{str(r.title)}</span>
                    {str(r.body) && <span className="block text-sm text-muted-foreground">{str(r.body)}</span>}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{when(str(r.created_at), now)}</span>
                  {!r.read_at && <span aria-label="Unread" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
