#!/usr/bin/env bash
# One command: record a scenario, build the HyperFrames project, render MP4 + poster.
#
#   scripts/make-video.sh <scenario> [template] [variables.json] [--skip-record]
#
#   scripts/make-video.sh kanbo                      # out/kanbo-demo.mp4 + out/kanbo-demo-poster.png
#   scripts/make-video.sh kanbo showcase-demo vars/kanbo-light.json
set -euo pipefail
cd "$(dirname "$0")/.."

SKIP_RECORD=0; POS=()
for a in "$@"; do if [[ $a == --skip-record ]]; then SKIP_RECORD=1; else POS+=("$a"); fi; done
SCENARIO=${POS[0]:?usage: make-video.sh <scenario> [template] [variables.json] [--skip-record]}
TEMPLATE=${POS[1]:-showcase-demo}
VARS=${POS[2]:-}

export PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers
export HYPERFRAMES_BROWSER_PATH=${HYPERFRAMES_BROWSER_PATH:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}
export HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1

NAME="$SCENARIO-demo"
PROJECT="out/$NAME"
POSTER_AT=${POSTER_AT:-1.8}

[[ $SKIP_RECORD == 1 ]] || node scripts/record.mjs "$SCENARIO" clips
node scripts/build.mjs --template "$TEMPLATE" --clip "clips/$SCENARIO.cues.json" --out "$PROJECT"
npx hyperframes lint "$PROJECT" | tail -1

RENDER_ARGS=(--output "out/$NAME.mp4" --fps 30 --crf 23 --video-frame-format png --quiet)
[[ -n $VARS ]] && RENDER_ARGS+=(--variables-file "$VARS" --strict-variables)
npx hyperframes render "$PROJECT" "${RENDER_ARGS[@]}"

ffmpeg -v error -y -ss "$POSTER_AT" -i "out/$NAME.mp4" -frames:v 1 "out/$NAME-poster.png"
ffprobe -v error -show_entries stream=codec_name,width,height:format=duration,size -of compact "out/$NAME.mp4"
echo "done: out/$NAME.mp4  out/$NAME-poster.png"
