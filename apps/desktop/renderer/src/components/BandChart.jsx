import { useId, useRef, useState } from "react";

/**
 * A labeled line chart with gridlines, tick labels, axis titles, an
 * optional uncertainty band (± value), and a hover crosshair/tooltip.
 * Shared by the Plots tab (po.dat) and the Summary tab so both read as the
 * same chart system instead of two different qualities of chart.
 */
export default function BandChart({ title, xLabel, yLabel, series, accent }) {
  const W = 980;
  const H = 320;
  const padL = 60;
  const padR = 24;
  const padT = 24;
  const padB = 40;

  const gradientId = useId();
  const wrapRef = useRef(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const clean = series.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (!clean.length) return null;

  const xs = series.map((p) => p.x).filter(Number.isFinite);
  const ys = series.map((p) => p.y).filter(Number.isFinite);
  const los = series.map((p) => p.lo).filter(Number.isFinite);
  const his = series.map((p) => p.hi).filter(Number.isFinite);

  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys, ...(los.length ? los : ys));
  const ymax = Math.max(...ys, ...(his.length ? his : ys));
  const yPad = (ymax - ymin || 1) * 0.08;

  const sx = (x) => padL + ((x - xmin) / (xmax - xmin || 1)) * (W - padL - padR);
  const sy = (y) =>
    H - padB - ((y - (ymin - yPad)) / (ymax - ymin + yPad * 2 || 1)) * (H - padT - padB);

  const ticks = 5;

  const xTicks = Array.from({ length: ticks }, (_, i) => xmin + (i / (ticks - 1)) * (xmax - xmin));
  const yTicks = Array.from({ length: ticks }, (_, i) => ymin + (i / (ticks - 1)) * (ymax - ymin));

  const lineD = clean.map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x)} ${sy(p.y)}`).join(" ");

  const bandPtsHi = series.filter((p) => Number.isFinite(p.hi)).map((p) => [sx(p.x), sy(p.hi)]);
  const bandPtsLo = series
    .filter((p) => Number.isFinite(p.lo))
    .map((p) => [sx(p.x), sy(p.lo)])
    .reverse();

  const bandD =
    bandPtsHi.length && bandPtsLo.length
      ? `M ${bandPtsHi[0][0]} ${bandPtsHi[0][1]} ` +
        bandPtsHi.slice(1).map(([x, y]) => `L ${x} ${y}`).join(" ") +
        " " +
        bandPtsLo.map(([x, y]) => `L ${x} ${y}`).join(" ") +
        " Z"
      : "";

  const lastPoint = clean[clean.length - 1];

  const handleMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || !clean.length) return;

    const mx = ((e.clientX - rect.left) / rect.width) * W;

    let nearest = 0;
    let nearestDist = Infinity;
    clean.forEach((p, i) => {
      const d = Math.abs(sx(p.x) - mx);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });

    setHoverIdx(nearest);
  };

  const hovered = hoverIdx !== null ? clean[hoverIdx] : null;
  const hasBand = hovered && Number.isFinite(hovered.lo) && Number.isFinite(hovered.hi);
  const tooltipLeftPct = hovered ? (sx(hovered.x) / W) * 100 : 0;
  const tooltipTopPct = hovered ? (sy(hovered.y) / H) * 100 : 0;
  const tooltipAlignEnd = hovered ? sx(hovered.x) / W > 0.72 : false;

  return (
    <div style={s.bandCard}>
      {title ? (
        <div style={s.bandHeader}>
          <div style={s.bandTitle}>{title}</div>
        </div>
      ) : null}

      <div ref={wrapRef} style={s.bandChartWrap} onMouseMove={handleMove} onMouseLeave={() => setHoverIdx(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.16" />
              <stop offset="100%" stopColor={accent} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Grid (horizontal only, recessive) */}
          {yTicks.map((y, i) => (
            <line key={i} x1={padL} y1={sy(y)} x2={W - padR} y2={sy(y)} stroke="var(--line)" strokeWidth="1" />
          ))}

          {/* Baseline */}
          <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--line)" strokeWidth="1" />

          {/* Ticks + labels */}
          {xTicks.map((x, i) => (
            <text key={i} x={sx(x)} y={H - padB + 20} fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--muted)">
              {fmt(x)}
            </text>
          ))}

          {yTicks.map((y, i) => (
            <text key={i} x={padL - 10} y={sy(y) + 4} fontSize="11" fontWeight="700" textAnchor="end" fill="var(--muted)">
              {fmt(y)}
            </text>
          ))}

          {/* Axis labels */}
          <text x={(W - padR + padL) / 2} y={H - 4} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--muted)">
            {xLabel}
          </text>

          <text
            x="14"
            y={(H - padB + padT) / 2}
            transform={`rotate(-90 14 ${(H - padB + padT) / 2})`}
            textAnchor="middle"
            fontSize="11"
            fontWeight="800"
            fill="var(--muted)"
          >
            {yLabel}
          </text>

          {/* Uncertainty band */}
          {bandD && <path d={bandD} fill={accent} opacity="0.12" />}

          {/* Area wash under the mean line */}
          <path d={`${lineD} L ${sx(lastPoint.x)} ${H - padB} L ${sx(clean[0].x)} ${H - padB} Z`} fill={`url(#${gradientId})`} stroke="none" />

          {/* Line */}
          <path d={lineD} stroke={accent} strokeWidth="2" fill="none" strokeLinejoin="round" strokeLinecap="round" />

          {/* Crosshair */}
          {hovered ? (
            <line
              x1={sx(hovered.x)}
              y1={padT}
              x2={sx(hovered.x)}
              y2={H - padB}
              stroke="var(--muted)"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity="0.5"
            />
          ) : null}

          {/* End marker + value */}
          <circle cx={sx(lastPoint.x)} cy={sy(lastPoint.y)} r="5" fill={accent} stroke="var(--panel)" strokeWidth="2" />
          <text x={sx(lastPoint.x) - 9} y={sy(lastPoint.y) - 10} fontSize="12" fontWeight="900" textAnchor="end" fill="var(--text-main)">
            {fmt(lastPoint.y)}
          </text>

          {/* Hover marker */}
          {hovered ? (
            <circle cx={sx(hovered.x)} cy={sy(hovered.y)} r="5" fill={accent} stroke="var(--panel)" strokeWidth="2" />
          ) : null}
        </svg>

        {hovered ? (
          <div
            style={{
              ...s.chartTooltip,
              left: `${tooltipLeftPct}%`,
              top: `${tooltipTopPct}%`,
              transform: `translate(${tooltipAlignEnd ? "-100%" : "0%"}, -130%)`,
            }}
          >
            <div style={s.chartTooltipRow}>
              <span style={s.chartTooltipLabel}>{xLabel}</span>
              <span style={s.chartTooltipValue}>{fmt(hovered.x)}</span>
            </div>
            <div style={s.chartTooltipRow}>
              <span style={s.chartTooltipLabel}>{yLabel}</span>
              <span style={s.chartTooltipValue}>{fmt(hovered.y)}</span>
            </div>
            {hasBand ? (
              <div style={s.chartTooltipRow}>
                <span style={s.chartTooltipLabel}>{"±"}</span>
                <span style={s.chartTooltipValue}>{fmt((hovered.hi - hovered.lo) / 2)}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function fmt(v) {
  if (!Number.isFinite(v)) return "NaN";
  const a = Math.abs(v);
  if (a >= 1000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return v.toFixed(4);
}

const s = {
  bandCard: {
    border: "1px solid var(--border-soft)",
    borderRadius: 16,
    padding: 12,
    background: "var(--surface-2)",
  },
  bandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingBottom: 8,
  },
  bandTitle: { fontWeight: 950, letterSpacing: -0.2 },

  bandChartWrap: { position: "relative" },

  chartTooltip: {
    position: "absolute",
    pointerEvents: "none",
    background: "var(--panel)",
    border: "1px solid var(--border-soft)",
    borderRadius: 10,
    padding: "6px 10px",
    boxShadow: "var(--shadow)",
    display: "grid",
    gap: 2,
    whiteSpace: "nowrap",
    zIndex: 2,
  },

  chartTooltipRow: {
    display: "flex",
    alignItems: "baseline",
    gap: 8,
    justifyContent: "space-between",
  },

  chartTooltipLabel: {
    fontSize: 10,
    fontWeight: 800,
    color: "var(--muted)",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },

  chartTooltipValue: {
    fontSize: 12,
    fontWeight: 900,
    color: "var(--text-main)",
  },
};
