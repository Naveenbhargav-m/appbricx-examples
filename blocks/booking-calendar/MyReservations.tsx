import { useEffect, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type MyReservationsProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const str = (v: unknown) => (v == null ? "" : String(v));
const when = (iso: string) =>
  iso ? new Date(iso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "";

export default function MyReservations({ title = "My bookings", app }: MyReservationsProps) {
  const [slots, setSlots] = useState<Row[]>([]);
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  const reservations = app?.rows("reservation") ?? [];
  const revision = app?.revision("reservation") ?? 0;

  useEffect(() => (app ? app.live("reservation") : undefined), [app]);
  useEffect(() => {
    setNow(Date.now());
    if (!app) return;
    let live = true;
    app.query("slot", { sort: { field: "starts_at", dir: "desc" }, limit: 200 })
      .then((r) => { if (live) setSlots(r.rows); })
      .catch(() => undefined);
    return () => { live = false; };
  }, [app, revision]);

  const slotOf = (id: unknown) => slots.find((s) => str(s.id) === str(id));
  const rows = reservations
    .map((r) => ({ r, s: slotOf(r.slot_id) }))
    .sort((a, b) => str(a.s?.starts_at).localeCompare(str(b.s?.starts_at)));
  const isUpcoming = (x: { r: Row; s?: Row }) => str(x.r.status) === "booked" && new Date(str(x.s?.starts_at)).getTime() > now;
  const upcoming = rows.filter(isUpcoming);
  const past = rows.filter((x) => !isUpcoming(x)).reverse();

  async function cancel(id: string) {
    if (!app) return;
    setError("");
    try {
      await app.update("reservation", id, { cancel_request: "requested" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Coming up</h2>
        {upcoming.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing booked yet. Pick a time and it shows up here.</p>
        ) : (
          upcoming.map(({ r, s }) => (
            <div key={str(r.id)} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{str(s?.title) || "Booking"}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> {when(str(s?.starts_at))}{Number(r.seats) > 1 ? ` · ${Number(r.seats)} places` : ""}
                </p>
              </div>
              {str(r.cancel_request) === "requested" ? (
                <span className="text-sm text-muted-foreground">Cancelling</span>
              ) : (
                <button type="button" onClick={() => void cancel(str(r.id))} className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted">
                  <X className="h-4 w-4" /> Cancel
                </button>
              )}
            </div>
          ))
        )}
      </section>
      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Earlier and cancelled</h2>
          <ul className="divide-y divide-border rounded-xl border border-border bg-card">
            {past.map(({ r, s }) => (
              <li key={str(r.id)} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span className="truncate text-foreground">{str(s?.title) || "Booking"} · {when(str(s?.starts_at))}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{str(r.status)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
