import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

const api = window.mclist;

export default function Setup() {
  const nav = useNavigate();
  const loc = useLocation();

  const initial = useMemo(() => loc.state?.params || defaultParams(), [loc.state]);
  const [p, setP] = useState(initial);

  // UI hovers
  const [hoverCPU, setHoverCPU] = useState(false);
  const [hoverGPU, setHoverGPU] = useState(false);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  const addAnchoring = () => {
    const nextId = (p.anchoring?.length || 0);
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
    const ren = arr.map((a, i) => ({ ...a, id: i }));
    setP((prev) => ({ ...prev, anchoring: ren }));
  };

  const duplicateAnchoring = (idx) => {
    const arr = [...(p.anchoring || [])];
    const copy = { ...arr[idx] };
    arr.splice(idx + 1, 0, copy);
    const ren = arr.map((a, i) => ({ ...a, id: i }));
    setP((prev) => ({ ...prev, anchoring: ren }));
  };

  const exportParam = async () => {
    if (!api) return;
    await api.exportParamFile(p);
  };

  const runCPU = () => {
    // Próximo passo: IPC spawn do backend + tela Running
    alert("Run CPU: next step is wiring spawn + progress screen.");
  };

  const runGPU = () => {
    alert("Run GPU: next step is wiring spawn + progress screen.");
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={s.btnGhost} onClick={() => nav("/")}>
            ← Back
          </button>
          <div>
            <div style={s.hTitle}>Project Setup</div>
            <div style={s.hSub}>
              Configure parameters, add anchoring conditions, then run on CPU or GPU.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.btnGhost} onClick={exportParam}>
            Export parameters
          </button>
        </div>
      </div>

      {/* Grid */}
      <Section title="Grid">
        <Row cols={3}>
          <Input label="Nx" value={p.Nx} onChange={(v) => setField("Nx", v)} />
          <Input label="Ny" value={p.Ny} onChange={(v) => setField("Ny", v)} />
          <Input label="Nz" value={p.Nz} onChange={(v) => setField("Nz", v)} />
        </Row>
      </Section>

      {/* Monte Carlo */}
      <Section title="Monte Carlo">
        <Row cols={4}>
          <Input label="MCS" value={p.MCS} onChange={(v) => setField("MCS", v)} />
          <Input label="MCT" value={p.MCT} onChange={(v) => setField("MCT", v)} />
          <Input label="fn" value={p.fn} onChange={(v) => setField("fn", v)} />
          <Input label="nk" value={p.nk} onChange={(v) => setField("nk", v)} placeholder="optional" />
        </Row>
      </Section>

      {/* Temperature */}
      <Section title="Temperature schedule">
        <Row cols={3}>
          <Input label="Ti" value={p.Ti} onChange={(v) => setField("Ti", v)} />
          <Input label="Tf" value={p.Tf} onChange={(v) => setField("Tf", v)} />
          <Input label="dT" value={p.dT} onChange={(v) => setField("dT", v)} />
        </Row>
        <Hint>
          Tip: use negative dT to cool down (e.g., -0.05), positive to heat up.
        </Hint>
      </Section>

      {/* Potential / physics */}
      <Section title="Potential / physics">
        <Row cols={2}>
          <Input
            label="potential"
            value={p.potential}
            onChange={(v) => setField("potential", v)}
            placeholder="ghrl, ll, ..."
          />
          <Input label="p0" value={p.p0} onChange={(v) => setField("p0", v)} />
        </Row>

        <Row cols={3}>
          <Input label="k11" value={p.k11} onChange={(v) => setField("k11", v)} />
          <Input label="k22" value={p.k22} onChange={(v) => setField("k22", v)} />
          <Input label="k33" value={p.k33} onChange={(v) => setField("k33", v)} />
        </Row>
      </Section>

      {/* Init / evol */}
      <Section title="Initialization & evolution">
        <Row cols={2}>
          <Input label="ic" value={p.ic} onChange={(v) => setField("ic", v)} placeholder="random, cholesteric..." />
          <Input label="evol" value={p.evol} onChange={(v) => setField("evol", v)} placeholder="thermal, step..." />
        </Row>

        {String(p.ic || "").trim().toLowerCase() === "cholesteric" && (
          <>
            <Divider />
            <Row cols={3}>
              <Input label="theta_0" value={p.theta_0} onChange={(v) => setField("theta_0", v)} />
              <Input label="phi_0" value={p.phi_0} onChange={(v) => setField("phi_0", v)} />
              <Input label="p0_i" value={p.p0_i} onChange={(v) => setField("p0_i", v)} />
            </Row>
          </>
        )}
      </Section>

      {/* Geometry */}
      <Section title="Geometry & boundaries">
        <Row cols={2}>
          <Input label="geometry" value={p.geometry} onChange={(v) => setField("geometry", v)} placeholder="bulk, slab, ..." />
          <Input label="boundary_file" value={p.boundary_file} onChange={(v) => setField("boundary_file", v)} placeholder="optional" />
        </Row>

        <Row cols={3}>
          <Input label="xbound" value={p.xbound} onChange={(v) => setField("xbound", v)} placeholder="periodic, ..." />
          <Input label="ybound" value={p.ybound} onChange={(v) => setField("ybound", v)} placeholder="periodic, ..." />
          <Input label="zbound" value={p.zbound} onChange={(v) => setField("zbound", v)} placeholder="periodic, ..." />
        </Row>
      </Section>

      {/* Anchoring */}
      <Section title="Anchoring conditions">
        <div style={{ display: "grid", gap: 12 }}>
          {(p.anchoring || []).map((a, idx) => (
            <div key={idx} style={s.anchorCard}>
              <div style={s.anchorTop}>
                <div>
                  <div style={s.anchorTitle}>Anchoring #{idx}</div>
                  <div style={s.anchorSub}>Surface director n = (sinθ cosφ, sinθ sinφ, cosθ)</div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.smallBtn} onClick={() => duplicateAnchoring(idx)}>Duplicate</button>
                  <button style={s.smallBtnDanger} onClick={() => removeAnchoring(idx)}>Remove</button>
                </div>
              </div>

              <Row cols={4}>
                <Input
                  label="anchoring_type"
                  value={a.type}
                  onChange={(v) => updateAnchor(setP, p, idx, { type: v })}
                  placeholder="rp, fg, homeotropic..."
                />
                <Input
                  label="W"
                  value={a.W}
                  onChange={(v) => updateAnchor(setP, p, idx, { W: v })}
                />
                <Input
                  label="phi_s"
                  value={a.phi_s}
                  onChange={(v) => updateAnchor(setP, p, idx, { phi_s: v })}
                />
                <Input
                  label="theta_s"
                  value={a.theta_s}
                  onChange={(v) => updateAnchor(setP, p, idx, { theta_s: v })}
                />
              </Row>
            </div>
          ))}

          <button style={s.btnGhostWide} onClick={addAnchoring}>
            + Add Anchoring
          </button>
        </div>
      </Section>

      {/* Footer actions */}
      <div style={s.footer}>
        <div style={s.footerLeft}>
          <div style={s.footerTitle}>Run simulation</div>
          <div style={s.footerSub}>Choose CPU or GPU. A loading screen + live logs will be added next.</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              ...s.runCPU,
              transform: hoverCPU ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoverCPU ? "0 16px 30px rgba(29,29,29,0.12)" : s.runCPU.boxShadow
            }}
            onMouseEnter={() => setHoverCPU(true)}
            onMouseLeave={() => setHoverCPU(false)}
            onClick={runCPU}
          >
            Run CPU
          </button>

          <button
            style={{
              ...s.runGPU,
              transform: hoverGPU ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoverGPU ? "0 18px 42px rgba(230,57,70,0.28)" : s.runGPU.boxShadow
            }}
            onMouseEnter={() => setHoverGPU(true)}
            onMouseLeave={() => setHoverGPU(false)}
            onClick={runGPU}
          >
            Run GPU
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Small components ---------- */

function Section({ title, children }) {
  return (
    <section style={s.section}>
      <div style={s.sectionTitle}>{title}</div>
      {children}
    </section>
  );
}

function Row({ cols = 2, children }) {
  return (
    <div
      style={{
        display: "grid",
        gap: 12,
        gridTemplateColumns:
          cols === 4 ? "1fr 1fr 1fr 1fr" : cols === 3 ? "1fr 1fr 1fr" : "1fr 1fr",
      }}
    >
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder }) {
  return (
    <label style={s.field}>
      <div style={s.label}>{label}</div>
      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={s.input}
      />
    </label>
  );
}

function Hint({ children }) {
  return <div style={s.hint}>{children}</div>;
}

function Divider() {
  return <div style={s.divider} />;
}

function updateAnchor(setP, p, idx, patch) {
  const arr = [...(p.anchoring || [])];
  arr[idx] = { ...arr[idx], ...patch };
  setP((prev) => ({ ...prev, anchoring: arr }));
}

/* ---------- Defaults ---------- */

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

/* ---------- Styles ---------- */

const s = {
  page: { display: "grid", gap: "var(--gap)" },

  header: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 12px 28px rgba(29,29,29,0.08)",
    padding: 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  hTitle: { fontSize: 18, fontWeight: 950, letterSpacing: -0.2 },
  hSub: { marginTop: 2, fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  section: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 12px 28px rgba(29,29,29,0.06)",
    padding: 16,
    display: "grid",
    gap: 12
  },

  sectionTitle: { fontWeight: 950, letterSpacing: -0.2 },

  field: { display: "grid", gap: 6 },
  label: { fontSize: 12, color: "var(--muted)", fontWeight: 850 },

  input: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    outline: "none",
    transition: "box-shadow 120ms ease, border-color 120ms ease",
  },

  hint: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 700,
    lineHeight: 1.5
  },

  divider: { height: 1, background: "var(--border)", margin: "2px 0" },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900
  },

  btnGhostWide: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.35)",
    color: "var(--black)",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    fontWeight: 950
  },

  anchorCard: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10,
    background: "rgba(245,247,248,0.55)"
  },

  anchorTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  anchorTitle: { fontWeight: 950 },
  anchorSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 2 },

  smallBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12
  },

  smallBtnDanger: {
    border: "1px solid rgba(230,57,70,0.25)",
    background: "rgba(230,57,70,0.10)",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12
  },

  footer: {
    position: "sticky",
    bottom: 0,
    zIndex: 5,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "0 14px 34px rgba(29,29,29,0.10)",
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },

  footerLeft: { display: "grid", gap: 2 },
  footerTitle: { fontWeight: 950 },
  footerSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  runCPU: {
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.88)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
    boxShadow: "0 10px 22px rgba(29,29,29,0.06)"
  },

  runGPU: {
    border: "1px solid rgba(230,57,70,0.25)",
    background: "linear-gradient(180deg, rgba(230,57,70,1), rgba(190,30,44,1))",
    color: "white",
    borderRadius: 14,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
    boxShadow: "0 14px 30px rgba(230,57,70,0.20)"
  }
};