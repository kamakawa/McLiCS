import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";

const api = window.mclist;

export default function Setup() {
  const nav = useNavigate();
  const loc = useLocation();

  const initial = useMemo(() => loc.state?.params || defaultParams(), [loc.state]);
  const [p, setP] = useState(initial);

  const [hoverCPU, setHoverCPU] = useState(false);
  const [hoverGPU, setHoverGPU] = useState(false);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  // Anchoring list: cada item vira:
  // anchoring_type <id> <type>
  // W <id> <value>
  // (opcional) phi_s <id> <value> / theta_s <id> <value>
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
    try {
      if (!api) {
        alert("This feature works only inside the Electron app.");
        return;
      }
      const paramText = buildParamTxt(p);
      const res = await api.exportParamFile(paramText);
      if (res?.canceled) return;
      alert(`Saved: ${res.filePath}`);
    } catch (e) {
      console.error(e);
      alert(`Export error:\n${String(e)}`);
    }
  };

  const run = async (mode) => {
    try {
      if (!api) {
        alert("Run only works inside the Electron app.");
        return;
      }

      const paramText = buildParamTxt(p);

      const res = await api.runSim({ mode, paramText });
      if (!res?.id) {
        alert(`Run returned an unexpected response:\n${JSON.stringify(res, null, 2)}`);
        return;
      }
      nav("/running", { state: { runId: res.id } });
    } catch (e) {
      console.error(e);
      alert(`Run ${mode.toUpperCase()} error:\n${String(e)}`);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={s.btnGhost} className="ui-hover" onClick={() => nav("/")}>
            ← Back
          </button>
          <div>
            <div style={s.hTitle}>Project Setup</div>
            <div style={s.hSub}>Configure parameters and run on CPU or GPU.</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button style={s.btnGhost} className="ui-hover" onClick={exportParam}>
            Export parameters
          </button>
        </div>
      </div>

      <Section title="Grid">
        <Row cols={3}>
          <Input label="Nx" value={p.Nx} onChange={(v) => setField("Nx", v)} />
          <Input label="Ny" value={p.Ny} onChange={(v) => setField("Ny", v)} />
          <Input label="Nz" value={p.Nz} onChange={(v) => setField("Nz", v)} />
        </Row>
      </Section>

      <Section title="Monte Carlo">
        <Row cols={4}>
          <Input label="MCS" value={p.MCS} onChange={(v) => setField("MCS", v)} />
          <Input label="MCT" value={p.MCT} onChange={(v) => setField("MCT", v)} />
          <Input label="fn" value={p.fn} onChange={(v) => setField("fn", v)} />
          <Input label="nk" value={p.nk} onChange={(v) => setField("nk", v)} placeholder="optional" />
        </Row>
      </Section>

      <Section title="Temperature schedule">
        <Row cols={3}>
          <Input label="Ti" value={p.Ti} onChange={(v) => setField("Ti", v)} />
          <Input label="Tf" value={p.Tf} onChange={(v) => setField("Tf", v)} />
          <Input label="dT" value={p.dT} onChange={(v) => setField("dT", v)} />
        </Row>
      </Section>

      <Section title="Potential / physics">
        <Row cols={2}>
          <Input label="potential" value={p.potential} onChange={(v) => setField("potential", v)} />
          <Input label="p0" value={p.p0} onChange={(v) => setField("p0", v)} />
        </Row>
        <Row cols={3}>
          <Input label="k11" value={p.k11} onChange={(v) => setField("k11", v)} />
          <Input label="k22" value={p.k22} onChange={(v) => setField("k22", v)} />
          <Input label="k33" value={p.k33} onChange={(v) => setField("k33", v)} />
        </Row>
      </Section>

      <Section title="Initialization & evolution">
        <Row cols={2}>
          <Input label="ic" value={p.ic} onChange={(v) => setField("ic", v)} />
          <Input label="evol" value={p.evol} onChange={(v) => setField("evol", v)} placeholder="thermal" />
        </Row>
      </Section>

      <Section title="Geometry & boundaries">
        <Row cols={2}>
          <Input label="geometry" value={p.geometry} onChange={(v) => setField("geometry", v)} />
          <Input label="boundary_file" value={p.boundary_file} onChange={(v) => setField("boundary_file", v)} placeholder="optional" />
        </Row>
        <Row cols={3}>
          <Input label="xbound" value={p.xbound} onChange={(v) => setField("xbound", v)} />
          <Input label="ybound" value={p.ybound} onChange={(v) => setField("ybound", v)} />
          <Input label="zbound" value={p.zbound} onChange={(v) => setField("zbound", v)} />
        </Row>
      </Section>

      <Section title="Anchoring conditions (optional)">
        <div style={{ display: "grid", gap: 12 }}>
          {(p.anchoring || []).map((a, idx) => (
            <div key={idx} style={s.anchorCard}>
              <div style={s.anchorTop}>
                <div>
                  <div style={s.anchorTitle}>Anchoring #{idx}</div>
                  <div style={s.anchorSub}>
                    Format: anchoring_type {idx} TYPE • W {idx} VALUE
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button style={s.smallBtn} className="ui-hover" onClick={() => duplicateAnchoring(idx)}>
                    Duplicate
                  </button>
                  <button style={s.smallBtnDanger} className="ui-hover" onClick={() => removeAnchoring(idx)}>
                    Remove
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
                />
                <Input
                  label="phi_s (optional)"
                  value={a.phi_s}
                  onChange={(v) => updateAnchor(setP, idx, { phi_s: v })}
                  placeholder="e.g. 0"
                />
                <Input
                  label="theta_s (optional)"
                  value={a.theta_s}
                  onChange={(v) => updateAnchor(setP, idx, { theta_s: v })}
                  placeholder="e.g. 90"
                />
              </Row>

              <div style={s.anchorHint}>
                If you don’t want anchoring: remove all cards. The generated param.txt will contain nothing about anchoring.
              </div>
            </div>
          ))}

          <button style={s.btnGhostWide} className="ui-hover" onClick={addAnchoring}>
            + Add Anchoring
          </button>
        </div>
      </Section>

      <div style={s.footer}>
        <div style={s.footerLeft}>
          <div style={s.footerTitle}>Run simulation</div>
          <div style={s.footerSub}>CPU: make CPU → mc_sim_cpu • GPU: make → mc_sim</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              ...s.runCPU,
              transform: hoverCPU ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoverCPU ? "0 16px 30px rgba(29,29,29,0.12)" : s.runCPU.boxShadow,
            }}
            className="ui-hover"
            onMouseEnter={() => setHoverCPU(true)}
            onMouseLeave={() => setHoverCPU(false)}
            onClick={() => run("cpu")}
          >
            Run CPU
          </button>

          <button
            style={{
              ...s.runGPU,
              transform: hoverGPU ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoverGPU ? "0 18px 42px rgba(230,57,70,0.28)" : s.runGPU.boxShadow,
            }}
            className="ui-hover"
            onMouseEnter={() => setHoverGPU(true)}
            onMouseLeave={() => setHoverGPU(false)}
            onClick={() => run("gpu")}
          >
            Run GPU
          </button>
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
  const gridTemplateColumns =
    cols === 4 ? "1fr 1fr 1fr 1fr" : cols === 3 ? "1fr 1fr 1fr" : "1fr 1fr";
  return <div style={{ display: "grid", gap: 12, gridTemplateColumns }}>{children}</div>;
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

function updateAnchor(setP, idx, patch) {
  setP((prev) => {
    const arr = [...(prev.anchoring || [])];
    arr[idx] = { ...arr[idx], ...patch };
    return { ...prev, anchoring: arr.map((a, i) => ({ ...a, id: i })) };
  });
}

/* ================= param.txt builder ================= */

function clean(s) {
  return String(s ?? "").trim();
}

function push(lines, key, val) {
  const v = clean(val);
  if (!v) return;
  lines.push(`${key}  ${v}`);
}

function push3(lines, key, a, b) {
  const v1 = clean(a);
  const v2 = clean(b);
  if (!v1 || !v2) return;
  lines.push(`${key}  ${v1}  ${v2}`);
}

function buildParamTxt(p) {
  const lines = [];

  // core
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

  // IMPORTANTE: evol vem depois (igual seus exemplos)
  lines.push("");
  push(lines, "evol", p.evol || "thermal");

  // ===== Anchoring (100% opcional) =====
  // Só escreve se existir pelo menos 1 com type e W preenchidos.
  const anchors = (p.anchoring || [])
    .map((a, i) => ({ ...a, id: i }))
    .filter((a) => clean(a.type) && clean(a.W));

  if (anchors.length) {
    lines.push("");

    anchors.forEach((a) => {
      // formato do seu exemplo:
      // anchoring_type <id> <type>
      // W <id> <value>
      push3(lines, "anchoring_type", a.id, a.type);
      push3(lines, "W", a.id, a.W);

      // opcionais (só se o usuário preencher)
      if (clean(a.phi_s)) push3(lines, "phi_s", a.id, a.phi_s);
      if (clean(a.theta_s)) push3(lines, "theta_s", a.id, a.theta_s);

      lines.push("");
    });
  }

  // evita 3+ linhas em branco e garante newline final
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

    // COMEÇA SEM anchoring (pra não quebrar quem não quer)
    anchoring: [],
  };
}

/* ================= styles ================= */

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
    gap: 12,
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
    gap: 12,
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
  },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
  },

  btnGhostWide: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.35)",
    color: "var(--black)",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    fontWeight: 950,
  },

  anchorCard: {
    border: "1px solid rgba(29,29,29,0.08)",
    borderRadius: 16,
    padding: 12,
    display: "grid",
    gap: 10,
    background: "rgba(245,247,248,0.55)",
  },

  anchorTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 },
  anchorTitle: { fontWeight: 950 },
  anchorSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700, marginTop: 2 },
  anchorHint: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  smallBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
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
    gap: 12,
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
    boxShadow: "0 10px 22px rgba(29,29,29,0.06)",
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
    boxShadow: "0 14px 30px rgba(230,57,70,0.20)",
  },
};