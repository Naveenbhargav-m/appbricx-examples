#!/usr/bin/env bash
# Build and render several already-recorded showcase demos one after another.
#   scripts/render-lane.sh tablefor stride ...
cd "$(dirname "$0")/.."
for a in "$@"; do
  scripts/make-video.sh "$a" showcase-demo "vars/$a.json" --skip-record > "logs/render-$a.log" 2>&1 && echo "ok $a" || echo "FAIL $a"
done
