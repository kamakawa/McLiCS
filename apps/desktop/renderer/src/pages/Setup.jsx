import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useUi } from "../components/Shell.jsx";

const api = window.mclist;

export default function Setup() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t } = useUi();

  const initial = useMemo(() => loc.state?.params || defaultParams(), [loc.state]);
  const [p, setP] = useState(initial);
  const [hoverCPU, setHoverCPU] = useState(false);
  const [hoverGPU, setHoverGPU] = useState(false);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  const addAnchoring = () => {
    const nextId = p.anchoring?.length || 0;
    setP((prev) => ({
      ...prev,
      anchoring: [
        ...(prev.anchoring || []),
        { id: nextId, type: "", W: "", phi_s: "", theta_s: "" },
      ],
    }));
  };

  const removeAnchoring = (idx) => {
    const arr = [...(p.anchoring || [])];
    arr.splice(idx, 1);
    setP((prev) => ({ ...prev, anchoring: arr.map((a, i) => ({ ...a, id: i })) }));
  };

  const duplicateAnchoring = (idx) => {
    const arr = [...(p.anchoring || [])];
    arr.splice(idx + 1, 0, { ...arr[idx] });
    setP((prev) => ({ ...prev, anchoring: arr.map((a, i) => ({ ...a, id: i })) }));
  };

  const exportParam = async () => {
    try {
      if (!api) return alert(t("electronOnlyFeature"));
      const paramText = buildParamTxt(p);
      const res = await api.exportParamFile(paramText);
      if (res?.canceled) return;
      alert(t("savedAt", { path: res.filePath }));
    } catch (e) {
      console.error(e);
      alert(t("exportError", { error: String(e) }));
    }
  };

  const run = async (mode) => {
    try {
      if (!api) return alert(t("electronOnlyRun"));
      const res = await api.runSim({ mode, paramText: buildParamTxt(p) });
      if (!res?.id) {
        alert(t("unexpectedRunResponse", { data: JSON.stringify(res, null, 2) }));
        return;
      }
      nav("/running", { state: { runId: res.id, runMeta: { ...res, mode } } });
    } catch (e) {
      console.error(e);
      alert(t("runError", { mode: mode.toUpperCase(), error: String(e) }));
    }
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        <div style={s.header}>
          <div style={s.headerLeft}>
            <button style={s.btnGhost} className="ui-hover" onClick={() => nav("/")}>
              {`← ${t("back")}`}
            </button>

            <div>
              <div style={s.hTitle}>{t("projectSetup")}</div>
              <div style={s.hSub}>{t("projectSetupSub")}</div>
            </div>
          </div>

          <div style={s.headerRight}>
            <button style={s.btnGhost} className="ui-hover" onClick={exportParam}>
              {t("exportParameters")}
            </button>
          </div>
        </div>

        <Section title={t("grid")}>
          <Row cols={3}>
            <Input label="Nx" value={p.Nx} onChange={(v) => setField("Nx", v)} compact />
            <Input label="Ny" value={p.Ny} onChange={(v) => setField("Ny", v)} compact />
            <Input label="Nz" value={p.Nz} onChange={(v) => setField("Nz", v)} compact />
          </Row>
        </Section>

        <Section title={t("monteCarlo")}>
          <Row cols={4}>
            <Input label="MCS" value={p.MCS} onChange={(v) => setField("MCS", v)} compact />
            <Input label="MCT" value={p.MCT} onChange={(v) => setField("MCT", v)} compact />
            <Input label="fn" value={p.fn} onChange={(v) => setField("fn", v)} compact />
            <Input
              label="nk"
              value={p.nk}
              onChange={(v) => setField("nk", v)}
              placeholder={t("optional")}
              compact
            />
          </Row>
        </Section>

        <Section title={t("temperatureSchedule")}>
          <Row cols={3}>
            <Input label="Ti" value={p.Ti} onChange={(v) => setField("Ti", v)} compact />
            <Input label="Tf" value={p.Tf} onChange={(v) => setField("Tf", v)} compact />
            <Input label="dT" value={p.dT} onChange={(v) => setField("dT", v)} compact />
          </Row>
        </Section>

        <Section title={t("potentialPhysics")}>
          <Row cols={2}>
            <Input label="potential" value={p.potential} onChange={(v) => setField("potential", v)} />
            <Input label="p0" value={p.p0} onChange={(v) => setField("p0", v)} compact />
          </Row>

          <Row cols={3}>
            <Input label="k11" value={p.k11} onChange={(v) => setField("k11", v)} compact />
            <Input label="k22" value={p.k22} onChange={(v) => setField("k22", v)} compact />
            <Input label="k33" value={p.k33} onChange={(v) => setField("k33", v)} compact />
          </Row>
        </Section>

        <Section title={t("initializationEvolution")}>
          <Row cols={2}>
            <Input label="ic" value={p.ic} onChange={(v) => setField("ic", v)} />
            <Input label="evol" value={p.evol} onChange={(v) => setField("evol", v)} placeholder="thermal" />
          </Row>
        </Section>

        <Section title={t("geometryBoundaries")}>
          <Row cols={2}>
            <Input label="geometry" value={p.geometry} onChange={(v) => setField("geometry", v)} />
            <Input
              label="boundary_file"
              value={p.boundary_file}
              onChange={(v) => setField("boundary_file", v)}
              placeholder={t("optional")}
            />
          </Row>

          <Row cols={3}>
            <Input label="xbound" value={p.xbound} onChange={(v) => setField("xbound", v)} />
            <Input label="ybound" value={p.ybound} onChange={(v) => setField("ybound", v)} />
            <Input label="zbound" value={p.zbound} onChange={(v) => setField("zbound", v)} />
          </Row>
        </Section>

        <Section title={t("anchoringOptional")}>
          <div style={s.anchorWrap}>
            {(p.anchoring || []).map((a, idx) => (
              <div key={idx} style={s.anchorCard}>
                <div style={s.anchorTop}>
                  <div>
                    <div style={s.anchorTitle}>{`Anchoring #${idx}`}</div>
                    <div style={s.anchorSub}>{t("anchoringFormat", { index: idx })}</div>
                  </div>

                  <div style={s.anchorActions}>
                    <button
                      style={s.smallBtn}
                      className="ui-hover"
                      onClick={() => duplicateAnchoring(idx)}
                    >
                      {t("duplicate")}
                    </button>

                    <button
                      style={s.smallBtnDanger}
                      className="ui-hover"
                      onClick={() => removeAnchoring(idx)}
                    >
                      {t("remove")}
                    </button>
                  </div>
                </div>

                <Row cols={4}>
                  <Input
                    label="anchoring_type"
                    value={a.type}
                    onChange={(v) => updateAnchor(setP, idx, { type: v })}
                    placeholder="homeotropic, planar, rp..."
                  />
                  <Input
                    label="W"
                    value={a.W}
                    onChange={(v) => updateAnchor(setP, idx, { W: v })}
                    placeholder="e.g. 1"
                    compact
                  />
                  <Input
                    label={`phi_s (${t("optional")})`}
                    value={a.phi_s}
                    onChange={(v) => updateAnchor(setP, idx, { phi_s: v })}
                    placeholder="e.g. 0"
                    compact
                  />
                  <Input
                    label={`theta_s (${t("optional")})`}
                    value={a.theta_s}
                    onChange={(v) => updateAnchor(setP, idx, { theta_s: v })}
                    placeholder="e.g. 90"
                    compact
                  />
                </Row>

                <div style={s.anchorHint}>{t("anchoringHint")}</div>
              </div>
            ))}

            <button style={s.btnGhostWide} className="ui-hover" onClick={addAnchoring}>
              {t("addAnchoring")}
            </button>
          </div>
        </Section>

        <div style={s.footer}>
          <div style={s.footerLeft}>
            <div style={s.footerTitle}>{t("runSimulation")}</div>
            <div style={s.footerSub}>{t("runSimulationSub")}</div>
          </div>

          <div style={s.runActions}>
            <button
              style={{
                ...s.runCPU,
                transform: hoverCPU ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hoverCPU
                  ? "0 16px 30px rgba(29,29,29,0.12)"
                  : s.runCPU.boxShadow,
              }}
              className="ui-hover"
              onMouseEnter={() => setHoverCPU(true)}
              onMouseLeave={() => setHoverCPU(false)}
              onClick={() => run("cpu")}
            >
              {t("runCPU")}
            </button>

            <button
              style={{
                ...s.runGPU,
                transform: hoverGPU ? "translateY(-2px)" : "translateY(0)",
                boxShadow: hoverGPU
                  ? "0 18px 42px rgba(230,57,70,0.28)"
                  : s.runGPU.boxShadow,
              }}
              className="ui-hover"
              onMouseEnter={() => setHoverGPU(true)}
              onMouseLeave={() => setHoverGPU(false)}
              onClick={() => run("gpu")}
            >
              {t("runGPU")}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .ui-hover:hover{
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(29,29,29,0.10);
        }

        .ui-hover:disabled:hover{
          transform:none;
          box-shadow:none;
          cursor:not-allowed;
          opacity:0.6;
        }

        .setup-input{
          transition: border-color 140ms ease, box-shadow 140ms ease, transform 140ms ease;
        }

        .setup-input:hover{
          border-color: rgba(29,29,29,0.18);
        }

        @media (max-width: 1180px){
          .setup-grid-4{
            grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
          }
        }

        @media (max-width: 920px){
          .setup-grid-3{
            grid-template-columns: repeat(2, minmax(180px, 1fr)) !important;
          }

          .setup-grid-2{
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 700px){
          .setup-grid-4,
          .setup-grid-3,
          .setup-grid-2{
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </section>
  );
}

function Row({ cols = 2, children }) {
  const cls =
    cols === 4 ? "setup-grid-4" : cols === 3 ? "setup-grid-3" : "setup-grid-2";

  const gridTemplateColumns =
    cols === 4
      ? "repeat(4, minmax(180px, 1fr))"
      : cols === 3
      ? "repeat(3, minmax(180px, 1fr))"
      : "repeat(2, minmax(240px, 1fr))";

  return (
    <div
      className={cls}
      style={{
        display: "grid",
        gap: 14,
        gridTemplateColumns,
        alignItems: "start",
      }}
    >
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, compact = false }) {
  return (
    <label style={s.field}>
      <div style={s.label}>{label}</div>
      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={compact ? s.inputCompact : s.input}
        className="setup-input"
      />
    </label>
  );
}

function updateAnchor(setP, idx, patch) {
  setP((prev) => {
    const arr = [...(prev.anchoring || [])];
    arr[idx] = { ...arr[idx], ...patch };
    return { ...prev, anchoring: arr.map((a, i) => ({ ...a, id: i })) };
  });
}

function clean(v) {
  return String(v ?? "").trim();
}

function push(lines, key, val) {
  const v = clean(val);
  if (v) lines.push(`${key}  ${v}`);
}

function push3(lines, key, a, b) {
  const v1 = clean(a);
  const v2 = clean(b);
  if (v1 && v2) lines.push(`${key}  ${v1}  ${v2}`);
}

function buildParamTxt(p) {
  const lines = [];

  push(lines, "Nx", p.Nx);
  push(lines, "Ny", p.Ny);
  push(lines, "Nz", p.Nz);
  push(lines, "MCS", p.MCS);
  push(lines, "MCT", p.MCT);
  push(lines, "potential", p.potential);

  lines.push("");

  push(lines, "Ti", p.Ti);
  push(lines, "Tf", p.Tf);
  push(lines, "dT", p.dT);
  push(lines, "p0", p.p0);

  lines.push("");

  push(lines, "fn", p.fn);
  push(lines, "nk", p.nk);

  lines.push("");

  push(lines, "k11", p.k11);
  push(lines, "k22", p.k22);
  push(lines, "k33", p.k33);

  lines.push("");

  push(lines, "ic", p.ic);

  lines.push("");

  push(lines, "geometry", p.geometry);
  push(lines, "boundary_file", p.boundary_file);
  push(lines, "xbound", p.xbound);
  push(lines, "ybound", p.ybound);
  push(lines, "zbound", p.zbound);

  lines.push("");

  push(lines, "evol", p.evol || "thermal");

  const anchors = (p.anchoring || [])
    .map((a, i) => ({ ...a, id: i }))
    .filter((a) => clean(a.type) && clean(a.W));

  if (anchors.length) {
    lines.push("");

    anchors.forEach((a) => {
      push3(lines, "anchoring_type", a.id, a.type);
      push3(lines, "W", a.id, a.W);
      if (clean(a.phi_s)) push3(lines, "phi_s", a.id, a.phi_s);
      if (clean(a.theta_s)) push3(lines, "theta_s", a.id, a.theta_s);
      lines.push("");
    });
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function defaultParams() {
  return {
    Nx: "20",
    Ny: "20",
    Nz: "10",
    MCS: "1000",
    MCT: "20000",
    potential: "ghrl",
    Ti: "1.3",
    Tf: "0.5",
    dT: "-0.05",
    p0: "0",
    fn: "2",
    nk: "",
    k11: "1",
    k22: "1.0",
    k33: "1",
    ic: "random",
    evol: "thermal",
    geometry: "bulk",
    boundary_file: "",
    xbound: "periodic",
    ybound: "periodic",
    zbound: "periodic",
    anchoring: [],
  };
}

const s = {
  page: {
    display: "grid",
    padding: 20,
  },

  container: {
    width: "100%",
    maxWidth: 1220,
    margin: "0 auto",
    display: "grid",
    gap: 18,
  },

  header: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 16px 38px rgba(29,29,29,0.08)",
    padding: 18,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  headerRight: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  hTitle: {
    fontSize: 20,
    fontWeight: 950,
    letterSpacing: "-0.03em",
  },

  hSub: {
    marginTop: 3,
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
  },

  section: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 16px 38px rgba(29,29,29,0.06)",
    padding: 18,
    display: "grid",
    gap: 14,
  },

  sectionTitle: {
    fontWeight: 950,
    letterSpacing: "-0.02em",
    fontSize: 16,
  },

  field: {
    display: "grid",
    gap: 7,
    minWidth: 0,
  },

  label: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 850,
    paddingLeft: 2,
  },

  input: {
    width: "100%",
    minWidth: 0,
    height: 46,
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.34)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "0 14px",
    outline: "none",
    fontWeight: 700,
    fontSize: 14,
    boxSizing: "border-box",
  },

  inputCompact: {
    width: "100%",
    maxWidth: 220,
    minWidth: 0,
    height: 42,
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.34)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "0 12px",
    outline: "none",
    fontWeight: 700,
    fontSize: 14,
    boxSizing: "border-box",
  },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  btnGhostWide: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.35)",
    color: "var(--black)",
    borderRadius: 16,
    padding: "13px 14px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  anchorWrap: {
    display: "grid",
    gap: 12,
  },

  anchorCard: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 12,
    background: "rgba(245,247,248,0.45)",
  },

  anchorTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },

  anchorActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  anchorTitle: {
    fontWeight: 950,
  },

  anchorSub: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    marginTop: 2,
  },

  anchorHint: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    lineHeight: 1.45,
  },

  smallBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  smallBtnDanger: {
    border: "1px solid rgba(230,57,70,0.25)",
    background: "rgba(230,57,70,0.10)",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  footer: {
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 18px 42px rgba(29,29,29,0.10)",
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 14,
    flexWrap: "wrap",
  },

  footerLeft: {
    display: "grid",
    gap: 3,
  },

  footerTitle: {
    fontWeight: 950,
  },

  footerSub: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
  },

  runActions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },

  runCPU: {
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.88)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
    boxShadow: "0 10px 22px rgba(29,29,29,0.06)",
  },

  runGPU: {
    border: "1px solid rgba(230,57,70,0.25)",
    background: "linear-gradient(180deg, rgba(230,57,70,1), rgba(190,30,44,1))",
    color: "white",
    borderRadius: 14,
    padding: "11px 15px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
    boxShadow: "0 14px 30px rgba(230,57,70,0.20)",
  },
};