#!/usr/bin/env bash
# Download the atlas the body map is rendered from (ADR-0060): Z-Anatomy's
# muscular system and body regions, CC BY-SA 4.0, at a pinned commit.
# The files (about 42 MB) go to .cache/body-map/, which git ignores.
set -euo pipefail

REPO=https://github.com/LluisV/Z-Anatomy
COMMIT=6c7f9016bd5899ac8edafd31b9900c151df42ed6 # the PC-Version branch's head, 2 November 2026
FILES=("MuscularSystem100.fbx" "Regions of human body100.fbx")
DEST="$(git rev-parse --show-toplevel)/.cache/body-map"

mkdir -p "$DEST"
if [ -f "$DEST/${FILES[0]}" ] && [ -f "$DEST/${FILES[1]}" ]; then
  echo "Already in $DEST"
  exit 0
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
git -C "$TMP" init -q
git -C "$TMP" remote add origin "$REPO"
git -C "$TMP" fetch -q --depth 1 --filter=blob:none origin "$COMMIT"
for f in "${FILES[@]}"; do
  git -C "$TMP" show "$COMMIT:Resources/Models/FBX/$f" >"$DEST/$f"
done
echo "Atlas in $DEST"
