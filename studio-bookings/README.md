# Studio Bookings (Stillwater)

A booking app for a small yoga and pilates studio, built on Appbricx. It is the
app from the tutorial [Build a booking app with Claude Code](https://appbricx.com/docs/tutorials/booking-app),
and it runs live at **https://example-bookings.apps.appbricx.com**.

Try it with the demo sign-ins (the data resets every night):

| Role | Email | Password |
|---|---|---|
| Member | `ana@stillwater.test` | `falcon-iris-ivory-64` |
| Instructor | `ines@stillwater.test` | `autumn-coral-lemon-98` |

Or use **Continue with Google** to sign up as a new member.

## What it shows

| Feature | Where |
|---|---|
| Tables, refs, enums, seed data | `entities` and `seeds` in `app.json` |
| Two roles: members book, instructors run the studio | `personas` |
| Row access: members see only their own bookings and profile | `access` on `member` and `booking` |
| Business rules enforced on every write (a full class can't be booked) | `rules` on `booking` and `session` |
| No double booking | `unique: [["member_id", "session_id"]]` on `booking` |
| Custom React screens | `components/ClassSchedule.tsx`, `MyBookings.tsx`, `StudioDesk.tsx` |
| A chart (recharts) and realtime updates (`app.live`) | `StudioDesk.tsx` |
| A server function calling a third-party API | `functions/class-forecast.ts`, called with `app.call("class-forecast")` |
| AI inside the app (`app.ai.ask`) with a fallback | the "Not sure what to take?" box in `ClassSchedule.tsx` |
| Workflows on data changes and on a schedule | `workflows`: `count-booking`, `free-mat-on-cancel`, `morning-digest` |
| Sign in with Google, no Google Cloud setup | `"auth": { "google": true }` |
| Brand colour and theme | `app.brand_color`, `app.theme` |

## Files

```
app.json                  the contract: what Appbricx builds (component sources inlined)
components/*.tsx          the custom screens, the same code as in app.json
functions/class-forecast.ts  the server function body (TypeScript-checked on apply)
build.mjs                 copies components/ and functions/ into app.json
.mcp.json                 connects Claude Code (or any MCP client) to Appbricx
```

A component's source lives inside the contract, because that is what the
platform builds. Edit the `.tsx` file, run `node build.mjs`, then apply.

## Use it with the CLI

The CLI is not on npm yet. Install it from this repo:

```sh
git clone https://github.com/Naveenbhargav-m/appbricx-examples
cd appbricx-examples/cli && npm link

cd ../studio-bookings
appbricx login                         # opens your browser, click Authorize
appbricx create "Studio Bookings"      # or: appbricx link <project-id>
appbricx check app.json                # report only, nothing changes
appbricx apply app.json                # builds the dev preview, prints demo sign-ins
appbricx verify                        # every role, every table, every page
appbricx deploy --subdomain my-studio  # publishes to https://my-studio.apps.appbricx.com
```

For the forecast to work nothing extra is needed (Open-Meteo has no key). AI
answers need AI turned on for the project (plan credits or your own key).

## Use it with Claude Code

Copy `.mcp.json` into your project folder (or run
`claude mcp add --transport http appbricx https://appbricx.com/api/mcp`), start
`claude`, run `/mcp`, choose **appbricx** and **Authenticate**. Then ask:

> Create a new Appbricx project called "Studio Bookings" and apply the contract
> in studio-bookings/app.json. Verify it, fix anything red, and deploy
> it with the subdomain my-studio.

Then change it in plain words, for example: "Add a waitlist: when a class is
full, members can join the waitlist and get a notification when a mat frees up."

## Make it yours

- Rename the studio: `app.name`, `app.tagline`, `app.brand_color`.
- Change the time zone: `TZ` at the top of each component, and `tz` on `morning-digest`.
- Change the forecast location: the latitude and longitude in `functions/class-forecast.ts`.
- Charge for classes: see [Payments](https://appbricx.com/docs/guides/payments).
