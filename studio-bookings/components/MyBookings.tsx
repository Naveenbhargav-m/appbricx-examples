import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CalendarDays, X } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type MyBookingsProps = { title?: string; app?: AppHandle };

const TZ = "Europe/Lisbon";
const str = (v: unknown) => (v == null ? "" : String(v));
const when = (iso: string) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
    : "";

export default function MyBookings({ title = "Your classes", app }: MyBookingsProps) {
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => setNow(Date.now()), []);
  useEffect(() => (app ? app.live("booking") : undefined), [app]);

  const sessions = app?.rows("session") ?? [];
  const bookings = app?.rows("booking") ?? [];
  const session = (id: unknown) => sessions.find((s) => str(s.id) === str(id));

  const rows = bookings
    .map((b) => ({ b, s: session(b.session_id) }))
    .sort((x, y) => str(x.s?.starts_at).localeCompare(str(y.s?.starts_at)));
  const upcoming = rows.filter((r) => str(r.b.status) === "booked" && new Date(str(r.s?.starts_at)).getTime() > now);
  const past = rows.filter((r) => !upcoming.includes(r)).reverse();

  async function cancel(id: string) {
    if (!app) return;
    setError("");
    try {
      await app.transition("booking", id, "status", "cancelled");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Coming up</h2>
        {upcoming.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-muted-foreground">
            Nothing booked yet. Your next class is one tap away on the schedule.
          </p>
        )}
        <AnimatePresence initial={false}>
          {upcoming.map(({ b, s }) => (
            <motion.div
              key={str(b.id)}
              layout
              exit={{ opacity: 0, x: 40 }}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold text-foreground">{str(s?.title) || "Class"}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <CalendarDays className="h-3.5 w-3.5" /> {when(str(s?.starts_at))}
                </p>
              </div>
              <button
                onClick={() => void cancel(str(b.id))}
                className="inline-flex items-center gap-1 rounded-xl border border-border px-3 py-1.5 text-sm text-foreground hover:bg-muted"
              >
                <X className="h-4 w-4" /> Cancel
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </section>

      {past.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">History</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {past.map(({ b, s }) => (
              <li key={str(b.id)} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="text-foreground">{str(s?.title) || "Class"} · {when(str(s?.starts_at))}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">{str(b.status).replace("_", " ")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
