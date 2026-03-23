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

matplotlib.rcParams["font.family"] = "sans-serif"
matplotlib.rcParams["font.sans-serif"] = [
    "Noto Sans CJK JP",
    "Noto Sans CJK SC",
    "Noto Sans JP",
    "Noto Sans SC",
    "DejaVu Sans",
    "Arial Unicode MS",
]
matplotlib.rcParams["axes.unicode_minus"] = False

def norm_key(s: str) -> str:
    return "".join(ch.lower() for ch in str(s).strip() if ch.isalnum())


def normalize_lang(lang: str) -> str:
    raw = str(lang or "en").lower()
    if raw.startswith("pt"):
        return "pt"
    if raw.startswith("es"):
        return "es"
    if raw.startswith("fr"):
        return "fr"
    if raw.startswith("ja"):
        return "ja"
    if raw.startswith("zh"):
        return "zh"
    return "en"


def tr(lang: str):
    l = normalize_lang(lang)
    data = {
        "pt": {
            "title": "Parâmetro de ordem S",
            "cbar": "Parâmetro de ordem S",
        },
        "en": {
            "title": "Order parameter S",
            "cbar": "Order parameter S",
        },
        "es": {
            "title": "Parámetro de orden S",
            "cbar": "Parámetro de orden S",
        },
        "fr": {
            "title": "Paramètre d’ordre S",
            "cbar": "Paramètre d’ordre S",
        },
        "ja": {
            "title": "秩序パラメータ S",
            "cbar": "秩序パラメータ S",
        },
        "zh": {
            "title": "序参量 S",
            "cbar": "序参量 S",
        },
    }
    return data.get(l, data["en"])


def read_rows(csv_path):
    with open(csv_path, "r", newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        raw_headers = reader.fieldnames or []
        idx = {norm_key(h): h for h in raw_headers}

        required = ["x", "y", "z", "nx", "ny", "nz"]
        for key in required:
            if key not in idx:
                raise RuntimeError(f"Missing required column: {key}")

        s_key = idx.get("s")
        pt_key = idx.get("pt")

        rows = []
        for row in reader:
            try:
                x = float(row[idx["x"]])
                y = float(row[idx["y"]])
                z = float(row[idx["z"]])
                nx = float(row[idx["nx"]])
                ny = float(row[idx["ny"]])
                nz = float(row[idx["nz"]])
                S = float(row[s_key]) if s_key else 0.0
                pt = float(row[pt_key]) if pt_key else 2.0
            except Exception:
                continue

            if not (1.0 <= pt <= 3.0):
                continue

            rows.append(
                {
                    "x": x,
                    "y": y,
                    "z": z,
                    "nx": nx,
                    "ny": ny,
                    "nz": nz,
                    "S": S,
                    "pt": pt,
                }
            )

    if not rows:
        raise RuntimeError("No valid rows found in CSV.")

    return rows


def unique_sorted(values):
    return sorted(set(round(v, 8) for v in values))


def median_value(values):
    vals = unique_sorted(values)
    return vals[len(vals) // 2]


def choose_plane(rows):
    xs = unique_sorted(r["x"] for r in rows)
    ys = unique_sorted(r["y"] for r in rows)
    zs = unique_sorted(r["z"] for r in rows)

    if len(zs) == 1:
        return {
            "plane": "XY",
            "slice_axis": "z",
            "slice_value": zs[0],
            "hx": "x",
            "hy": "y",
            "vx": "nx",
            "vy": "ny",
        }

    if len(xs) > 1 and len(ys) > 1 and len(zs) > 1:
        return {
            "plane": "XY",
            "slice_axis": "z",
            "slice_value": median_value(r["z"] for r in rows),
            "hx": "x",
            "hy": "y",
            "vx": "nx",
            "vy": "ny",
        }

    if len(ys) == 1:
        return {
            "plane": "XZ",
            "slice_axis": "y",
            "slice_value": ys[0],
            "hx": "x",
            "hy": "z",
            "vx": "nx",
            "vy": "nz",
        }

    return {
        "plane": "YZ",
        "slice_axis": "x",
        "slice_value": median_value(r["x"] for r in rows),
        "hx": "y",
        "hy": "z",
        "vx": "ny",
        "vy": "nz",
    }


def nearest_slice_rows(rows, axis, target):
    vals = [r[axis] for r in rows]
    nearest = min(vals, key=lambda v: abs(v - target))
    out = [r for r in rows if abs(r[axis] - nearest) < 1e-8]
    if len(out) >= 4:
        return out, nearest
    return rows, nearest


def average_duplicates(rows, hx, hy, vx, vy):
    grouped = defaultdict(list)
    for r in rows:
        grouped[(r[hx], r[hy])].append(r)

    out = []
    for (px, py), items in grouped.items():
        out.append(
            {
                hx: px,
                hy: py,
                "S": float(np.mean([it["S"] for it in items])),
                vx: float(np.mean([it[vx] for it in items])),
                vy: float(np.mean([it[vy] for it in items])),
            }
        )
    return out


def build_segments(rows, hx, hy, vx, vy, density_factor=1):
    xs = sorted(set(r[hx] for r in rows))
    ys = sorted(set(r[hy] for r in rows))

    dx = min([abs(xs[i] - xs[i - 1]) for i in range(1, len(xs))], default=1.0)
    dy = min([abs(ys[i] - ys[i - 1]) for i in range(1, len(ys))], default=1.0)
    L = 0.90 * min(dx, dy)

    segs = []
    for i, r in enumerate(rows):
        if density_factor > 1 and i % density_factor != 0:
            continue

        ux = r[vx]
        uy = r[vy]
        n = math.hypot(ux, uy)
        if n < 1e-12:
            continue
        ux /= n
        uy /= n

        x1 = r[hx] - 0.5 * L * ux
        y1 = r[hy] - 0.5 * L * uy
        x2 = r[hx] + 0.5 * L * ux
        y2 = r[hy] + 0.5 * L * uy
        segs.append([(x1, y1), (x2, y2)])

    return segs


def choose_density_factor(rows):
    n = len(rows)
    if n <= 4000:
        return 1
    if n <= 9000:
        return 2
    if n <= 16000:
        return 3
    return 4


def main():
    if len(sys.argv) < 3:
        print("Usage: render_director_preview.py input.csv output.png [lang]", file=sys.stderr)
        sys.exit(1)

    input_csv = sys.argv[1]
    output_png = sys.argv[2]
    lang = sys.argv[3] if len(sys.argv) >= 4 else "en"
    txt = tr(lang)

    rows = read_rows(input_csv)
    plane_info = choose_plane(rows)

    slice_rows, used_slice = nearest_slice_rows(
        rows, plane_info["slice_axis"], plane_info["slice_value"]
    )

    hx = plane_info["hx"]
    hy = plane_info["hy"]
    vx = plane_info["vx"]
    vy = plane_info["vy"]

    rows2 = average_duplicates(slice_rows, hx, hy, vx, vy)

    X = np.array([r[hx] for r in rows2], dtype=float)
    Y = np.array([r[hy] for r in rows2], dtype=float)
    S = np.array([r["S"] for r in rows2], dtype=float)

    density_factor = choose_density_factor(rows2)
    segs = build_segments(rows2, hx, hy, vx, vy, density_factor=density_factor)

    fig, ax = plt.subplots(figsize=(7.3, 6.0), dpi=180)
    bg = "#e6e6e6"
    fig.patch.set_facecolor(bg)
    ax.set_facecolor(bg)

    tri = Triangulation(X, Y)

    contour = ax.tricontourf(
        tri,
        S,
        levels=140,
        cmap="inferno",
        vmin=max(0.0, np.nanmin(S)),
        vmax=min(1.0, np.nanmax(S)) if np.nanmax(S) <= 1.2 else np.nanmax(S),
    )

    if segs:
        lc = LineCollection(
            segs,
            colors="black",
            linewidths=0.36,
            alpha=0.90,
            capstyle="round",
            joinstyle="round",
        )
        ax.add_collection(lc)

    cbar = fig.colorbar(contour, ax=ax, fraction=0.050, pad=0.045)
    cbar.set_label(txt["cbar"], fontsize=9)
    cbar.ax.tick_params(labelsize=8)

    ax.set_aspect("equal", adjustable="box")
    ax.set_xlabel(hx, fontsize=9)
    ax.set_ylabel(hy, fontsize=9)
    ax.set_title(txt["title"], fontsize=11, pad=8)
    ax.tick_params(labelsize=8)

    for spine in ax.spines.values():
        spine.set_linewidth(0.8)
        spine.set_alpha(0.75)

    xpad = 0.02 * (np.max(X) - np.min(X) if np.max(X) != np.min(X) else 1.0)
    ypad = 0.02 * (np.max(Y) - np.min(Y) if np.max(Y) != np.min(Y) else 1.0)
    ax.set_xlim(np.min(X) - xpad, np.max(X) + xpad)
    ax.set_ylim(np.min(Y) - ypad, np.max(Y) + ypad)

    plt.tight_layout()
    os.makedirs(os.path.dirname(output_png), exist_ok=True)
    plt.savefig(
        output_png,
        dpi=180,
        facecolor=fig.get_facecolor(),
        bbox_inches="tight"
    )
    plt.close(fig)


if __name__ == "__main__":
    main()