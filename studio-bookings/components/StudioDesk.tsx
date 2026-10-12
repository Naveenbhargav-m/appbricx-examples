import { useEffect, useMemo, useState } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { CheckCircle, UserCheck, XCircle } from "lucide-react";
import type { AppHandle } from "@app/kit/primitives";

type StudioDeskProps = { title?: string; app?: AppHandle };

const TZ = "Europe/Lisbon";
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric" }).format(new Date(iso));
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function StudioDesk({ title = "Studio desk", app }: StudioDeskProps) {
  const [now, setNow] = useState(0);
  const [error, setError] = useState("");
  useEffect(() => setNow(Date.now()), []);
  useEffect(() => (app ? app.live("booking") : undefined), [app]);

  const sessions = app?.rows("session") ?? [];
  const bookings = app?.rows("booking") ?? [];
  const members = app?.rows("member") ?? [];
  const memberName = (id: unknown) => str(members.find((m) => str(m.id) === str(id))?.name) || "Member";

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => new Date(str(s.starts_at)).getTime() + num(s.duration_min) * 60000 > now)
        .sort((a, b) => str(a.starts_at).localeCompare(str(b.starts_at))),
    [sessions, now],
  );
  const firstDay = upcoming[0] ? dayKey(str(upcoming[0].starts_at)) : "";
  const today = upcoming.filter((s) => dayKey(str(s.starts_at)) === firstDay);

  const chart = useMemo(() => {
    const byDay = new Map<string, { day: string; booked: number; capacity: number }>();
    for (const s of upcoming) {
      const k = dayKey(str(s.starts_at));
      const row = byDay.get(k) ?? { day: dayLabel(str(s.starts_at)), booked: 0, capacity: 0 };
      row.booked += num(s.booked);
      row.capacity += num(s.capacity);
      byDay.set(k, row);
    }
    return [...byDay.values()].slice(0, 7);
  }, [upcoming]);

  async function mark(id: string, to: "attended" | "no_show") {
    if (!app) return;
    setError("");
    try {
      await app.transition("booking", id, "status", to);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-muted-foreground">
          {firstDay ? `${dayLabel(str(today[0]?.starts_at))}: ${today.length} classes` : "No classes scheduled."}
        </p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Mats booked, next 7 days</h2>
        <div style={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart}>
              <XAxis dataKey="day" tickLine={false} axisLine={false} />
              <YAxis allowDecimals={false} width={28} tickLine={false} axisLine={false} />
              <Tooltip />
              <Bar dataKey="capacity" name="Mats" fill="hsl(var(--muted))" radius={4} />
              <Bar dataKey="booked" name="Booked" fill="hsl(var(--primary))" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {today.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-muted-foreground">Add classes from the Classes page.</p>
        )}
        {today.map((s) => {
          const roster = bookings.filter((b) => str(b.session_id) === str(s.id) && str(b.status) !== "cancelled");
          return (
            <section key={str(s.id)} className="rounded-2xl border border-border bg-card p-4">
              <div className="mb-3 flex items-baseline justify-between">
                <h3 className="font-semibold text-foreground">{timeLabel(str(s.starts_at))} {str(s.title)}</h3>
                <span className="text-sm text-muted-foreground">{num(s.booked)}/{num(s.capacity)}</span>
              </div>
              {roster.length === 0 && <p className="text-sm text-muted-foreground">No one booked yet.</p>}
              <ul className="space-y-2">
                {roster.map((b) => (
                  <li key={str(b.id)} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-foreground">{memberName(b.member_id)}</span>
                    {str(b.status) === "booked" ? (
                      <span className="flex shrink-0 gap-1 whitespace-nowrap">
                        <button onClick={() => void mark(str(b.id), "attended")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 hover:bg-muted">
                          <UserCheck className="h-3.5 w-3.5" /> Here
                        </button>
                        <button onClick={() => void mark(str(b.id), "no_show")} className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-muted-foreground hover:bg-muted">
                          <XCircle className="h-3.5 w-3.5" /> No-show
                        </button>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5" /> {str(b.status).replace("_", " ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
