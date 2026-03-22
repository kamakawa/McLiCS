#!/usr/bin/env bash
set -e

echo "===== BUILD BACKEND (LINUX RELEASE) ====="

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
OUT_DIR="$ROOT_DIR/dist/linux-x64"

echo "Cleaning output..."
rm -rf "$OUT_DIR"
mkdir -p "$OUT_DIR"

echo "Compiling CPU..."
make -C "$ROOT_DIR" CPU

echo "Compiling GPU..."
make -C "$ROOT_DIR"

CPU_BIN="$ROOT_DIR/mc_sim_cpu"
GPU_BIN="$ROOT_DIR/mc_sim"

if [[ ! -f "$CPU_BIN" ]]; then
  echo "ERROR: CPU binary not found at $CPU_BIN"
  exit 1
fi

if [[ ! -f "$GPU_BIN" ]]; then
  echo "ERROR: GPU binary not found at $GPU_BIN"
  exit 1
fi

echo "Copying executables..."
cp "$CPU_BIN" "$OUT_DIR/"
cp "$GPU_BIN" "$OUT_DIR/"

chmod +x "$OUT_DIR/mc_sim"
chmod +x "$OUT_DIR/mc_sim_cpu"

echo "===== DONE ====="
echo "Output:"
ls -lh "$OUT_DIR"