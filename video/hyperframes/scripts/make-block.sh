#!/usr/bin/env bash
# Render one standalone block (title-card, end-card or feature-scene) with variables.
#   scripts/make-block.sh <block> <out.mp4> [variables.json] [--clip file.mp4 --from seconds]
set -euo pipefail
cd "$(dirname "$0")/.."
B=$1; OUT=$2; shift 2; VARS=""; CLIP=""; FROM=0
while [[ $# -gt 0 ]]; do case $1 in --clip) CLIP=$2; shift 2;; --from) FROM=$2; shift 2;; *) VARS=$1; shift;; esac; done
P=out/block-$B; rm -rf "$P"; cp -r "templates/$B" "$P"; cp -r templates/shared "$P/assets"
if [[ -n $CLIP ]]; then mkdir -p "$P/assets/clips"; cp "$CLIP" "$P/assets/clips/feature.mp4"; sed -i "s/data-media-start=\"0\"/data-media-start=\"$FROM\"/" "$P/index.html"; fi
scripts/render.sh "$P" "$OUT" "$VARS" 1
