// Server function "class-forecast": the body of async (ctx, input, user) => { ... }, TypeScript-checked on apply.
// Called from ClassSchedule with app.call("class-forecast", { session_id }).
// Runs on the server, so it may fetch a third-party API (Open-Meteo, no key).
const id = String(input.session_id ?? "");
if (!id) throw new Error("Which class? Send a session_id.");
const session = await ctx.db.get("session", id);
if (!session) throw new Error("That class isn't on the schedule.");
const starts = new Date(String(session.starts_at));
const hour = starts.toISOString().slice(0, 13) + ":00";
const day = hour.slice(0, 10);
const url = "https://api.open-meteo.com/v1/forecast?latitude=38.7223&longitude=-9.1393"
  + "&hourly=temperature_2m,precipitation_probability,weather_code&timezone=UTC"
  + `&start_date=${day}&end_date=${day}`;
const res = await ctx.http.fetch(url);
if (!res.ok) throw new Error(`The forecast service answered ${res.status}. Try again later.`);
const data = res.json<{ hourly?: { time?: string[]; temperature_2m?: number[]; precipitation_probability?: number[]; weather_code?: number[] } }>();
const h = data?.hourly;
const i = h?.time ? h.time.indexOf(hour) : -1;
if (!h || i < 0) return { tempC: null, rainChance: null, summary: "No forecast yet. Check again closer to the day" };
const code = h.weather_code?.[i] ?? 0;
const summary = code === 0 ? "Clear sky" : code <= 3 ? "Some cloud" : code <= 48 ? "Foggy" : code <= 67 ? "Rain likely" : code <= 77 ? "Snow" : code <= 82 ? "Showers" : "Storms";
ctx.log(`forecast for ${String(session.title)} at ${hour}: ${summary}`);
return { tempC: h.temperature_2m?.[i] ?? null, rainChance: h.precipitation_probability?.[i] ?? null, summary };
