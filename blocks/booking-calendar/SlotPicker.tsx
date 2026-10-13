import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { CalendarDays, Check, Clock, Users } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type SlotPickerProps = { title?: string; app?: AppHandle };
type Row = Record<string, unknown>;

const RESOURCE = "{{param.attach_to}}";
const RESOURCE_LABEL = "{{param.attach_to.label_field}}";
const PEOPLE = "{{param.booker_role}}";

const str = (v: unknown) => (v == null ? "" : String(v));
const dayKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

export default function SlotPicker({ title = "Book a time", app }: SlotPickerProps) {
  const reduce = useReducedMotion();
  const me = app?.me(PEOPLE) ?? "";
  const [slots, setSlots] = useState<Row[]>([]);
  const [now, setNow] = useState(0);
  const [day, setDay] = useState("");
  const [seats, setSeats] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const revision = app?.revision("slot") ?? 0;
  const resources = app?.rows(RESOURCE) ?? [];
  const mine = app?.rows("reservation") ?? [];

  useEffect(() => (app ? app.live("slot") : undefined), [app]);
  useEffect(() => {
    setNow(Date.now());
    if (!app) return;
    let live = true;
    app.query("slot", { sort: { field: "starts_at", dir: "desc" }, limit: 200 })
      .then((r) => { if (live) setSlots(r.rows); })
      .catch((e: unknown) => { if (live) setError(e instanceof Error ? e.message : String(e)); });
    return () => { live = false; };
  }, [app, revision]);

  const upcoming = useMemo(
    () => slots
      .filter((s) => str(s.status) !== "closed" && new Date(str(s.starts_at)).getTime() > now)
      .sort((a, b) => str(a.starts_at).localeCompare(str(b.starts_at))),
    [slots, now],
  );
  const days = useMemo(() => Array.from(new Set(upcoming.map((s) => dayKey(str(s.starts_at))))).slice(0, 14), [upcoming]);
  const current = day && days.includes(day) ? day : days[0] ?? "";
  const shown = upcoming.filter((s) => dayKey(str(s.starts_at)) === current);
  const booked = (slotId: unknown) => mine.some((r) => str(r.slot_id) === str(slotId) && str(r.status) !== "cancelled");
  const nameOf = (id: unknown) => str(resources.find((r) => str(r.id) === str(id))?.[RESOURCE_LABEL]);

  async function book(s: Row) {
    if (!app || !me) return;
    const n = seats[str(s.id)] ?? 1;
    setBusy(str(s.id)); setError(""); setMessage("");
    try {
      await app.create("reservation", { slot_id: str(s.id), booker_id: me, seats: n, status: "booked" });
      setMessage(`Booked: ${str(s.title)} at ${time(str(s.starts_at))}. It's in your bookings.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      {days.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <CalendarDays className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No open times right now. New times appear here as soon as they're added.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Day">
            {days.map((d) => {
              const date = new Date(`${d}T12:00:00`);
              const on = d === current;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setDay(d)}
                  className={`flex min-w-[4.25rem] flex-col items-center rounded-xl border px-3 py-2 text-sm ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground hover:bg-muted"}`}
                >
                  <span className="text-xs opacity-80">{date.toLocaleDateString("en-US", { weekday: "short" })}</span>
                  <span className="text-lg font-semibold leading-tight">{date.getDate()}</span>
                </button>
              );
            })}
          </div>
          {message && <p className="rounded-lg bg-muted p-3 text-sm text-foreground">{message}</p>}
          {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <ul className="space-y-3">
            {shown.map((s, i) => {
              const left = Math.max(0, Number(s.capacity ?? 0) - Number(s.booked ?? 0));
              const have = booked(s.id);
              const n = seats[str(s.id)] ?? 1;
              return (
                <motion.li
                  key={str(s.id)}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: reduce ? 0 : i * 0.03 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-foreground">{str(s.title)}</p>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{time(str(s.starts_at))} to {time(str(s.ends_at))}</span>
                      {nameOf(s.resource_id) && <span>{nameOf(s.resource_id)}</span>}
                      <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{left === 0 ? "Full" : `${left} left`}</span>
                    </p>
                  </div>
                  {have ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-sm text-foreground"><Check className="h-4 w-4" /> Booked</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      {left > 1 && (
                        <label className="flex items-center gap-1 text-sm text-muted-foreground">
                          <span className="sr-only">Places</span>
                          <select value={n} onChange={(e) => setSeats((m) => ({ ...m, [str(s.id)]: Number(e.target.value) }))} className="rounded-lg border border-border bg-background px-2 py-1.5 text-foreground">
                            {Array.from({ length: Math.min(left, 6) }, (_, k) => k + 1).map((k) => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </label>
                      )}
                      <button
                        type="button"
                        disabled={left === 0 || busy === str(s.id) || !me}
                        onClick={() => void book(s)}
                        className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {busy === str(s.id) ? "Booking" : left === 0 ? "Full" : "Book"}
                      </button>
                    </div>
                  )}
                </motion.li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
