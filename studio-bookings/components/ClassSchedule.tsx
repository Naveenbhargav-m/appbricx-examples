import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Clock, Sun, Sparkles, Users, Check } from "lucide-react";
import { Markdown } from "@app/kit/primitives";
import type { AppHandle } from "@app/kit/primitives";

type ClassScheduleProps = { title?: string; app?: AppHandle };
type Forecast = { tempC: number | null; rainChance: number | null; summary: string };

const TZ = "Europe/Lisbon";
const FALLBACK = "Our class finder is resting right now. **Long Yin** or **Breathwork for Sleep** are good places to start.";
const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
const dayKey = (iso: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));
const dayLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, weekday: "short", day: "numeric" }).format(new Date(iso));
const timeLabel = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

export default function ClassSchedule({ title = "This week at Stillwater", app }: ClassScheduleProps) {
  const [now, setNow] = useState(0);
  const [day, setDay] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [forecasts, setForecasts] = useState<Record<string, Forecast | string>>({});
  const [feeling, setFeeling] = useState("");
  const [advice, setAdvice] = useState("");
  const [thinking, setThinking] = useState(false);

  useEffect(() => setNow(Date.now()), []);
  useEffect(() => (app ? app.live("session") : undefined), [app]);

  const sessions = app?.rows("session") ?? [];
  const instructors = app?.rows("instructor") ?? [];
  const bookings = app?.rows("booking") ?? [];
  const meId = app?.me("member");

  const upcoming = useMemo(
    () =>
      sessions
        .filter((s) => new Date(str(s.starts_at)).getTime() > now)
        .sort((a, b) => str(a.starts_at).localeCompare(str(b.starts_at))),
    [sessions, now],
  );
  const days = useMemo(() => {
    const seen = new Map<string, string>();
    for (const s of upcoming) seen.set(dayKey(str(s.starts_at)), dayLabel(str(s.starts_at)));
    return [...seen.entries()].slice(0, 7);
  }, [upcoming]);
  const activeDay = day || (days[0]?.[0] ?? "");
  const shown = upcoming.filter((s) => dayKey(str(s.starts_at)) === activeDay);
  const teacher = (id: unknown) => str(instructors.find((i) => str(i.id) === str(id))?.name);
  const myBooking = (sessionId: unknown) =>
    bookings.find((b) => str(b.session_id) === str(sessionId) && str(b.status) === "booked");

  async function book(sessionId: string) {
    if (!app) return;
    setBusy(sessionId);
    setError("");
    try {
      await app.create("booking", { session_id: sessionId, member_id: meId, status: "booked" });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy("");
    }
  }

  async function forecast(sessionId: string) {
    if (!app) return;
    setForecasts((f) => ({ ...f, [sessionId]: "Checking the sky..." }));
    try {
      const f = await app.call<Forecast>("class-forecast", { session_id: sessionId });
      setForecasts((all) => ({ ...all, [sessionId]: f }));
    } catch (e) {
      setForecasts((all) => ({ ...all, [sessionId]: e instanceof Error ? e.message : String(e) }));
    }
  }

  async function suggest() {
    if (!app || !feeling.trim()) return;
    setThinking(true);
    setAdvice("");
    const list = upcoming
      .slice(0, 20)
      .map((s) => `- ${str(s.title)} (${str(s.style)}, ${str(s.level)}, ${num(s.duration_min)} min) on ${dayLabel(str(s.starts_at))} at ${timeLabel(str(s.starts_at))}`)
      .join("\n");
    try {
      const answer = await app.ai.ask(`How I feel today: ${feeling}\n\nClasses this week:\n${list}`, {
        system: "You are the front desk at a small yoga and pilates studio. Recommend ONE class from the list and say why in two short sentences. Use markdown bold for the class name. Never invent classes.",
        maxTokens: 600,
      });
      setAdvice(answer.trim() || FALLBACK);
    } catch {
      setAdvice(FALLBACK);
    } finally {
      setThinking(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
        <p className="text-muted-foreground">Pick a day, book a mat. Cancel up to the start of class.</p>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void suggest(); }}>
          <label htmlFor="feeling" className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Not sure what to take?
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id="feeling"
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              placeholder="Stiff back after a long week, 45 minutes free"
              className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground"
            />
            <button type="submit" disabled={thinking || !feeling.trim()} className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">
              {thinking ? "Thinking..." : "Suggest a class"}
            </button>
          </div>
          {advice && <div className="rounded-xl bg-muted p-3 text-sm"><Markdown text={advice} size="sm" /></div>}
        </form>
      </section>

      <nav aria-label="Days" className="flex gap-2 overflow-x-auto pb-1">
        {days.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setDay(key)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm ${key === activeDay ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground"}`}
          >
            {label}
          </button>
        ))}
      </nav>

      {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <ul className="space-y-3">
        {shown.length === 0 && (
          <li className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            No classes on the schedule yet. New weeks open every Sunday.
          </li>
        )}
        {shown.map((s) => {
          const id = str(s.id);
          const left = Math.max(0, num(s.capacity) - num(s.booked));
          const mine = myBooking(id);
          const f = forecasts[id];
          return (
            <motion.li key={id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> {timeLabel(str(s.starts_at))} · {num(s.duration_min)} min · {str(s.room)}
                  </p>
                  <h2 className="text-lg font-semibold text-foreground">{str(s.title)}</h2>
                  <p className="text-sm text-muted-foreground">
                    with {teacher(s.instructor_id) || "a guest teacher"} · {str(s.level)}
                  </p>
                </div>
                {mine ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                    <Check className="h-4 w-4" /> Booked
                  </span>
                ) : (
                  <button
                    onClick={() => void book(id)}
                    disabled={left === 0 || busy === id}
                    className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                  >
                    {left === 0 ? "Full" : busy === id ? "Booking..." : "Book"}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> {left} of {num(s.capacity)} mats left</span>
                {s.outdoor === true && (
                  <button onClick={() => void forecast(id)} className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline">
                    <Sun className="h-3.5 w-3.5" /> Garden class: check the forecast
                  </button>
                )}
              </div>
              {f && (
                <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                  {typeof f === "string" ? f : `${f.summary}${f.tempC != null ? `, ${Math.round(f.tempC)}°C` : ""}${f.rainChance != null ? `, ${f.rainChance}% chance of rain` : ""}`}
                </p>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
