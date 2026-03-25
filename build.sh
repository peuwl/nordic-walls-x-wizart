#!/usr/bin/env bash
# Build script for Nordic Walls x WizArt
# Produces: dist/Nordic Walls x WizArt.dmg
set -e
cd "$(dirname "$0")"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║     Nordic Walls x WizArt — Build Script        ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

# ── 1. Python dependencies ────────────────────────────────────────────────────
echo "── Step 1: Installing Python dependencies ──────────────"
python3 -m pip install --quiet pyinstaller pillow requests openpyxl
echo "  ✔ Dependencies installed"

# ── 2. PyInstaller — bundle Python script + templates ─────────────────────────
echo ""
echo "── Step 2: Building Python binary ──────────────────────"
rm -rf dist-python
APP_DIR="$(pwd)"
python3 -m PyInstaller \
  --onefile \
  --name run_import \
  --distpath "${APP_DIR}/dist-python" \
  --workpath /tmp/pyinstaller-work-nw \
  --specpath /tmp/pyinstaller-spec-nw \
  --add-data "${APP_DIR}/templates:templates" \
  "${APP_DIR}/python/run_import.py"
echo "  ✔ Binary ready: dist-python/run_import"

# ── 3. npm install ────────────────────────────────────────────────────────────
echo ""
echo "── Step 3: Installing npm dependencies ─────────────────"
npm install --quiet
echo "  ✔ npm dependencies installed"

# ── 4. electron-builder ───────────────────────────────────────────────────────
echo ""
echo "── Step 4: Packaging Electron app ──────────────────────"
npm run build:mac
echo "  ✔ App built"

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  Done! Your app is ready in:                     ║"
echo "║  app/dist/                                       ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""
ls dist/
