import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUi } from "../components/Shell.jsx";

const api = window.mclist;

export default function Running() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useUi();

  const { runId, runMeta } = loc.state || {};
  const meta = runMeta || {};

  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [hover, setHover] = useState({ cancel: false, copy: false, clear: false, auto: false });
  const [elapsedMs, setElapsedMs] = useState(0);

  const boxRef = useRef(null);
  const startedAt = useMemo(() => Date.now(), []);

  useEffect(() => {
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  const status = useMemo(() => {
    if (lines.some((l) => l.includes("=== starting simulation ===") || l.includes("Starting McLiCS"))) return "running";
    if (lines.some((l) => l.includes("compilation") || l.includes("make:"))) return "compiling";
    return "starting";
  }, [lines]);

  useEffect(() => {
    if (!api) return;

    const offLog = api.onSimLog((msg) => {
      if (runId && msg?.id !== runId) return;
      const text = String(msg?.data ?? "").replace(/\r/g, "");
      const type = String(msg?.type ?? "stdout");
      const parts = text.split("\n");

      setLines((prev) => {
        const next = [...prev];
        for (const p of parts) if (p) next.push(`[${type}] ${p}`);
        return next.length > 3000 ? next.slice(next.length - 3000) : next;
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

  useEffect(() => {
    if (!autoScroll || !boxRef.current) return;
    boxRef.current.scrollTop = boxRef.current.scrollHeight;
  }, [lines, autoScroll]);

  const cancel = async () => {
    try {
      await api?.cancelSim?.();
    } catch (e) {
      console.error(e);
      alert(t("cancelError", { error: String(e) }));
    }
  };

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch (e) {
      console.error(e);
      alert(t("copyError", { error: String(e) }));
    }
  };

  const clearLogs = () => setLines([]);
  const fmtTime = (ms) => `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

  const statusLabel = status === "running" ? t("statusRunning") : status === "compiling" ? t("statusCompiling") : t("statusStarting");

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.top}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={s.dotWrap}><div style={s.dot} /></div>
            <div style={{ display: "grid", gap: 4 }}>
              <div style={s.titleRow}>
                <div style={s.title}>{t("execution")}</div>
                <span style={badgeStyle(status)}>{statusLabel}</span>
                {meta?.mode ? <span style={badgeStyle(meta.mode.toUpperCase(), true)}>{meta.mode.toUpperCase()}</span> : null}
                <span style={s.timer}>{fmtTime(elapsedMs)}</span>
              </div>
              <div style={s.subtitle}>{lines.length === 0 ? t("waitingOutput") : t("liveOutput")}</div>
            </div>
          </div>

          <div style={s.actions}>
            <button style={btnGhost(hover.copy)} onMouseEnter={() => setHover((h) => ({ ...h, copy: true }))} onMouseLeave={() => setHover((h) => ({ ...h, copy: false }))} onClick={copyLogs} title={t("copyLogsTitle")}>{t("copyLogs")}</button>
            <button style={btnGhost(hover.clear)} onMouseEnter={() => setHover((h) => ({ ...h, clear: true }))} onMouseLeave={() => setHover((h) => ({ ...h, clear: false }))} onClick={clearLogs} title={t("clearConsoleTitle")}>{t("clear")}</button>
            <button style={btnGhost(hover.auto)} onMouseEnter={() => setHover((h) => ({ ...h, auto: true }))} onMouseLeave={() => setHover((h) => ({ ...h, auto: false }))} onClick={() => setAutoScroll((v) => !v)} title={t("autoScrollTitle")}>{`${t("autoScroll")}: ${autoScroll ? t("on") : t("off")}`}</button>
            <button style={btnDanger(hover.cancel)} onMouseEnter={() => setHover((h) => ({ ...h, cancel: true }))} onMouseLeave={() => setHover((h) => ({ ...h, cancel: false }))} onClick={cancel} title={t("cancelTitle")}>{t("cancel")}</button>
          </div>
        </div>

        <div style={s.infoGrid}>
          <InfoCard label={t("runId")} value={runId || meta?.id || "—"} mono />
          <InfoCard label={t("workdir")} value={meta?.workdir || "—"} mono />
          <InfoCard label={t("paramFile")} value={meta?.paramPath || "—"} mono />
          <InfoCard label={t("logFile")} value={meta?.logPath || "—"} mono />
        </div>

        <div style={s.consoleCard}>
          <div style={s.consoleHeader}>
            <div style={s.consoleTitle}>{t("console")}</div>
            <div style={s.consoleHint}>{t("runningTip")}</div>
          </div>

          <div ref={boxRef} style={s.console}>
            {lines.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyTitle}>{t("noOutputYet")}</div>
                <div style={s.emptyText}>{t("noOutputYetText")}</div>
              </div>
            ) : (
              lines.map((l, i) => <div key={i} style={s.line}>{l}</div>)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, mono }) {
  return (
    <div style={s.infoCard}>
      <div style={s.infoLabel}>{label}</div>
      <div style={{ ...s.infoValue, ...(mono ? s.mono : null) }}>{value}</div>
    </div>
  );
}

function badgeStyle(status, accent = false) {
  return {
    ...s.badge,
    border: accent ? "1px solid rgba(230,57,70,0.30)" : status === "running" ? "1px solid rgba(46, 204, 113, 0.30)" : status === "compiling" ? "1px solid rgba(52, 152, 219, 0.30)" : "1px solid rgba(29,29,29,0.12)",
    background: accent ? "rgba(230,57,70,0.10)" : status === "running" ? "rgba(46, 204, 113, 0.10)" : status === "compiling" ? "rgba(52, 152, 219, 0.10)" : "rgba(29,29,29,0.05)",
  };
}

function btnGhost(hovered) {
  return { ...s.btnGhost, transform: hovered ? "translateY(-2px)" : "translateY(0)", boxShadow: hovered ? "0 12px 26px rgba(29,29,29,0.10)" : "none" };
}
function btnDanger(hovered) {
  return { ...s.btnDanger, transform: hovered ? "translateY(-2px)" : "translateY(0)", boxShadow: hovered ? "0 16px 30px rgba(230,57,70,0.20)" : s.btnDanger.boxShadow };
}

const s = {
  page: { minHeight: "100%" },
  container: { display: "grid", gap: 14, padding: 18 },
  top: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 18, boxShadow: "0 14px 34px rgba(29,29,29,0.08)", padding: 16 },
  dotWrap: { width: 42, height: 42, borderRadius: 14, display: "grid", placeItems: "center", background: "rgba(230,57,70,0.10)" },
  dot: { width: 12, height: 12, borderRadius: 999, background: "var(--red)", boxShadow: "0 0 0 8px rgba(230,57,70,0.14)" },
  titleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { fontWeight: 950, fontSize: 20, letterSpacing: -0.3 },
  subtitle: { color: "var(--muted)", fontWeight: 700, fontSize: 13 },
  timer: { fontWeight: 950, padding: "6px 10px", borderRadius: 999, background: "rgba(29,29,29,0.05)" },
  badge: { fontSize: 12, fontWeight: 900, borderRadius: 999, padding: "6px 10px" },
  actions: { display: "flex", gap: 10, flexWrap: "wrap" },
  btnGhost: { border: "1px solid var(--border)", background: "transparent", color: "var(--black)", borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontWeight: 850, transition: "transform 140ms ease, box-shadow 140ms ease" },
  btnDanger: { border: "1px solid rgba(230,57,70,0.25)", background: "linear-gradient(180deg, rgba(230,57,70,1), rgba(190,30,44,1))", color: "white", borderRadius: 12, padding: "10px 12px", cursor: "pointer", fontWeight: 900, transition: "transform 140ms ease, box-shadow 140ms ease", boxShadow: "0 12px 24px rgba(230,57,70,0.16)" },
  infoGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 },
  infoCard: { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "0 12px 28px rgba(29,29,29,0.06)", padding: 14, display: "grid", gap: 8 },
  infoLabel: { color: "var(--muted)", fontWeight: 800, fontSize: 12 },
  infoValue: { fontWeight: 900 },
  consoleCard: { background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 18, boxShadow: "0 14px 34px rgba(29,29,29,0.08)", overflow: "hidden" },
  consoleHeader: { borderBottom: "1px solid rgba(29,29,29,0.08)", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", padding: 14 },
  consoleTitle: { fontWeight: 950 },
  consoleHint: { fontSize: 12, color: "var(--muted)", fontWeight: 750 },
  console: { height: "60vh", overflow: "auto", background: "rgba(245,247,248,0.55)", padding: 14 },
  line: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12, padding: "2px 0", whiteSpace: "pre-wrap" },
  empty: { border: "1px dashed rgba(29,29,29,0.18)", background: "rgba(255,255,255,0.55)", borderRadius: 16, padding: 18, display: "grid", gap: 8 },
  emptyTitle: { fontWeight: 950 },
  emptyText: { fontSize: 12, color: "var(--muted)", fontWeight: 750, lineHeight: 1.45, whiteSpace: "pre-wrap" },
  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },
};