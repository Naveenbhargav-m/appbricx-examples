# Appbricx marketing kit (HyperFrames)

Video and slide templates for Appbricx marketing, plus the scripts that record real product
footage and turn it into videos. Rendered outputs live in `apps/web/public/videos/`.

Setup, from this folder:

```bash
npm install                      # hyperframes 0.8.149 and playwright-core 1.56.1
npx hyperframes telemetry disable
```

Not in the repo (see `.gitignore`): recordings (`clips/`), builds (`out/`), condensed sessions
(`sessions/`) and signed-in browser sessions (`.auth/`). `storyboards/learnly.json` points at the
original Claude Code stream-json transcript, which is not checked in; pass any other session
log to make a new build story. The demo logins in `scripts/scenarios/` are the public ones listed
on appbricx.com/showcase.

Reusable compositions for Appbricx marketing videos and slides. Each one is a plain HTML
HyperFrames composition at 1280x720 (slides at 1920x1080). Copy and theme come from
HyperFrames variables, and footage and timing come from data.

The one rule: **use real footage only.** Record the real product, cut dead time instead of
faking it, and label what you did ("waits trimmed", "real session, condensed", "2x").

## What is in the kit (folders under `templates/`)

| Folder | What it makes | Variables (main ones) | Filled by |
| - | - | - | - |
| `shared/` | Brand tokens (`brand.css`: emerald on dark and light), Schibsted Grotesk and JetBrains Mono (woff2), `logo-mark.svg`, vendored GSAP | `theme` (dark or light) on every template | copied into each project as `assets/` |
| `title-card/` | 4 s title card | `eyebrow`, `title`, `subtitle` | `scripts/make-block.sh` |
| `end-card/` | 5 s end card | `endHeadline`, `ctaUrl`, `endNote` | `scripts/make-block.sh` |
| `feature-scene/` | 7 s scene: chapter label, heading, three goodies, a real clip in a window | `kicker`, `label`, `heading`, `good1`-`good3`, `badge` | `scripts/make-block.sh --clip` |
| `showcase-demo/` | App demo: title card, recorded browser session with captions, end card (20 to 45 s) | `title`, `subtitle`, `appUrl`, `badge`, `endHeadline`, `ctaUrl`, `endNote` | `scripts/build.mjs` from a recording's `cues.json` |
| `reel/` | Montage of short shots from many recordings, with an app chip and address per app | `eyebrow`, `title`, `subtitle`, `badge`, end card copy | `scripts/build-reel.mjs` from a picks file |
| `build-story/` | Terminal replay of a real coding-agent session (step rail, tool calls, real outputs, the session's own screenshots), then the live app | `title`, `subtitle`, `badge`, `step1`-`step6`, `liveHeading`, `appUrl` | `scripts/extract-session.py` + `scripts/build-story.mjs` |
| `explainer/` | 56 s explainer: hook, what it is, five chapters with footage, quick cuts, end card | `hook1`, `hook2`, `what*`, `c1h`-`c5h`, `c1g`-`c5g` (goodies as "a · b · c"), `cutsTitle`, end card copy | `scripts/build-explainer.mjs` from a footage config |
| `deck/` | 1920x1080 HTML slides (hero, statement, flow, grid, shots, checks, pricing, CTA layouts) | edit the HTML; images in `deck/assets/img/` | `scripts/export-deck.mjs` (PDF and PNGs) |

## Make a demo video for any app: record, fill variables, render

You need Node 22, `npm install` in this folder (hyperframes and playwright-core), the
Playwright Chromium in `/opt/pw-browsers` (do not run `playwright install`) and system ffmpeg.

```bash
export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export HYPERFRAMES_BROWSER_PATH=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
export HYPERFRAMES_NO_TELEMETRY=1          # also run: npx hyperframes telemetry disable
```

1. **Record a scenario.** Copy `scripts/scenarios/kanbo.mjs` to `scripts/scenarios/myapp.mjs`.
   A scenario is about 30 lines:
   - `signIn(page, s, email, password)` from `_lib.mjs` shows the app's own sign-in screen,
     types the demo login and cuts the loading wait;
   - `s.cue('caption')` starts a caption, `s.click`, `s.type`, `s.scrollTo`, `s.pause` drive a
     visible cursor;
   - `s.keep()` / `s.cut()` bracket the footage you keep;
   - `await s.ai('button:has-text("Suggest reply")')` presses an in-app AI button, keeps the
     click and a moment of the loading state, cuts the wait, and re-asks off camera if the
     answer comes back empty. Use `{ optional: true }` with `s.mark()` / `s.rewind(t)` to drop
     the step entirely when the AI is down, rather than showing a fallback.

   Then run `node scripts/record.mjs myapp`. You get `clips/myapp.mp4` (H.264, CRF 18) and
   `clips/myapp.cues.json` (kept segments and captions on the same clock).
   For a signed-in builder session, run `scripts/login.mjs` once and record with
   `STORAGE_STATE=.auth/builder.json` (never type a password on screen).
2. **Fill variables.** Copy `vars/kanbo.json` to `vars/myapp.json` and set `title`,
   `subtitle`, `appUrl` and the end card copy.
3. **Render.** `scripts/make-video.sh myapp showcase-demo vars/myapp.json --skip-record`
   writes `out/myapp-demo.mp4` and a poster. Drop `--skip-record` to record and render in one go.

Re-render with different copy or theme without re-recording:
`npx hyperframes render out/myapp-demo --variables '{"theme":"light"}' --output out/myapp-light.mp4`.
Use `npx hyperframes preview out/myapp-demo` to tweak timing in the Studio.

## The other builders

```bash
# Montage from many recordings (each shot is found by its caption text)
node scripts/build-reel.mjs --picks reels/showcase.json --out out/showcase-reel
scripts/render.sh out/showcase-reel out/showcase-reel.mp4 vars/reel.json

# Live building: condense a real stream-json session, then add the live app
python3 -I scripts/extract-session.py storyboards/learnly.json sessions/learnly
node scripts/build-story.mjs --session sessions/learnly --clip clips/learnly.cues.json --out out/learnly-build
scripts/render.sh out/learnly-build out/learnly-build.mp4

# Explainer with real footage in each chapter
node scripts/build-explainer.mjs --config explainers/main.json --out out/explainer
scripts/render.sh out/explainer out/explainer.mp4

# One block on its own
scripts/make-block.sh feature-scene out/feature.mp4 vars/feature.json --clip clips/builder.mp4 --from 62

# Slides to PDF and PNGs
node scripts/export-deck.mjs templates/deck/deck.html out/deck
```

A storyboard (`storyboards/*.json`) picks which real tool calls to show by their order in the
transcript (`{"use": 16}`), collapses runs (`{"uses": [3, 14]}`), quotes the agent
(`{"say": 15}`), saves a screenshot result (`"shot": true`) and marks the step rail
(`"chapter": 1-6`). Every line on screen comes from the transcript, shortened.

## Delivery defaults

- 1280x720, 30 fps, H.264 at CRF 23 with `--video-frame-format png` (crisp UI). That is
  about 40 to 60 KB per second, so a 60 s video is about 3 to 4 MB.
- Poster: a frame of the title card (`scripts/render.sh ... <posterAt>`); convert to WebP with
  `ffmpeg -i poster.png -c:v libwebp -quality 82 poster.webp`.
- Lint warnings about sub-compositions and repeated media are expected and do not affect renders.
