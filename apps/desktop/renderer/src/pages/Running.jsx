import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const api = window.mclist;

export default function Running() {
  const nav = useNavigate();
  const loc = useLocation();

  const { runId, runMeta } = loc.state || {};
  const meta = runMeta || {};

  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);

  const [hover, setHover] = useState({
    cancel: false,
    copy: false,
    clear: false,
    auto: false,
  });

  const boxRef = useRef(null);

  // timer
  const startedAt = useMemo(() => Date.now(), []);
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(t);
  }, [startedAt]);

  // status heuristics (não depende do backend imprimir muito)
  const status = useMemo(() => {
    if (lines.some((l) => l.includes("=== starting simulation ===") || l.includes("Starting McLiCS"))) {
      return "Running";
    }
    if (lines.some((l) => l.includes("compilation") || l.includes("make:"))) {
      return "Compiling";
    }
    return "Starting";
  }, [lines]);

  // subscribe
  useEffect(() => {
    if (!api) return;

    const offLog = api.onSimLog((msg) => {
      if (runId && msg?.id !== runId) return;

      const text = String(msg?.data ?? "");
      const type = String(msg?.type ?? "stdout");

      // normaliza em linhas (evita console gigante em 1 linha)
      const chunk = text.replace(/\r/g, "");
      const parts = chunk.split("\n");

      setLines((prev) => {
        const next = [...prev];
        for (const p of parts) {
          if (!p) continue;
          next.push(`[${type}] ${p}`);
        }
        // evita crescimento infinito
        if (next.length > 3000) return next.slice(next.length - 3000);
        return next;
      });
    });

    const offDone = api.onSimDone((msg) => {
      if (runId && msg?.id !== runId) return;
      nav("/results", { state: msg });
    });

    return () => {
      offLog?.();
      offDone?.();
    };
  }, [runId, nav]);

  // auto-scroll
  useEffect(() => {
    if (!autoScroll) return;
    if (!boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines, autoScroll]);

  const cancel = async () => {
    try {
      await api?.cancelSim?.();
    } catch (e) {
      console.error(e);
      alert(`Cancel error:\n${String(e)}`);
    }
  };

  const copyLogs = async () => {
    try {
      const text = lines.join("\n");
      await navigator.clipboard.writeText(text);
    } catch (e) {
      console.error(e);
      alert(`Copy error:\n${String(e)}`);
    }
  };

  const clearLogs = () => setLines([]);

  const fmtTime = (ms) => {
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Top bar */}
        <div style={s.top}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={s.dotWrap}>
              <div style={s.dot} />
            </div>

            <div style={{ display: "grid", gap: 4 }}>
              <div style={s.titleRow}>
                <div style={s.title}>Execution</div>

                <span style={badgeStyle(status)}>{status}</span>

                {meta?.mode ? (
                  <span style={badgeStyle(meta.mode.toUpperCase(), true)}>
                    {meta.mode.toUpperCase()}
                  </span>
                ) : null}

                <span style={s.timer}>{fmtTime(elapsedMs)}</span>
              </div>

              <div style={s.subtitle}>
                {lines.length === 0
                  ? "Waiting for output… (some simulations are silent; this is normal)"
                  : "Live output (stdout / stderr)"}
              </div>
            </div>
          </div>

          <div style={s.actions}>
            <button
              style={btnGhost(hover.copy)}
              onMouseEnter={() => setHover((h) => ({ ...h, copy: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, copy: false }))}
              onClick={copyLogs}
              title="Copy all console lines to clipboard"
            >
              Copy logs
            </button>

            <button
              style={btnGhost(hover.clear)}
              onMouseEnter={() => setHover((h) => ({ ...h, clear: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, clear: false }))}
              onClick={clearLogs}
              title="Clear console (does not stop the simulation)"
            >
              Clear
            </button>

            <button
              style={btnGhost(hover.auto)}
              onMouseEnter={() => setHover((h) => ({ ...h, auto: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, auto: false }))}
              onClick={() => setAutoScroll((v) => !v)}
              title="Toggle auto-scroll"
            >
              Auto-scroll: {autoScroll ? "ON" : "OFF"}
            </button>

            <button
              style={btnDanger(hover.cancel)}
              onMouseEnter={() => setHover((h) => ({ ...h, cancel: true }))}
              onMouseLeave={() => setHover((h) => ({ ...h, cancel: false }))}
              onClick={cancel}
              title="Stop the simulation"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Run info */}
        <div style={s.infoGrid}>
          <InfoCard label="Run ID" value={runId || meta?.id || "—"} mono />
          <InfoCard label="Workdir" value={meta?.workdir || "—"} mono />
          <InfoCard label="Param file" value={meta?.paramPath || "—"} mono />
          <InfoCard label="Log file" value={meta?.logPath || "—"} mono />
        </div>

        {/* Console */}
        <div style={s.consoleCard}>
          <div style={s.consoleHeader}>
            <div style={s.consoleTitle}>Console</div>
            <div style={s.consoleHint}>
              Tip: if the backend prints nothing during the loop, you can still inspect <b>run.log</b>.
            </div>
          </div>

          <div ref={boxRef} style={s.console}>
            {lines.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyTitle}>No output yet</div>
                <div style={s.emptyText}>
                  This can happen if the simulation is still compiling, or if the backend is silent during execution.
                  <br />
                  Keep this screen open — results will appear automatically when finished.
                </div>
              </div>
            ) : (
              lines.map((l, i) => (
                <div key={i} style={s.line}>
                  {l}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= UI bits ================= */

function InfoCard({ label, value, mono }) {
  return (
    <div style={s.infoCard}>
      <div style={s.infoLabel}>{label}</div>
      <div style={{ ...s.infoValue, ...(mono ? s.mono : null) }}>{value}</div>
    </div>
  );
}

function badgeStyle(text, accent = false) {
  const isRun = text === "Running";
  const isComp = text === "Compiling";
  return {
    ...s.badge,
    border:
      accent
        ? "1px solid rgba(230,57,70,0.30)"
        : isRun
        ? "1px solid rgba(46, 204, 113, 0.30)"
        : isComp
        ? "1px solid rgba(52, 152, 219, 0.30)"
        : "1px solid rgba(29,29,29,0.12)",
    background:
      accent
        ? "rgba(230,57,70,0.10)"
        : isRun
        ? "rgba(46, 204, 113, 0.10)"
        : isComp
        ? "rgba(52, 152, 219, 0.10)"
        : "rgba(245,247,248,0.55)",
  };
}

function btnGhost(isHover) {
  return {
    ...s.btnGhost,
    transform: isHover ? "translateY(-1px)" : "translateY(0)",
    boxShadow: isHover ? "0 14px 30px rgba(29,29,29,0.10)" : "none",
    borderColor: isHover ? "rgba(29,29,29,0.18)" : "var(--border)",
    background: isHover ? "rgba(245,247,248,0.85)" : "transparent",
  };
}

function btnDanger(isHover) {
  return {
    ...s.btnDanger,
    transform: isHover ? "translateY(-1px)" : "translateY(0)",
    boxShadow: isHover ? "0 18px 44px rgba(230,57,70,0.22)" : s.btnDanger.boxShadow,
    filter: isHover ? "brightness(1.02)" : "none",
  };
}

const s = {
  page: {
    minHeight: "calc(100vh - 8px)",
    padding: 18,
    background: "var(--bg)",
    color: "var(--black)",
    fontFamily: "var(--font)",
  },

  container: {
    width: "min(1100px, 98vw)",
    margin: "0 auto",
    display: "grid",
    gap: 14,
  },

  top: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 12px 28px rgba(29,29,29,0.08)",
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
  },

  dotWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.55)",
    display: "grid",
    placeItems: "center",
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "var(--red)",
    boxShadow: "0 0 0 6px rgba(230,57,70,0.12)",
  },

  titleRow: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" },
  title: { fontSize: 18, fontWeight: 950, letterSpacing: -0.2 },
  subtitle: { fontSize: 12, color: "var(--muted)", fontWeight: 750 },

  badge: {
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    color: "var(--black)",
    letterSpacing: 0.2,
  },

  timer: {
    fontSize: 12,
    fontWeight: 900,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.55)",
    color: "var(--black)",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  actions: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease",
  },

  btnDanger: {
    border: "1px solid rgba(230,57,70,0.30)",
    background: "rgba(230,57,70,0.10)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease, filter 140ms ease",
    boxShadow: "0 12px 28px rgba(230,57,70,0.12)",
  },

  infoGrid: {
    display: "grid",
    gap: 12,
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  },

  infoCard: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 12px 28px rgba(29,29,29,0.06)",
    padding: 14,
    display: "grid",
    gap: 6,
  },

  infoLabel: { fontSize: 12, color: "var(--muted)", fontWeight: 850 },
  infoValue: { fontSize: 13, fontWeight: 900, wordBreak: "break-word" },

  consoleCard: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 14px 34px rgba(29,29,29,0.08)",
    overflow: "hidden",
  },

  consoleHeader: {
    padding: 14,
    borderBottom: "1px solid rgba(29,29,29,0.08)",
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  consoleTitle: { fontWeight: 950, letterSpacing: -0.2 },
  consoleHint: { fontSize: 12, color: "var(--muted)", fontWeight: 750 },

  console: {
    height: "60vh",
    overflow: "auto",
    background: "rgba(245,247,248,0.55)",
    padding: 12,
  },

  line: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    lineHeight: 1.5,
    padding: "2px 0",
    whiteSpace: "pre-wrap",
  },

  empty: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(255,255,255,0.55)",
    borderRadius: 16,
    padding: 16,
    display: "grid",
    gap: 8,
    maxWidth: 760,
  },

  emptyTitle: { fontWeight: 950, letterSpacing: -0.2 },
  emptyText: { fontSize: 12, color: "var(--muted)", fontWeight: 750, lineHeight: 1.45 },

  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};