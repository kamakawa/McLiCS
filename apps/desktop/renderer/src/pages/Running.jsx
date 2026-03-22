import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useUi } from "../components/Shell.jsx";

const api = window.mclist;

export default function Running() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t, lang } = useUi();

  const { runId, runMeta } = loc.state || {};
  const meta = runMeta || {};

  const [lines, setLines] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [statusMsgIndex, setStatusMsgIndex] = useState(0);
  const [factIndex, setFactIndex] = useState(0);

  const [previewFile, setPreviewFile] = useState("");
  const [previewImage, setPreviewImage] = useState("");
  const [previewError, setPreviewError] = useState("");

  const boxRef = useRef(null);
  const startedAt = useMemo(() => Date.now(), []);

  const cancel = async () => {
    try {
      await api?.cancelSim?.();
    } catch (e) {
      console.error(e);
      alert(t("cancelError", { error: String(e) }));
    }
  };

  useEffect(() => {
    ensureRunningAnimations();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setElapsedMs(Date.now() - startedAt), 250);
    return () => clearInterval(timer);
  }, [startedAt]);

  const status = useMemo(() => {
    if (lines.some((l) => l.includes("=== starting simulation ===") || l.includes("Starting McLiCS"))) {
      return "running";
    }
    if (lines.some((l) => l.includes("compilation") || l.includes("make:"))) {
      return "compiling";
    }
    return "starting";
  }, [lines]);

  const translatedStatusMessages = t("statusMessages");
  const translatedFacts = t("scienceFacts");

  const fallbackStatusMessages = {
    starting: [
      "Initializing simulation environment",
      "Loading numerical configuration",
      "Preparing lattice structure",
      "Validating simulation parameters",
    ],
    compiling: [
      "Compiling simulation core",
      "Preparing execution binaries",
      "Optimizing runtime environment",
      "Building numerical modules",
    ],
    running: [
      "Running Monte Carlo routine",
      "Processing thermal variation",
      "Sampling molecular configurations",
      "Updating system states",
    ],
  };

  const fallbackFacts = [
    "Liquid crystals exhibit properties between conventional liquids and solid crystals.",
    "The order parameter is used to quantify molecular alignment in liquid crystal systems.",
    "Small temperature changes can significantly affect phase transitions.",
    "Monte Carlo methods use stochastic sampling to explore equilibrium behavior.",
    "Liquid crystals are widely used in display technologies such as LCD screens.",
    "Thermal fluctuations play an important role in the organization of molecules.",
    "Numerical simulations help investigate systems that are difficult to solve analytically.",
    "Boundary conditions can strongly influence the final configuration of the system.",
  ];

  const STATUS_MESSAGES =
    translatedStatusMessages && typeof translatedStatusMessages === "object"
      ? translatedStatusMessages
      : fallbackStatusMessages;

  const SCIENCE_FACTS = Array.isArray(translatedFacts) ? translatedFacts : fallbackFacts;

  const statusMessages = STATUS_MESSAGES[status] || STATUS_MESSAGES.starting || fallbackStatusMessages.starting;
  const currentStatusMessage = statusMessages[statusMsgIndex % statusMessages.length];
  const currentFact = SCIENCE_FACTS[factIndex % SCIENCE_FACTS.length];

  useEffect(() => {
    setStatusMsgIndex(0);
  }, [status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setStatusMsgIndex((v) => v + 1);
    }, 3200);

    return () => clearInterval(interval);
  }, [status]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFactIndex((v) => v + 1);
    }, 5200);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!api) return;

    const offLog = api.onSimLog((msg) => {
      if (runId && msg?.id !== runId) return;

      const text = String(msg?.data ?? "").replace(/\r/g, "");
      const type = String(msg?.type ?? "stdout");
      const parts = text.split("\n");

      setLines((prev) => {
        const next = [...prev];
        for (const p of parts) {
          if (p) next.push(`[${type}] ${p}`);
        }
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

    useEffect(() => {
    if (!api || !meta?.workdir) return;

    let dead = false;

    const refreshPreview = async () => {
      try {
        const listRes = await api.listRunFiles(meta.workdir);
        const latest = pickLatestDirectorField(listRes?.files || []);

        if (!latest) return;

        const res = await api.renderDirectorPreview(meta.workdir, latest);

        if (dead) return;

        if (res?.ok && res?.imagePath) {
          try {
            const previewName = latest
              .split("/")
              .pop()
              .replace(/\.csv$/i, ".png");

            const imgRes = await api.readRunFile(
              meta.workdir,
              `.mclist_previews/${previewName}`,
              8_000_000
            );

            if (imgRes?.base64) {
              setPreviewFile(latest);
              setPreviewImage(`data:image/png;base64,${imgRes.base64}`);
              setPreviewError("");
            } else {
              setPreviewError("Preview image could not be loaded.");
            }
          } catch (e) {
            setPreviewError(String(e));
          }
        } else {
          setPreviewError(res?.error || "Preview generation failed.");
        }
      } catch (e) {
        if (!dead) setPreviewError(String(e));
      }
    };

    refreshPreview();
    const timer = setInterval(refreshPreview, 1800);

    return () => {
      dead = true;
      clearInterval(timer);
    };
  }, [meta?.workdir]);

  const copyLogs = async () => {
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
    } catch (e) {
      console.error(e);
      alert(t("copyError", { error: String(e) }));
    }
  };

  const clearLogs = () => setLines([]);

  const fmtTime = (ms) =>
    `${String(Math.floor(ms / 60000)).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;

  const displayRunId = formatDisplayRunId(runId || meta?.id);

  const statusLabel =
    status === "running"
      ? t("statusRunning")
      : status === "compiling"
      ? t("statusCompiling")
      : t("statusStarting");

  const previewTitle = String(lang || "").toLowerCase().startsWith("pt")
    ? "Visualização ao vivo"
    : "Live preview";

  return (
    <div style={s.page}>
      <div style={s.hero}>
        <div style={s.heroGlow} />

        <div style={s.heroLeft}>
          <div style={s.dotWrap}>
            <div style={s.dotPulseRing} />
            <div style={s.dot} />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={s.titleRow}>
              <div style={s.title}>{t("execution")}</div>
              <span style={badgeStyle(status)}>{statusLabel}</span>
              {meta?.mode ? (
                <span style={badgeStyle(meta.mode.toUpperCase(), true)}>{meta.mode.toUpperCase()}</span>
              ) : null}
              <span style={s.timer}>{fmtTime(elapsedMs)}</span>
            </div>

            <div style={s.subtitle}>
              {lines.length === 0 ? t("waitingOutput") : t("liveOutput")}
            </div>
          </div>
        </div>

        <div style={s.actions}>
          <button style={s.btnGhost} onClick={copyLogs} title={t("copyLogsTitle")}>
            {t("copyLogs")}
          </button>

          <button style={s.btnGhost} onClick={clearLogs} title={t("clearConsoleTitle")}>
            {t("clear")}
          </button>

          <button
            style={s.btnGhost}
            onClick={() => setAutoScroll((v) => !v)}
            title={t("autoScrollTitle")}
          >
            {`${t("autoScroll")}: ${autoScroll ? t("on") : t("off")}`}
          </button>

          <button style={s.btnCancel} onClick={cancel} title={t("cancelTitle")}>
            {t("cancel")}
          </button>
        </div>
      </div>

      <div style={s.dynamicGrid}>
        <div style={s.dynamicCard}>
          <div style={s.dynamicLabel}>{t("currentActivity")}</div>
          <div key={`${status}-${statusMsgIndex}`} style={s.dynamicMessage}>
            {currentStatusMessage}
          </div>
        </div>

        <div style={s.dynamicCard}>
          <div style={s.dynamicLabel}>{t("scientificNote")}</div>
          <div key={`fact-${factIndex}`} style={s.dynamicFact}>
            {currentFact}
          </div>
        </div>
      </div>

      <div style={s.singleInfoWrap}>
        <InfoCard label={t("runId")} value={displayRunId || "—"} mono highlight />
      </div>

      <div style={s.dualPanel}>
        <div style={s.consoleCard}>
          <div style={s.consoleHeader}>
            <div>
              <div style={s.consoleTitle}>{t("console")}</div>
              <div style={s.consoleHint}>{t("runningTip")}</div>
            </div>
          </div>

          <div ref={boxRef} style={s.console}>
            {lines.length === 0 ? (
              <div style={s.empty}>
                <div style={s.emptyTitle}>{t("noOutputYet")}</div>
                <div style={s.emptyText}>{t("noOutputYetText")}</div>
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

        <div style={s.previewCard}>
          <div style={s.consoleHeader}>
            <div>
              <div style={s.consoleTitle}>{previewTitle}</div>
              <div style={s.consoleHint}>
                {previewFile
                  ? previewFile
                  : String(lang || "").toLowerCase().startsWith("pt")
                  ? "Aguardando director_field*.csv..."
                  : "Waiting for director_field*.csv..."}
              </div>
            </div>
          </div>

          {previewImage ? (
            <div style={s.imagePreviewWrap}>
              <img src={previewImage} alt="director preview" style={s.imagePreview} />
            </div>
          ) : (
            <div style={s.previewEmpty}>
              <div style={s.previewEmptyTitle}>
                {String(lang || "").toLowerCase().startsWith("pt")
                  ? "Nenhuma imagem disponível ainda"
                  : "No image available yet"}
              </div>
              <div style={s.previewEmptySub}>
                {previewError ||
                  (String(lang || "").toLowerCase().startsWith("pt")
                    ? "A pré-visualização será atualizada assim que um director_field*.csv for gerado."
                    : "The preview will update as soon as a director_field*.csv file is generated.")}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, mono, highlight = false }) {
  return (
    <div
      style={{
        ...s.infoCard,
        ...(highlight ? s.infoCardHighlight : null),
      }}
    >
      <div style={s.infoLabel}>{label}</div>
      <div style={{ ...s.infoValue, ...(mono ? s.mono : null) }}>{value}</div>
    </div>
  );
}

function formatDisplayRunId(id) {
  if (!id) return "";
  return `MClist-${id}`;
}

function pickLatestDirectorField(files) {
  const list = (files || []).filter((f) =>
    /(^|\/)director_field.*\.csv$/i.test(typeof f === "string" ? f : f?.path)
  );

  if (!list.length) return "";

  return list
    .slice()
    .sort((a, b) => {
      const ma = typeof a === "string" ? 0 : Number(a?.mtimeMs || 0);
      const mb = typeof b === "string" ? 0 : Number(b?.mtimeMs || 0);
      return mb - ma;
    })[0]?.path || "";
}

function directorFieldRank(name) {
  const m = String(name).match(/director_field[_-]?(\d+)/i);
  if (m) return Number(m[1]);
  return String(name).localeCompare("");
}

function ensureRunningAnimations() {
  if (document.getElementById("mclist-running-animations")) return;

  const style = document.createElement("style");
  style.id = "mclist-running-animations";
  style.innerHTML = `
    @keyframes mclistPulse {
      0% { transform: scale(0.95); opacity: 0.55; }
      70% { transform: scale(1.45); opacity: 0; }
      100% { transform: scale(1.55); opacity: 0; }
    }

    @keyframes mclistFloat {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-2px); }
      100% { transform: translateY(0px); }
    }

    @keyframes mclistGlow {
      0% { box-shadow: 0 0 0 rgba(230,57,70,0.00); }
      50% { box-shadow: 0 0 24px rgba(230,57,70,0.18); }
      100% { box-shadow: 0 0 0 rgba(230,57,70,0.00); }
    }

    @keyframes mclistFadeSlide {
      0% { opacity: 0; transform: translateY(8px); }
      100% { opacity: 1; transform: translateY(0); }
    }
  `;
  document.head.appendChild(style);
}

function badgeStyle(status, accent = false) {
  return {
    ...s.badge,
    border: accent
      ? "1px solid rgba(230,57,70,0.30)"
      : status === "running"
      ? "1px solid rgba(30,160,70,0.24)"
      : status === "compiling"
      ? "1px solid rgba(0,200,255,0.24)"
      : "1px solid var(--line)",
    background: accent
      ? "rgba(230,57,70,0.12)"
      : status === "running"
      ? "rgba(30,160,70,0.10)"
      : status === "compiling"
      ? "rgba(0,200,255,0.10)"
      : "var(--surface-2)",
    color: "var(--text)",
  };
}

const s = {
  page: {
    display: "grid",
    gap: 14,
  },

  hero: {
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    padding: 18,
    borderRadius: 24,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    boxShadow: "var(--shadow)",
  },

  heroGlow: {
    position: "absolute",
    right: -80,
    top: -80,
    width: 220,
    height: 220,
    borderRadius: "50%",
    background: "radial-gradient(circle, rgba(230,57,70,0.12), transparent 68%)",
    pointerEvents: "none",
  },

  heroLeft: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  dotWrap: {
    position: "relative",
    width: 52,
    height: 52,
    borderRadius: 18,
    display: "grid",
    placeItems: "center",
    background: "rgba(230,57,70,0.10)",
    border: "1px solid rgba(230,57,70,0.18)",
    animation: "mclistGlow 2s ease-in-out infinite",
  },

  dotPulseRing: {
    position: "absolute",
    width: 14,
    height: 14,
    borderRadius: 999,
    background: "rgba(230,57,70,0.30)",
    animation: "mclistPulse 1.8s ease-out infinite",
  },

  dot: {
    position: "relative",
    zIndex: 1,
    width: 12,
    height: 12,
    borderRadius: 999,
    background: "var(--red)",
  },

  titleRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },

  title: {
    fontWeight: 1000,
    fontSize: 22,
    letterSpacing: "-0.04em",
  },

  subtitle: {
    color: "var(--muted)",
    fontWeight: 700,
    fontSize: 13,
  },

  timer: {
    fontWeight: 950,
    padding: "7px 10px",
    borderRadius: 999,
    background: "var(--surface-2)",
    border: "1px solid var(--line)",
    animation: "mclistFloat 2.2s ease-in-out infinite",
  },

  badge: {
    fontSize: 12,
    fontWeight: 900,
    borderRadius: 999,
    padding: "6px 10px",
  },

  actions: {
    position: "relative",
    zIndex: 1,
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  btnGhost: {
    minHeight: 44,
    border: "1px solid var(--line)",
    background: "var(--surface-2)",
    color: "var(--text)",
    borderRadius: 14,
    padding: "0 14px",
    cursor: "pointer",
    fontWeight: 850,
    boxShadow: "var(--shadow-soft)",
  },

  btnCancel: {
    minHeight: 44,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "linear-gradient(180deg, #ff4d5d, #d62839)",
    color: "#ffffff",
    borderRadius: 14,
    padding: "0 16px",
    cursor: "pointer",
    fontWeight: 950,
    boxShadow: "0 14px 30px rgba(214,40,57,0.32)",
    textShadow: "0 1px 0 rgba(0,0,0,0.18)",
  },

  dynamicGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 14,
  },

  dynamicCard: {
    display: "grid",
    gap: 10,
    padding: 16,
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    boxShadow: "var(--shadow-soft)",
    minHeight: 108,
    alignContent: "start",
  },

  dynamicLabel: {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: "var(--muted)",
  },

  dynamicMessage: {
    fontSize: 20,
    fontWeight: 950,
    lineHeight: 1.25,
    color: "var(--text)",
    letterSpacing: "-0.03em",
    animation: "mclistFadeSlide 320ms ease",
  },

  dynamicFact: {
    fontSize: 15,
    lineHeight: 1.6,
    color: "var(--text)",
    fontWeight: 750,
    animation: "mclistFadeSlide 320ms ease",
  },

  singleInfoWrap: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr)",
  },

  infoCard: {
    padding: 16,
    borderRadius: 20,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    boxShadow: "var(--shadow-soft)",
    display: "grid",
    gap: 8,
  },

  infoCardHighlight: {
    background: "linear-gradient(180deg, rgba(230,57,70,0.08), rgba(255,255,255,0.72))",
    border: "1px solid rgba(230,57,70,0.18)",
  },

  infoLabel: {
    fontSize: 12,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    color: "var(--muted)",
  },

  infoValue: {
    fontSize: 16,
    fontWeight: 850,
    color: "var(--text)",
    wordBreak: "break-word",
  },

  mono: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
  },

  dualPanel: {
    display: "grid",
    gridTemplateColumns: "1.1fr 0.9fr",
    gap: 14,
    alignItems: "start",
  },

  consoleCard: {
    minHeight: 520,
    padding: 16,
    borderRadius: 22,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    backdropFilter: "blur(var(--glass-blur))",
    WebkitBackdropFilter: "blur(var(--glass-blur))",
    boxShadow: "var(--shadow)",
    display: "grid",
    gap: 12,
  },

  previewCard: {
    minHeight: 520,
    padding: 16,
    borderRadius: 22,
    border: "1px solid var(--border)",
    background: "var(--panel)",
    boxShadow: "var(--shadow)",
    display: "grid",
    gap: 12,
    alignContent: "start",
  },

  consoleHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },

  consoleTitle: {
    fontSize: 16,
    fontWeight: 950,
    letterSpacing: "-0.02em",
    color: "var(--text)",
  },

  consoleHint: {
    marginTop: 4,
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    lineHeight: 1.45,
    wordBreak: "break-word",
  },

  console: {
    minHeight: 420,
    maxHeight: "64vh",
    overflow: "auto",
    borderRadius: 18,
    border: "1px solid var(--line)",
    background:
      "radial-gradient(circle at top, rgba(255,255,255,0.05), transparent 40%), #111215",
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
    display: "grid",
    gap: 6,
  },

  line: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    lineHeight: 1.45,
    color: "#dce2ea",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },

  empty: {
    minHeight: 240,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 18,
  },

  emptyTitle: {
    fontSize: 18,
    fontWeight: 900,
    color: "#ffffff",
    marginBottom: 8,
  },

  emptyText: {
    fontSize: 13,
    color: "rgba(220,226,234,0.74)",
    lineHeight: 1.6,
    maxWidth: 520,
    whiteSpace: "pre-wrap",
  },

  imagePreviewWrap: {
  border: "1px solid var(--line)",
  borderRadius: 18,
  overflow: "hidden",
  background: "rgba(245,247,248,0.65)",
  padding: 10,
},

imagePreview: {
  display: "block",
  width: "100%",
  height: "auto",
  borderRadius: 12,
},

previewEmpty: {
  minHeight: 280,
  border: "1px dashed var(--line)",
  borderRadius: 18,
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 18,
  background: "rgba(245,247,248,0.45)",
},

previewEmptyTitle: {
  fontWeight: 950,
  color: "var(--text)",
},

previewEmptySub: {
  marginTop: 6,
  color: "var(--muted)",
  fontWeight: 700,
  maxWidth: 420,
  lineHeight: 1.55,
},
};