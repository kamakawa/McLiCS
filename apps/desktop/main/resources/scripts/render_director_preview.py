#!/usr/bin/env python3
import csv
import math
import os
import sys
from collections import defaultdict

import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib.tri import Triangulation

Scritico = 0.65  # ✔ fixo como seu orientador pediu


def read_rows(csv_path):
    with open(csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = []

        for row in reader:
            try:
                rows.append({
                    "x": float(row["x"]),
                    "y": float(row["y"]),
                    "z": float(row["z"]),
                    "nx": float(row["nx"]),
                    "ny": float(row["ny"]),
                    "nz": float(row["nz"]),
                    "S": float(row.get("S", 0.0)),
                })
            except:
                continue

    if not rows:
        raise RuntimeError("CSV vazio ou inválido")

    return rows


def median(vals):
    vals = sorted(vals)
    return vals[len(vals)//2]


def choose_plane(rows, plane):
    if plane == "x":
        return "y", "z", "ny", "nz", "x"
    if plane == "y":
        return "x", "z", "nx", "nz", "y"
    return "x", "y", "nx", "ny", "z"


def slice_rows(rows, axis):
    target = median([r[axis] for r in rows])
    return [r for r in rows if abs(r[axis] - target) < 1e-5]


def build_segments(rows, hx, hy, vx, vy):
    segs = []
    for r in rows:
        ux, uy = r[vx], r[vy]
        n = math.hypot(ux, uy)
        if n < 1e-12:
            continue
        ux /= n
        uy /= n

        L = 0.5
        segs.append([
            (r[hx] - L*ux, r[hy] - L*uy),
            (r[hx] + L*ux, r[hy] + L*uy),
        ])
    return segs


def main():
    if len(sys.argv) < 3:
        print("uso: script input.csv output.png [plane]")
        sys.exit(1)

    input_csv = sys.argv[1]
    output_png = sys.argv[2]
    plane = sys.argv[3] if len(sys.argv) >= 4 else "z"

    rows = read_rows(input_csv)

    hx, hy, vx, vy, axis = choose_plane(rows, plane)
    rows = slice_rows(rows, axis)

    X = np.array([r[hx] for r in rows])
    Y = np.array([r[hy] for r in rows])
    S = np.array([r["S"] for r in rows])

    tri = Triangulation(X, Y)

    # ===== MAPA DE DEFEITOS =====
    mask = S < Scritico

    fig, ax = plt.subplots(figsize=(6, 5), dpi=150)

    Z = np.where(S < Scritico, 0, 1)

    ax.tricontourf(
        tri,
        Z,
        levels=[-0.5, 0.5, 1.5],
        colors=["red", "white"]
    )

    # diretores
    segs = build_segments(rows, hx, hy, vx, vy)
    ax.add_collection(LineCollection(segs, colors="black", linewidths=0.4))

    ax.set_aspect("equal")
    ax.set_xticks([])
    ax.set_yticks([])

    os.makedirs(os.path.dirname(output_png), exist_ok=True)
    plt.savefig(output_png, bbox_inches="tight")
    plt.close()


if __name__ == "__main__":
    main()