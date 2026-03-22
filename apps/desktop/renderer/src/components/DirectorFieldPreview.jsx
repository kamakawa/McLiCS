import { useMemo } from "react";
import { useUi } from "./Shell.jsx";

export default function DirectorFieldPreview({
  text,
  fileName = "",
  compact = false,
  title,
}) {
  const { lang } = useUi();
  const parsed = useMemo(() => parseDirectorField(text), [text]);

  const ui = getUiText(lang);

  if (!text?.trim()) {
    return (
      <div style={{ ...s.wrap, ...(compact ? s.wrapCompact : null) }}>
        <div style={s.emptyBox}>
          <div style={s.emptyTitle}>{ui.noDataTitle}</div>
          <div style={s.emptySub}>{ui.noDataSub}</div>
        </div>
      </div>
    );
  }

  if (!parsed.ok) {
    return (
      <div style={{ ...s.wrap, ...(compact ? s.wrapCompact : null) }}>
        <div style={s.emptyBox}>
          <div style={s.emptyTitle}>{ui.invalidTitle}</div>
          <div style={s.emptySub}>{parsed.reason || ui.invalidSub}</div>
        </div>
      </div>
    );
  }

  const {
    rows,
    plane,
    sliceValue,
    sliceLabel,
    xKey,
    yKey,
    vxKey,
    vyKey,
    sMin,
    sMax,
    xMin,
    xMax,
    yMin,
    yMax,
    spacing,
    arrowRows,
  } = parsed;

  const W = compact ? 560 : 900;
  const H = compact ? 360 : 520;
  const padL = 60;
  const padR = 26;
  const padT = 34;
  const padB = 52;

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const sx = (x) => padL + ((x - xMin) / (xMax - xMin || 1)) * innerW;
  const sy = (y) => H - padB - ((y - yMin) / (yMax - yMin || 1)) * innerH;

  const radius = Math.max(1.6, Math.min(9, spacing * (compact ? 0.18 : 0.22)));

  const xTicks = buildTicks(xMin, xMax, compact ? 4 : 6);
  const yTicks = buildTicks(yMin, yMax, compact ? 4 : 6);

  return (
    <div style={{ ...s.wrap, ...(compact ? s.wrapCompact : null) }}>
      <div style={s.header}>
        <div>
          <div style={s.kicker}>{title || ui.previewTitle}</div>
          <div style={s.titleRow}>
            <div style={s.title}>{fileName || ui.directorField}</div>
            <span style={s.badge}>
              {plane} • {sliceLabel} = {fmtNum(sliceValue)}
            </span>
          </div>
          <div style={s.sub}>
            {ui.pointsLabel}: {rows.length} • {ui.orderRangeLabel}: {fmtNum(sMin)} → {fmtNum(sMax)}
          </div>
        </div>

        <div style={s.legendBox}>
          <div style={s.legendLabel}>S</div>
          <div style={s.legendScale}>
            <div style={s.legendGradient} />
            <div style={s.legendValues}>
              <span>{fmtNum(sMax)}</span>
              <span>{fmtNum(sMin)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={s.canvasShell}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <rect x="0" y="0" width={W} height={H} rx="18" fill="rgba(255,255,255,0.78)" />

          {/* grid */}
          {xTicks.map((tick, i) => (
            <line
              key={`gx-${i}`}
              x1={sx(tick)}
              y1={padT}
              x2={sx(tick)}
              y2={H - padB}
              stroke="rgba(0,0,0,0.07)"
            />
          ))}
          {yTicks.map((tick, i) => (
            <line
              key={`gy-${i}`}
              x1={padL}
              y1={sy(tick)}
              x2={W - padR}
              y2={sy(tick)}
              stroke="rgba(0,0,0,0.07)"
            />
          ))}

          {/* heat points */}
          {rows.map((r, i) => (
            <circle
              key={`p-${i}`}
              cx={sx(r[xKey])}
              cy={sy(r[yKey])}
              r={radius}
              fill={sColor(r.S, sMin, sMax)}
              opacity="0.92"
            />
          ))}

          {/* directors */}
          {arrowRows.map((r, i) => {
            const px = sx(r[xKey]);
            const py = sy(r[yKey]);

            const vx = Number(r[vxKey]);
            const vy = Number(r[vyKey]);

            const norm = Math.hypot(vx, vy) || 1;
            const ux = vx / norm;
            const uy = vy / norm;

            const L = Math.max(7, Math.min(22, spacing * (compact ? 0.38 : 0.45)));

            const x1 = px - ux * L * 0.5;
            const y1 = py + uy * L * 0.5;
            const x2 = px + ux * L * 0.5;
            const y2 = py - uy * L * 0.5;

            return (
              <line
                key={`d-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(20,20,20,0.78)"
                strokeWidth={compact ? 1.1 : 1.25}
                strokeLinecap="round"
              />
            );
          })}

          {/* axes */}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(0,0,0,0.34)" />
          <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(0,0,0,0.34)" />

          {/* ticks and labels */}
          {xTicks.map((tick, i) => (
            <g key={`xt-${i}`}>
              <line
                x1={sx(tick)}
                y1={H - padB}
                x2={sx(tick)}
                y2={H - padB + 5}
                stroke="rgba(0,0,0,0.35)"
              />
              <text
                x={sx(tick)}
                y={H - padB + 18}
                textAnchor="middle"
                fontSize="11"
                fill="rgba(20,20,20,0.78)"
              >
                {fmtNum(tick)}
              </text>
            </g>
          ))}

          {yTicks.map((tick, i) => (
            <g key={`yt-${i}`}>
              <line
                x1={padL - 5}
                y1={sy(tick)}
                x2={padL}
                y2={sy(tick)}
                stroke="rgba(0,0,0,0.35)"
              />
              <text
                x={padL - 9}
                y={sy(tick)}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize="11"
                fill="rgba(20,20,20,0.78)"
              >
                {fmtNum(tick)}
              </text>
            </g>
          ))}

          <text
            x={(padL + (W - padR)) / 2}
            y={H - 12}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="rgba(20,20,20,0.78)"
          >
            {xKey}
          </text>

          <text
            x="18"
            y={(padT + (H - padB)) / 2}
            textAnchor="middle"
            fontSize="12"
            fontWeight="700"
            fill="rgba(20,20,20,0.78)"
            transform={`rotate(-90 18 ${(padT + (H - padB)) / 2})`}
          >
            {yKey}
          </text>
        </svg>
      </div>

      <div style={s.footerMeta}>
        <span>{ui.planeLabel}: {plane}</span>
        <span>{ui.sliceLabel}: {sliceLabel} = {fmtNum(sliceValue)}</span>
        <span>{ui.directorsLabel}: {arrowRows.length}</span>
      </div>
    </div>
  );
}

function parseDirectorField(text) {
  try {
    const rawLines = String(text || "")
      .replace(/\r/g, "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (rawLines.length < 3) {
      return { ok: false, reason: "File is too short." };
    }

    const headerLine = rawLines[0];
    const sep = headerLine.includes(",") ? "," : /\s+/;
    const headers = headerLine
      .split(sep)
      .map((h) => h.trim())
      .filter(Boolean);

    const idx = Object.fromEntries(headers.map((h, i) => [normalize(h), i]));

    const required = ["x", "y", "z", "nx", "ny", "nz"];
    for (const key of required) {
      if (!(key in idx)) {
        return { ok: false, reason: `Missing column: ${key}` };
      }
    }

    const rows = [];
    for (let i = 1; i < rawLines.length; i++) {
      const parts = rawLines[i]
        .split(sep)
        .map((p) => p.trim())
        .filter(Boolean);

      if (parts.length < headers.length) continue;

      const row = {};
      for (const [name, col] of Object.entries(idx)) {
        row[name] = Number(parts[col]);
      }

      if (
        !Number.isFinite(row.x) ||
        !Number.isFinite(row.y) ||
        !Number.isFinite(row.z) ||
        !Number.isFinite(row.nx) ||
        !Number.isFinite(row.ny) ||
        !Number.isFinite(row.nz)
      ) {
        continue;
      }

      if (Number.isFinite(row.pt) && (row.pt < 1 || row.pt > 3)) continue;

      if (!Number.isFinite(row.s) && Number.isFinite(row.S)) row.s = row.S;
      row.S = Number.isFinite(row.s) ? row.s : 0;

      rows.push(row);
    }

    if (!rows.length) {
      return { ok: false, reason: "No valid rows found." };
    }

    const ux = uniqueSorted(rows.map((r) => r.x));
    const uy = uniqueSorted(rows.map((r) => r.y));
    const uz = uniqueSorted(rows.map((r) => r.z));

    let plane = "XY";
    let sliceLabel = "z";
    let sliceValue = medianOf(uz);
    let xKey = "x";
    let yKey = "y";
    let vxKey = "nx";
    let vyKey = "ny";
    let sliceAxis = "z";

    if (uz.length === 1) {
      plane = "XY";
      sliceAxis = "z";
      sliceLabel = "z";
      sliceValue = uz[0];
    } else if (uy.length === 1) {
      plane = "XZ";
      sliceAxis = "y";
      sliceLabel = "y";
      sliceValue = uy[0];
      xKey = "x";
      yKey = "z";
      vxKey = "nx";
      vyKey = "nz";
    } else if (ux.length === 1) {
      plane = "YZ";
      sliceAxis = "x";
      sliceLabel = "x";
      sliceValue = ux[0];
      xKey = "y";
      yKey = "z";
      vxKey = "ny";
      vyKey = "nz";
    } else {
      plane = "XY";
      sliceAxis = "z";
      sliceLabel = "z";
      sliceValue = nearestValue(uz, medianOf(uz));
    }

    const sliceRows = rows.filter((r) => nearlyEqual(r[sliceAxis], sliceValue));

    const finalRows = sliceRows.length >= 8 ? sliceRows : rows;

    if (finalRows.length < 4) {
      return { ok: false, reason: "Not enough points in the selected slice." };
    }

    const xVals = finalRows.map((r) => r[xKey]);
    const yVals = finalRows.map((r) => r[yKey]);
    const sVals = finalRows.map((r) => r.S).filter(Number.isFinite);

    const xUnique = uniqueSorted(xVals);
    const yUnique = uniqueSorted(yVals);

    const dx = minStep(xUnique);
    const dy = minStep(yUnique);
    const spacing = Math.max(8, Math.min(28, Math.min(dx || 12, dy || 12) * 7.5));

    return {
      ok: true,
      rows: finalRows,
      arrowRows: sampleRows(finalRows, compactSampleTarget(finalRows.length)),
      plane,
      sliceValue,
      sliceLabel,
      xKey,
      yKey,
      vxKey,
      vyKey,
      sMin: Math.min(...sVals),
      sMax: Math.max(...sVals),
      xMin: Math.min(...xVals),
      xMax: Math.max(...xVals),
      yMin: Math.min(...yVals),
      yMax: Math.max(...yVals),
      spacing,
    };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

function compactSampleTarget(n) {
  if (n <= 300) return n;
  if (n <= 900) return 320;
  return 420;
}

function sampleRows(rows, target) {
  if (rows.length <= target) return rows;
  const step = Math.ceil(rows.length / target);
  const out = [];
  for (let i = 0; i < rows.length; i += step) out.push(rows[i]);
  return out;
}

function buildTicks(min, max, count) {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) return [min];
  return Array.from({ length: count }, (_, i) => min + (i / (count - 1)) * (max - min));
}

function sColor(v, min, max) {
  const t = clamp((v - min) / (max - min || 1), 0, 1);

  // plasma-like
  const stops = [
    [13, 8, 135],
    [84, 3, 160],
    [139, 10, 165],
    [185, 50, 137],
    [219, 92, 104],
    [244, 136, 73],
    [253, 188, 43],
    [240, 249, 33],
  ];

  const p = t * (stops.length - 1);
  const i = Math.floor(p);
  const f = p - i;
  const a = stops[i];
  const b = stops[Math.min(i + 1, stops.length - 1)];

  const r = Math.round(a[0] + (b[0] - a[0]) * f);
  const g = Math.round(a[1] + (b[1] - a[1]) * f);
  const bl = Math.round(a[2] + (b[2] - a[2]) * f);
  return `rgb(${r}, ${g}, ${bl})`;
}

function uniqueSorted(values) {
  return [...new Set(values.map((v) => Number(v).toFixed(6)))].map(Number).sort((a, b) => a - b);
}

function minStep(values) {
  if (!values || values.length < 2) return 0;
  let best = Infinity;
  for (let i = 1; i < values.length; i++) {
    const d = Math.abs(values[i] - values[i - 1]);
    if (d > 1e-9 && d < best) best = d;
  }
  return Number.isFinite(best) ? best : 0;
}

function medianOf(values) {
  if (!values?.length) return 0;
  const mid = Math.floor(values.length / 2);
  return values[mid];
}

function nearestValue(values, target) {
  let best = values[0];
  let bestD = Math.abs(values[0] - target);
  for (const v of values) {
    const d = Math.abs(v - target);
    if (d < bestD) {
      best = v;
      bestD = d;
    }
  }
  return best;
}

function nearlyEqual(a, b) {
  return Math.abs(a - b) < 1e-6;
}

function normalize(s) {
  return String(s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function fmtNum(v) {
  if (!Number.isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return v.toFixed(3).replace(/0+$/g, "").replace(/\.$/g, "");
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}

function getUiText(lang) {
  const l = String(lang || "en").toLowerCase();
  const pt = l.startsWith("pt");

  return pt
    ? {
        previewTitle: "Pré-visualização do campo diretor",
        directorField: "Campo diretor",
        noDataTitle: "Nenhum arquivo de campo diretor disponível",
        noDataSub: "A visualização aparecerá quando um director_field*.csv for encontrado.",
        invalidTitle: "Não foi possível renderizar este arquivo",
        invalidSub: "Formato incompatível para visualização.",
        pointsLabel: "Pontos",
        orderRangeLabel: "Faixa de S",
        planeLabel: "Plano",
        sliceLabel: "Fatia",
        directorsLabel: "Diretores exibidos",
      }
    : {
        previewTitle: "Director field preview",
        directorField: "Director field",
        noDataTitle: "No director-field file available",
        noDataSub: "The preview will appear when a director_field*.csv file is found.",
        invalidTitle: "Could not render this file",
        invalidSub: "Unsupported format for preview.",
        pointsLabel: "Points",
        orderRangeLabel: "S range",
        planeLabel: "Plane",
        sliceLabel: "Slice",
        directorsLabel: "Displayed directors",
      };
}

const s = {
  wrap: {
    border: "1px solid rgba(29,29,29,0.10)",
    background: "rgba(255,255,255,0.74)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 12,
    boxShadow: "0 12px 28px rgba(29,29,29,0.06)",
  },

  wrapCompact: {
    padding: 12,
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 14,
    flexWrap: "wrap",
  },

  kicker: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
    fontWeight: 900,
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 3,
  },

  title: {
    fontWeight: 950,
    letterSpacing: "-0.02em",
    color: "var(--black)",
  },

  badge: {
    border: "1px solid rgba(230,57,70,0.18)",
    background: "rgba(230,57,70,0.10)",
    color: "var(--black)",
    borderRadius: 999,
    padding: "5px 9px",
    fontSize: 11,
    fontWeight: 850,
  },

  sub: {
    marginTop: 4,
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700,
  },

  legendBox: {
    display: "grid",
    gap: 6,
    minWidth: 82,
  },

  legendLabel: {
    fontSize: 11,
    fontWeight: 900,
    color: "var(--muted)",
  },

  legendScale: {
    display: "flex",
    gap: 8,
    alignItems: "stretch",
  },

  legendGradient: {
    width: 12,
    borderRadius: 999,
    background:
      "linear-gradient(180deg, rgb(240,249,33), rgb(253,188,43), rgb(244,136,73), rgb(219,92,104), rgb(185,50,137), rgb(139,10,165), rgb(84,3,160), rgb(13,8,135))",
  },

  legendValues: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    fontSize: 11,
    color: "var(--black)",
    fontWeight: 800,
  },

  canvasShell: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 16,
    overflow: "hidden",
    background: "rgba(245,247,248,0.58)",
  },

  footerMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 750,
  },

  emptyBox: {
    minHeight: 260,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    border: "1px dashed rgba(29,29,29,0.16)",
    borderRadius: 16,
    background: "rgba(245,247,248,0.45)",
    padding: 16,
  },

  emptyTitle: {
    fontWeight: 950,
    color: "var(--black)",
  },

  emptySub: {
    marginTop: 6,
    color: "var(--muted)",
    fontWeight: 700,
    maxWidth: 460,
  },
};