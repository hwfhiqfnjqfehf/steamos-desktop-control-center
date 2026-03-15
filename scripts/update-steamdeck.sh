#!/usr/bin/env bash

set -euo pipefail

APP_DIR="${APP_DIR:-$HOME/.local/share/steamos-desktop-control-center/app}"

if [ ! -d "$APP_DIR/.git" ]; then
  echo "No existing installation found at $APP_DIR"
  exit 1
fi

cd "$APP_DIR"
git fetch --all --tags
git checkout main
git pull --ff-only origin main
npm install

echo "SteamOS Control Center updated."
