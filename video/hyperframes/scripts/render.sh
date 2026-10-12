#!/usr/bin/env bash
# Render any built HyperFrames project to a web-friendly MP4 plus a poster.
#   scripts/render.sh <projectDir> <out.mp4> [variables.json] [posterAt=2]
set -euo pipefail
cd "$(dirname "$0")/.."
export HYPERFRAMES_BROWSER_PATH=${HYPERFRAMES_BROWSER_PATH:-/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell}
export HYPERFRAMES_NO_UPDATE_CHECK=1 HYPERFRAMES_NO_TELEMETRY=1 HYPERFRAMES_SKIP_SKILLS=1
P=$1; OUT=$2; VARS=${3:-}; AT=${4:-2}
ARGS=(--output "$OUT" --fps 30 --crf ${CRF:-23} --video-frame-format png --quiet)
[[ -n $VARS ]] && ARGS+=(--variables-file "$VARS")
npx hyperframes render "$P" "${ARGS[@]}"
ffmpeg -v error -y -ss "$AT" -i "$OUT" -frames:v 1 "${OUT%.mp4}-poster.png"
ffprobe -v error -show_entries format=duration,size -of compact "$OUT"
