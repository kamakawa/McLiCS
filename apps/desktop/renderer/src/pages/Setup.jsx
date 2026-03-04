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
  const [hoverExport, setHoverExport] = useState(false);
  const [hoverAddAnch, setHoverAddAnch] = useState(false);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  // ===== Anchoring (optional, backend format: anchoring_type i type ; W i value) =====
  const addAnchoring = () => {
    const nextId = (p.anchoring?.length || 0);
    setP((prev) => ({
      ...prev,
      anchoring: [...(prev.anchoring || []), { id: nextId, type: "homeotropic", W: "1" }],
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

  const updateAnchor = (idx, patch) => {
    setP((prev) => {
      const arr = [...(prev.anchoring || [])];
      arr[idx] = { ...arr[idx], ...patch };
      return { ...prev, anchoring: arr.map((a, i) => ({ ...a, id: i })) };
    });
  };

  const exportParam = async () => {
    try {
      if (!api) {
        alert("This feature works only inside the Electron app (not in the browser).");
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
        alert(
          "Run only works inside the Electron app.\n\nStart Electron:\ncd apps/desktop/main && npm start"
        );
        return;
      }

      const paramText = buildParamTxt(p);
      const res = await api.runSim({ mode, paramText });

      if (!res?.id) {
        alert(`Run returned an unexpected response:\n${JSON.stringify(res, null, 2)}`);
        return;
      }

      nav("/running", { state: { runId: res.id, runMeta: res } });
    } catch (e) {
      console.error(e);
      alert(`Run ${String(mode).toUpperCase()} error:\n${String(e)}`);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={s.btnGhost} onClick={() => nav("/")}>
            ← Back
          </button>

          <div>
            <div style={s.hTitle}>Project Setup</div>
            <div style={s.hSub}>
              Configure parameters and run on CPU or GPU. Anchoring is optional.
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              ...s.btnGhost,
              ...(hoverExport ? s.btnGhostHover : null),
            }}
            onMouseEnter={() => setHoverExport(true)}
            onMouseLeave={() => setHoverExport(false)}
            onClick={exportParam}
          >
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
          <Input
            label="evol"
            value={p.evol}
            onChange={(v) => setField("evol", sanitizeOneWord(v))}
            placeholder='e.g., "thermal"'
          />
        </Row>

        <div style={s.hint}>
          Note: <b>evol must be a single word</b> (example: thermal). The generator will automatically remove any
          pasted terminal prompt.
        </div>
      </Section>

      <Section title="Geometry & boundaries">
        <Row cols={2}>
          <Input label="geometry" value={p.geometry} onChange={(v) => setField("geometry", v)} />
          <Input
            label="boundary_file"
            value={p.boundary_file}
            onChange={(v) => setField("boundary_file", v)}
            placeholder="optional"
          />
        </Row>

        <Row cols={3}>
          <Input label="xbound" value={p.xbound} onChange={(v) => setField("xbound", v)} />
          <Input label="ybound" value={p.ybound} onChange={(v) => setField("ybound", v)} />
          <Input label="zbound" value={p.zbound} onChange={(v) => setField("zbound", v)} />
        </Row>

        <div style={s.hint}>
          Bounds must be single words too (example: periodic / free). The generator sanitizes them automatically.
        </div>
      </Section>

      <Section title="Anchoring (optional)">
        <div style={s.hint}>
          If you don’t add anchoring entries, <b>nothing about anchoring</b> will be written to <code>param.txt</code>.
        </div>

        {(p.anchoring || []).length === 0 ? (
          <div style={s.emptyAnch}>
            <div style={{ fontWeight: 950, letterSpacing: -0.2 }}>No anchoring configured</div>
            <div style={{ color: "var(--muted)", fontWeight: 750, fontSize: 12, lineHeight: 1.45 }}>
              Output format:
              <div style={{ marginTop: 8, ...s.mono, fontSize: 12 }}>
                anchoring_type i type
                <br />
                W i value
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {(p.anchoring || []).map((a, idx) => (
              <div key={idx} style={s.anchorCard}>
                <div style={s.anchorTop}>
                  <div>
                    <div style={s.anchorTitle}>Anchoring #{idx}</div>
                    <div style={s.anchorSub}>
                      Writes: <span style={s.mono}>anchoring_type {idx} {sanitizeOneWord(a.type)}</span> and{" "}
                      <span style={s.mono}>W {idx} {sanitizeOneWord(a.W)}</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={s.smallBtn} onClick={() => duplicateAnchoring(idx)}>
                      Duplicate
                    </button>
                    <button style={s.smallBtnDanger} onClick={() => removeAnchoring(idx)}>
                      Remove
                    </button>
                  </div>
                </div>

                <Row cols={2}>
                  <Input
                    label="anchoring_type"
                    value={a.type}
                    onChange={(v) => updateAnchor(idx, { type: v })}
                    placeholder="e.g., homeotropic"
                  />
                  <Input
                    label={`W (index ${idx})`}
                    value={a.W}
                    onChange={(v) => updateAnchor(idx, { W: v })}
                    placeholder="e.g., 1"
                  />
                </Row>
              </div>
            ))}
          </div>
        )}

        <button
          style={{
            ...s.btnGhostWide,
            ...(hoverAddAnch ? s.btnGhostWideHover : null),
          }}
          onMouseEnter={() => setHoverAddAnch(true)}
          onMouseLeave={() => setHoverAddAnch(false)}
          onClick={addAnchoring}
        >
          + Add Anchoring
        </button>
      </Section>

      <div style={s.footer}>
        <div style={s.footerLeft}>
          <div style={s.footerTitle}>Run simulation</div>
          <div style={s.footerSub}>Choose CPU or GPU. You’ll see the execution console next.</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            style={{
              ...s.runCPU,
              transform: hoverCPU ? "translateY(-2px)" : "translateY(0)",
              boxShadow: hoverCPU ? "0 16px 30px rgba(29,29,29,0.12)" : s.runCPU.boxShadow,
            }}
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
            onMouseEnter={() => setHoverGPU(true)}
            onMouseLeave={() => setHoverGPU(false)}
            onClick={() => run("gpu")}
          >
            Run GPU
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================= helpers / components ================= */

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

/* ================== SANITIZATION (THE FIX) ================== */

// This is the key fix: it deletes terminal prompts / extra tokens.
function sanitizeOneWord(v) {
  let s = String(v ?? "");
  s = s.replace(/\r/g, "").replace(/\n+/g, " ").trim();
  if (!s) return "";
  return s.split(/\s+/)[0];
}

function sanitizeFreeText(v) {
  let s = String(v ?? "");
  return s.replace(/\r/g, "").trim();
}

/* ================= param writer ================= */

function buildParamTxt(p) {
  const lines = [];

  pushValue(lines, "Nx", p.Nx);
  pushValue(lines, "Ny", p.Ny);
  pushValue(lines, "Nz", p.Nz);
  pushValue(lines, "MCS", p.MCS);
  pushValue(lines, "MCT", p.MCT);
  pushOneWord(lines, "potential", p.potential);

  lines.push("");
  pushValue(lines, "Ti", p.Ti);
  pushValue(lines, "Tf", p.Tf);
  pushValue(lines, "dT", p.dT);
  pushValue(lines, "p0", p.p0);

  lines.push("");
  pushValue(lines, "fn", p.fn);
  if (sanitizeOneWord(p.nk)) pushValue(lines, "nk", sanitizeOneWord(p.nk));

  lines.push("");
  pushValue(lines, "k11", p.k11);
  pushValue(lines, "k22", p.k22);
  pushValue(lines, "k33", p.k33);

  lines.push("");
  pushOneWord(lines, "ic", p.ic);

  lines.push("");
  pushOneWord(lines, "geometry", p.geometry);
  pushOneWord(lines, "xbound", p.xbound);
  pushOneWord(lines, "ybound", p.ybound);
  pushOneWord(lines, "zbound", p.zbound);
  if (sanitizeOneWord(p.boundary_file)) pushOneWord(lines, "boundary_file", p.boundary_file);

  lines.push("");
  // IMPORTANT: evol MUST be one word
  pushOneWord(lines, "evol", p.evol);

  // ===== Anchoring (optional) =====
  if (p.anchoring?.length) {
    lines.push("");

    const list = (p.anchoring || []).map((a) => ({
      type: sanitizeOneWord(a.type),
      W: sanitizeOneWord(a.W),
    }));

    list.forEach((a, i) => {
      if (!a.type) return;
      lines.push(`anchoring_type  ${i}  ${a.type}`);
      if (a.W) lines.push(`W  ${i}  ${a.W}`);
      lines.push("");
    });
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n");
}

function pushValue(lines, key, val) {
  if (val === undefined || val === null) return;
  const v = sanitizeFreeText(val);
  if (!String(v).trim()) return;
  // keep full value (numbers)
  lines.push(`${key}  ${String(v).trim()}`);
}

function pushOneWord(lines, key, val) {
  const v = sanitizeOneWord(val);
  if (!v) return;
  lines.push(`${key}  ${v}`);
}

/* ================= defaults ================= */

function defaultParams() {
  return {
    Nx: "20",
    Ny: "20",
    Nz: "10",
    MCS: "1000",
    MCT: "20000",
    potential: "ghrl",

    Ti: "0.3",
    Tf: "0.1",
    dT: "-0.05",
    p0: "0",

    fn: "2",
    nk: "",

    k11: "1",
    k22: "1.0",
    k33: "1",

    ic: "random",
    evol: "thermal",

    geometry: "slab",
    boundary_file: "",
    xbound: "periodic",
    ybound: "periodic",
    zbound: "periodic",

    anchoring: [], // empty by default => no anchoring lines
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

  hint: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 750,
    lineHeight: 1.45,
  },

  mono: { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease",
  },

  btnGhostHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 14px 30px rgba(29,29,29,0.10)",
    background: "rgba(245,247,248,0.85)",
    borderColor: "rgba(29,29,29,0.18)",
  },

  btnGhostWide: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.35)",
    color: "var(--black)",
    borderRadius: 16,
    padding: "12px 12px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease",
  },

  btnGhostWideHover: {
    transform: "translateY(-1px)",
    boxShadow: "0 14px 30px rgba(29,29,29,0.10)",
    background: "rgba(245,247,248,0.75)",
    borderColor: "rgba(29,29,29,0.22)",
  },

  emptyAnch: {
    border: "1px dashed rgba(29,29,29,0.18)",
    background: "rgba(245,247,248,0.35)",
    borderRadius: 16,
    padding: 14,
    display: "grid",
    gap: 6,
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

  smallBtn: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease, background 140ms ease, border-color 140ms ease",
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
    transition: "transform 140ms ease, box-shadow 140ms ease, filter 140ms ease",
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