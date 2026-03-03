import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logo from "../assets/logo.png";
import { useUi } from "../components/Shell.jsx";

const api = window.mclist;

export default function Home() {
  const nav = useNavigate();
  const { theme, setTheme, lang, setLang } = useUi();

  const [recents, setRecents] = useState([]);

  // Hover states (premium feel)
  const [hoverPrimary, setHoverPrimary] = useState(false);
  const [hoverSecondary, setHoverSecondary] = useState(false);
  const [hoveredRow, setHoveredRow] = useState(null);

  useEffect(() => {
    (async () => {
      if (!api) return;
      const r = await api.getRecents();
      setRecents((r || []).slice(0, 5));
    })();
  }, []);

  const newProject = () => {
    nav("/setup", { state: { mode: "new", params: defaultParams() } });
  };

  const openProject = async () => {
    const res = await api.openParamFile();
    if (res?.canceled) return;
    nav("/setup", { state: { mode: "open", filePath: res.filePath, params: res.params } });
    setRecents((res.recents || []).slice(0, 5));
  };

  const niceRecents = useMemo(() => {
    return recents.map((r) => ({
      ...r,
      when: r.lastOpenedAt ? new Date(r.lastOpenedAt).toLocaleDateString() : "",
      short: shrinkPath(r.path || "")
    }));
  }, [recents]);

  return (
    <div style={s.bg}>
      <div style={s.wrap}>
        {/* HERO */}
        <section style={s.hero}>
          {/* Controls in Home (since header is hidden) */}
          <div style={s.topControls}>
            <button
              style={s.ctrlBtn}
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              title="Toggle theme"
            >
              {theme === "light" ? "☀" : "🌙"}
            </button>

            <select value={lang} onChange={(e) => setLang(e.target.value)} style={s.ctrlSelect} title="Language">
              <option value="en">EN</option>
              <option value="pt-BR">pt-BR</option>
              <option value="es">ES</option>
              <option value="ja">日本語</option>
              <option value="zh">中文</option>
            </select>
          </div>

          <img src={logo} alt="MClist" style={s.logo} />

          <div style={s.headline}>Welcome</div>
          <div style={s.sub}>
            Start a new liquid crystal simulation or open an existing project. Keep runs, notes, and reports in one place.
          </div>

          <div style={s.actions}>
            <button
              style={{
                ...s.primaryBtn,
                transform: hoverPrimary ? "translateY(-3px)" : "translateY(0px)",
                boxShadow: hoverPrimary
                  ? "0 20px 46px rgba(230,57,70,0.30)"
                  : s.primaryBtn.boxShadow,
              }}
              onMouseEnter={() => setHoverPrimary(true)}
              onMouseLeave={() => setHoverPrimary(false)}
              onClick={newProject}
            >
              <span style={s.btnIcon}>＋</span>
              <span>New Simulation</span>
            </button>

            <button
              style={{
                ...s.secondaryBtn,
                transform: hoverSecondary ? "translateY(-3px)" : "translateY(0px)",
                boxShadow: hoverSecondary
                  ? "0 18px 38px rgba(29,29,29,0.14)"
                  : s.secondaryBtn.boxShadow,
              }}
              onMouseEnter={() => setHoverSecondary(true)}
              onMouseLeave={() => setHoverSecondary(false)}
              onClick={openProject}
            >
              <span style={s.btnIconGray}>📂</span>
              <span>Open Project</span>
            </button>
          </div>
        </section>

        {/* RECENTS */}
        <section style={s.panel}>
          <div style={s.panelTop}>
            <div>
              <div style={s.panelTitle}>Recent Projects</div>
              <div style={s.panelHint}>Last 5 opened</div>
            </div>
          </div>

          <div style={{ display: "grid", gap: 10 }}>
            {niceRecents.length === 0 && (
              <div style={s.empty}>
                <div style={{ fontWeight: 950 }}>No recent projects yet</div>
                <div style={{ marginTop: 6, color: "var(--muted)" }}>
                  Click <b>New Simulation</b> or <b>Open Project</b> to get started.
                </div>
              </div>
            )}

            {niceRecents.map((r) => (
              <div
                key={r.path}
                style={{
                  ...s.recentRow,
                  transform: hoveredRow === r.path ? "translateY(-2px)" : "translateY(0)",
                  boxShadow: hoveredRow === r.path ? "0 14px 28px rgba(29,29,29,0.10)" : "none",
                }}
                onMouseEnter={() => setHoveredRow(r.path)}
                onMouseLeave={() => setHoveredRow(null)}
              >
                <div style={s.recentLeft}>
                  <div style={s.recentIcon}>📁</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={s.recentName}>{r.name}</div>
                    <div style={s.recentPath}>{r.short}</div>
                  </div>
                </div>
                <div style={s.recentDate}>{r.when}</div>
              </div>
            ))}
          </div>
        </section>

        <div style={s.footerHint}>
          Tip: Open a previous run to regenerate plots, add notes, and export a report.
        </div>
      </div>
    </div>
  );
}

function shrinkPath(p) {
  if (!p) return "";
  const parts = p.split("/").filter(Boolean);
  if (parts.length <= 3) return p;
  return `…/${parts.slice(-3).join("/")}`;
}

function defaultParams() {
  return {
    Nx: "20", Ny: "20", Nz: "10",
    MCS: "1000", MCT: "20000",
    potential: "ghrl",
    Ti: "1.3", Tf: "0.5", dT: "-0.05",
    p0: "0",
    fn: "2",
    nk: "",
    k11: "1", k22: "1.0", k33: "1",
    ic: "random",
    theta_0: "", phi_0: "", p0_i: "",
    geometry: "bulk",
    boundary_file: "",
    xbound: "periodic", ybound: "periodic", zbound: "periodic",
    evol: "thermal",
    anchoring: [{ id: 0, type: "rp", W: "4", phi_s: "0", theta_s: "90" }]
  };
}

const s = {
  // clean, neutral background
  bg: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    padding: "40px",
    background: "var(--bg)"
  },

  wrap: {
    width: "min(980px, 94vw)",
    display: "grid",
    gap: 18
  },

  hero: {
    position: "relative",
    borderRadius: 28,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    boxShadow: "var(--shadow)",
    padding: "34px 34px 28px",
    textAlign: "center"
  },

  topControls: {
    position: "absolute",
    top: 14,
    right: 14,
    display: "flex",
    gap: 10,
    alignItems: "center"
  },

  ctrlBtn: {
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.70)",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 900
  },

  ctrlSelect: {
    border: "1px solid var(--border)",
    background: "rgba(255,255,255,0.70)",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 800
  },

  logo: {
    width: "min(620px, 92%)",
    height: "auto",
    display: "block",
    margin: "0 auto 10px",
    filter: "drop-shadow(0 14px 22px rgba(29,29,29,0.10))"
  },

  headline: {
    marginTop: 10,
    fontSize: 34,
    fontWeight: 950,
    letterSpacing: -0.6,
    lineHeight: 1.12
  },

  sub: {
    marginTop: 10,
    fontSize: 15,
    color: "var(--muted)",
    lineHeight: 1.6,
    maxWidth: 760,
    marginLeft: "auto",
    marginRight: "auto"
  },

  actions: {
    marginTop: 22,
    display: "flex",
    gap: 14,
    justifyContent: "center",
    flexWrap: "wrap"
  },

  primaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    border: "1px solid rgba(230,57,70,0.22)",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 16,
    color: "white",
    background: "linear-gradient(180deg, rgba(230,57,70,1), rgba(190,30,44,1))",
    boxShadow: "0 16px 34px rgba(230,57,70,0.22)",
    transition: "transform 140ms ease, box-shadow 140ms ease"
  },

  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    border: "1px solid rgba(29,29,29,0.10)",
    padding: "14px 18px",
    cursor: "pointer",
    fontWeight: 950,
    fontSize: 16,
    color: "var(--black)",
    background: "rgba(245,247,248,0.88)",
    boxShadow: "0 12px 26px rgba(29,29,29,0.06)",
    transition: "transform 140ms ease, box-shadow 140ms ease"
  },

  btnIcon: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "rgba(255,255,255,0.18)"
  },

  btnIconGray: {
    width: 28,
    height: 28,
    display: "grid",
    placeItems: "center",
    borderRadius: 10,
    background: "rgba(29,29,29,0.06)"
  },

  panel: {
    borderRadius: 22,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    boxShadow: "0 14px 34px rgba(29,29,29,0.08)",
    padding: "18px 18px"
  },

  panelTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 12
  },

  panelTitle: { fontWeight: 950, letterSpacing: -0.2 },
  panelHint: { fontSize: 12, color: "var(--muted)", fontWeight: 800, marginTop: 2 },

  empty: {
    borderRadius: 16,
    padding: 16,
    border: "1px dashed rgba(29,29,29,0.18)",
    color: "rgba(29,29,29,0.72)",
    background: "rgba(245,247,248,0.35)"
  },

  recentRow: {
    borderRadius: 16,
    padding: "12px 14px",
    border: "1px solid rgba(29,29,29,0.07)",
    background: "rgba(245,247,248,0.65)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease"
  },

  recentLeft: { display: "flex", alignItems: "center", gap: 12, minWidth: 0 },

  recentIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    display: "grid",
    placeItems: "center",
    background: "rgba(29,29,29,0.06)"
  },

  recentName: { fontWeight: 950 },
  recentPath: {
    fontSize: 12,
    color: "var(--muted)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: "58ch"
  },

  recentDate: { color: "var(--muted)", fontWeight: 850, fontSize: 13, whiteSpace: "nowrap" },

  footerHint: {
    textAlign: "center",
    color: "var(--muted)",
    fontSize: 12,
    fontWeight: 700
  }
};