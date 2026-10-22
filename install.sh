#!/bin/sh
# VDF installer — Linux / macOS (BSD-compatible sh)
# Copies the right vdf binary into a bin directory on your PATH.
# usage: ./install.sh [prefix]     (default prefix: ~/.local)
set -e

HERE=$(cd "$(dirname "$0")" && pwd)

OS=$(uname -s)
ARCH=$(uname -m)

case "$OS" in
  Linux) OSDIR=linux ;;
  Darwin) OSDIR=macos ;;
  *) echo "unsupported OS: $OS (use install.ps1 on Windows)"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) CPU=x86_64 ;;
  aarch64|arm64) CPU=aarch64 ;;
  armv7l|armv6l) CPU=armv7 ;;
  *) echo "unsupported CPU: $ARCH"; exit 1 ;;
esac

SRC="$HERE/binaries/$OSDIR/$CPU/vdf"
if [ ! -f "$SRC" ]; then
  echo "binary not found: $SRC"
  echo "available:"; ls "$HERE/binaries/$OSDIR" 2>/dev/null
  exit 1
fi

PREFIX="${1:-$HOME/.local}"
BINDIR="$PREFIX/bin"
mkdir -p "$BINDIR"
cp "$SRC" "$BINDIR/vdf"
chmod +x "$BINDIR/vdf"

echo "installed: $BINDIR/vdf"
case ":$PATH:" in
  *":$BINDIR:"*) ;;
  *) echo "note: add $BINDIR to your PATH:"
     echo "  echo 'export PATH=\"$BINDIR:\$PATH\"' >> ~/.profile && . ~/.profile" ;;
esac

"$BINDIR/vdf" --version
echo "try:  vdf doc"
