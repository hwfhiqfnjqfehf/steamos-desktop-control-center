#!/usr/bin/env bash

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/hwfhiqfnjqfehf/steamos-desktop-control-center.git}"
INSTALL_ROOT="${INSTALL_ROOT:-$HOME/.local/share/steamos-desktop-control-center}"
APP_DIR="$INSTALL_ROOT/app"
BIN_DIR="${HOME}/.local/bin"
DESKTOP_DIR="${HOME}/.local/share/applications"
LAUNCHER_NAME="steamos-control-center"

echo "==> SteamOS Control Center installer"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required but was not found."
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "node is required but was not found."
  echo "On Steam Deck desktop mode you can install it with your preferred package workflow."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found."
  exit 1
fi

mkdir -p "$INSTALL_ROOT" "$BIN_DIR" "$DESKTOP_DIR"

if [ -d "$APP_DIR/.git" ]; then
  echo "==> Updating existing checkout"
  git -C "$APP_DIR" fetch --all --tags
  git -C "$APP_DIR" checkout main
  git -C "$APP_DIR" pull --ff-only origin main
else
  echo "==> Cloning repository"
  git clone "$REPO_URL" "$APP_DIR"
fi

echo "==> Installing app dependencies"
cd "$APP_DIR"
npm install

cat >"$BIN_DIR/$LAUNCHER_NAME" <<EOF
#!/usr/bin/env bash
cd "$APP_DIR"
exec npm run dev
EOF
chmod +x "$BIN_DIR/$LAUNCHER_NAME"

cat >"$DESKTOP_DIR/io.steamos.controlcenter.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=SteamOS Control Center
Comment=Steam Deck maintenance console
Exec=$BIN_DIR/$LAUNCHER_NAME
Terminal=false
Categories=System;Utility;
StartupNotify=true
EOF

echo "==> Installed successfully"
echo "Launcher: $BIN_DIR/$LAUNCHER_NAME"
echo "Desktop entry: $DESKTOP_DIR/io.steamos.controlcenter.desktop"
