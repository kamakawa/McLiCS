import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useUi } from "../components/Shell.jsx";
import { ParamHelp, ParameterHelpPanel } from "../data/parameterHelp.jsx";
import { getHelpUi } from "../data/parameterHelp.js";

const api = window.mclist;

const SELECT_OPTIONS = {
  potential: ["ll", "ghrl", "pear"],
  ic: ["random", "homogeneous", "ic_file", "cholesteric"],
  evol: ["thermal", "step", "quench", "electric"],
  geometry: ["bulk", "slab", "sphere", "custom"],
  xbound: ["free", "periodic"],
  ybound: ["free", "periodic"],
  zbound: ["free", "periodic"],
  anchoring_type: [
    "rp",
    "fg",
    "homeotropic",
    "strong",
    "rp_ghrl",
    "fg_ghrl",
    "homeotropic_ghrl",
    "strong_ghrl",
  ],
    nk: ["1"],
};

const INTEGER_FIELDS = new Set(["Nx", "Ny", "Nz", "MCS", "MCT", "fn"]);
const NUMERIC_FIELDS = new Set(["Ti", "Tf", "dT", "p0", "k11", "k22", "k33"]);
const ANGLE_REQUIRED_TYPES = new Set(["rp", "strong", "rp_ghrl", "strong_ghrl"]);

export default function Setup() {
  const nav = useNavigate();
  const loc = useLocation();
  const { t, lang } = useUi();
  const helpUi = getHelpUi(lang);

  const initial = useMemo(() => normalizeParams(loc.state?.params || defaultParams()), [loc.state]);
  const [p, setP] = useState(initial);
  const [hoverCPU, setHoverCPU] = useState(false);
  const [hoverGPU, setHoverGPU] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const validation = useMemo(() => validateParams(p, lang), [p, lang]);

  useEffect(() => {
    setP(normalizeParams(loc.state?.params || defaultParams()));
  }, [loc.state]);

  const setField = (k, v) => setP((prev) => ({ ...prev, [k]: v }));

  const addAnchoring = () => {
    const nextId = p.anchoring?.length || 0;
    setP((prev) => ({
      ...prev,
      anchoring: [
        ...(prev.anchoring || []),
        { id: nextId, type: "homeotropic", W: "", phi_s: "", theta_s: "" },
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
    if (!validation.ok) {
      alert(validation.summary);
      return;
    }

    try {
      if (!api) return alert(t("electronOnlyFeature"));
      const paramText = buildParamTxt(normalizeParams(p));
      const res = await api.exportParamFile(paramText);
      if (res?.canceled) return;
      alert(t("savedAt", { path: res.filePath }));
    } catch (e) {
      console.error(e);
      alert(t("exportError", { error: String(e) }));
    }
  };

  const run = async (mode) => {
    if (!validation.ok) {
      alert(validation.summary);
      return;
    }

    try {
      if (!api) return alert(t("electronOnlyRun"));
      const paramText = buildParamTxt(normalizeParams(p));
      const res = await api.runSim({ mode, paramText });
      if (!res?.id) {
        alert(t("unexpectedRunResponse", { data: JSON.stringify(res, null, 2) }));
        return;
      }
      nav("/running", {
        state: {
          runId: res.id,
          runMeta: { ...res, mode },
          setupParams: normalizeParams(p),
        },
      });
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
            <button
              style={{ ...s.btnGhost, ...(showHelpGuide ? s.btnGhostActive : null) }}
              className="ui-hover"
              onClick={() => setShowHelpGuide((v) => !v)}
            >
              {showHelpGuide ? helpUi.guideButtonHide : helpUi.guideButtonShow}
            </button>

            <button
              style={{ ...s.btnGhost, ...(showAdvanced ? s.btnGhostActive : null) }}
              className="ui-hover"
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {t("advancedFields")}
            </button>

            <button style={s.btnGhost} className="ui-hover" onClick={exportParam}>
              {t("exportParameters")}
            </button>
          </div>
        </div>

        {!validation.ok ? (
          <div style={s.errorPanel}>
            <div style={s.errorPanelTitle}>
              {lang?.startsWith("pt")
                ? "Há campos inválidos na configuração"
                : "There are invalid fields in the configuration"}
            </div>
            <ul style={s.errorList}>
              {validation.globalErrors.map((msg, idx) => (
                <li key={idx}>{msg}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {showHelpGuide ? (
          <div style={s.helpGuide}>
            <ParameterHelpPanel />
          </div>
        ) : null}

        <Section title={t("grid")}>
          <Row cols={3}>
            <Input
              label="Nx"
              helpKey="Nx"
              value={p.Nx}
              onChange={(v) => setField("Nx", v)}
              compact
              error={validation.fieldErrors.Nx}
            />
            <Input
              label="Ny"
              helpKey="Ny"
              value={p.Ny}
              onChange={(v) => setField("Ny", v)}
              compact
              error={validation.fieldErrors.Ny}
            />
            <Input
              label="Nz"
              helpKey="Nz"
              value={p.Nz}
              onChange={(v) => setField("Nz", v)}
              compact
              error={validation.fieldErrors.Nz}
            />
          </Row>
        </Section>

        <Section title={t("monteCarlo")}>
          <Row cols={3}>
            <Input
              label="MCS"
              helpKey="MCS"
              value={p.MCS}
              onChange={(v) => setField("MCS", v)}
              compact
              error={validation.fieldErrors.MCS}
            />
            <Input
              label="MCT"
              helpKey="MCT"
              value={p.MCT}
              onChange={(v) => setField("MCT", v)}
              compact
              error={validation.fieldErrors.MCT}
            />
            <Input
              label="fn"
              helpKey="fn"
              value={p.fn}
              onChange={(v) => setField("fn", v)}
              compact
              error={validation.fieldErrors.fn}
            />
          </Row>
        </Section>

        <Section title={t("temperatureSchedule")}>
          <Row cols={3}>
            <Input
              label="Ti"
              helpKey="Ti"
              value={p.Ti}
              onChange={(v) => setField("Ti", v)}
              compact
              error={validation.fieldErrors.Ti}
            />
            <Input
              label="Tf"
              helpKey="Tf"
              value={p.Tf}
              onChange={(v) => setField("Tf", v)}
              compact
              error={validation.fieldErrors.Tf}
            />
            <Input
              label="dT"
              helpKey="dT"
              value={p.dT}
              onChange={(v) => setField("dT", v)}
              compact
              error={validation.fieldErrors.dT}
            />
          </Row>
        </Section>

        <Section title={t("potentialPhysics")}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 0.6fr",
              gap: 20,
            }}
          >
            <SelectField
              label="potential"
              helpKey="potential"
              value={p.potential}
              onChange={(v) => setField("potential", v)}
              options={SELECT_OPTIONS.potential}
              error={validation.fieldErrors.potential}
            />
            <Input
              label="p0"
              helpKey="p0"
              value={p.p0}
              onChange={(v) => setField("p0", v)}
              compact
              error={validation.fieldErrors.p0}
            />
          </div>

          <Row cols={3}>
            <Input
              label="k11"
              helpKey="k11"
              value={p.k11}
              onChange={(v) => setField("k11", v)}
              compact
              error={validation.fieldErrors.k11}
            />
            <Input
              label="k22"
              helpKey="k22"
              value={p.k22}
              onChange={(v) => setField("k22", v)}
              compact
              error={validation.fieldErrors.k22}
            />
            <Input
              label="k33"
              helpKey="k33"
              value={p.k33}
              onChange={(v) => setField("k33", v)}
              compact
              error={validation.fieldErrors.k33}
            />
          </Row>
        </Section>
                <Section title={t("initializationEvolution")}>
          <Row cols={2}>
            <SelectField
              label="ic"
              helpKey="ic"
              value={p.ic}
              onChange={(v) => setField("ic", v)}
              options={SELECT_OPTIONS.ic}
              error={validation.fieldErrors.ic}
            />
            <SelectField
              label="evol"
              helpKey="evol"
              value={p.evol}
              onChange={(v) => setField("evol", v)}
              options={SELECT_OPTIONS.evol}
              error={validation.fieldErrors.evol}
            />
          </Row>

          {p.ic === "ic_file" ? (
            <Row cols={2}>
              <Input
                label="ic_file"
                value={p.ic_file}
                onChange={(v) => setField("ic_file", v)}
                placeholder={
                  lang?.startsWith("pt")
                    ? "arquivo .csv das condições iniciais"
                    : "initial condition .csv file"
                }
                error={validation.fieldErrors.ic_file}
              />
              <div />
            </Row>
          ) : null}
        </Section>

        <Section title={t("geometryBoundaries")}>
          <Row cols={2}>
            <SelectField
              label="geometry"
              helpKey="geometry"
              value={p.geometry}
              onChange={(v) => setField("geometry", v)}
              options={SELECT_OPTIONS.geometry}
              error={validation.fieldErrors.geometry}
            />
            <Input
              label="boundary_file"
              helpKey="boundary_file"
              value={p.boundary_file}
              onChange={(v) => setField("boundary_file", v)}
              placeholder={t("optional")}
              error={validation.fieldErrors.boundary_file}
              disabled={p.geometry !== "custom"}
            />
          </Row>

          <Row cols={3}>
            <SelectField
              label="xbound"
              helpKey="xbound"
              value={p.xbound}
              onChange={(v) => setField("xbound", v)}
              options={SELECT_OPTIONS.xbound}
              error={validation.fieldErrors.xbound}
            />
            <SelectField
              label="ybound"
              helpKey="ybound"
              value={p.ybound}
              onChange={(v) => setField("ybound", v)}
              options={SELECT_OPTIONS.ybound}
              error={validation.fieldErrors.ybound}
            />
            <SelectField
              label="zbound"
              helpKey="zbound"
              value={p.zbound}
              onChange={(v) => setField("zbound", v)}
              options={SELECT_OPTIONS.zbound}
              error={validation.fieldErrors.zbound}
            />
          </Row>
        </Section>

        <Section title={t("anchoringOptional")}>
          <div style={s.anchorWrap}>
            {(p.anchoring || []).map((a, idx) => {
              const anchorErrors = validation.anchorErrors[idx] || {};
              const requiresAngles = ANGLE_REQUIRED_TYPES.has(
                String(a.type || "").toLowerCase()
              );

              return (
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
                    <SelectField
                      label="anchoring_type"
                      helpKey="anchoring_type"
                      value={a.type}
                      onChange={(v) => updateAnchor(setP, idx, { type: v })}
                      options={SELECT_OPTIONS.anchoring_type}
                      error={anchorErrors.type}
                    />
                    <Input
                      label="W"
                      helpKey="W"
                      value={a.W}
                      onChange={(v) => updateAnchor(setP, idx, { W: v })}
                      placeholder="e.g. 1"
                      compact
                      error={anchorErrors.W}
                    />
                    <Input
                      label={`phi_s (${
                        requiresAngles
                          ? lang?.startsWith("pt")
                            ? "obrigatório"
                            : "required"
                          : t("optional")
                      })`}
                      helpKey="phi_s"
                      value={a.phi_s}
                      onChange={(v) => updateAnchor(setP, idx, { phi_s: v })}
                      placeholder="e.g. 0"
                      compact
                      error={anchorErrors.phi_s}
                    />
                    <Input
                      label={`theta_s (${
                        requiresAngles
                          ? lang?.startsWith("pt")
                            ? "obrigatório"
                            : "required"
                          : t("optional")
                      })`}
                      helpKey="theta_s"
                      value={a.theta_s}
                      onChange={(v) => updateAnchor(setP, idx, { theta_s: v })}
                      placeholder="e.g. 90"
                      compact
                      error={anchorErrors.theta_s}
                    />
                  </Row>

                  <div style={s.anchorHint}>
                    {requiresAngles
                      ? lang?.startsWith("pt")
                        ? "Esse tipo de ancoragem exige phi_s e theta_s, além de W."
                        : "This anchoring type requires phi_s and theta_s in addition to W."
                      : t("anchoringHint")}
                  </div>
                </div>
              );
            })}

            <button style={s.btnGhostWide} className="ui-hover" onClick={addAnchoring}>
              {t("addAnchoring")}
            </button>
          </div>
        </Section>

        {showAdvanced ? (
          <Section title={t("advancedFields")}>
            <Row cols={3}>
              <Input
                label="phi_0"
                value={p.phi_0}
                onChange={(v) => setField("phi_0", v)}
                compact
                error={validation.fieldErrors.phi_0}
              />
              <Input
                label="theta_0"
                value={p.theta_0}
                onChange={(v) => setField("theta_0", v)}
                compact
                error={validation.fieldErrors.theta_0}
              />
              <Input
                label="p0_i"
                value={p.p0_i}
                onChange={(v) => setField("p0_i", v)}
                compact
                error={validation.fieldErrors.p0_i}
              />
            </Row>

            <Row cols={2}>
              <Input
                label="first_file_number"
                value={p.first_file}
                onChange={(v) => setField("first_file", v)}
                compact
                error={validation.fieldErrors.first_file}
              />
              <div />
            </Row>

            <Row cols={4}>
              <Input
                label="elecX"
                value={p.elecX}
                onChange={(v) => setField("elecX", v)}
                compact
                error={validation.fieldErrors.elecX}
              />
              <Input
                label="elecY"
                value={p.elecY}
                onChange={(v) => setField("elecY", v)}
                compact
                error={validation.fieldErrors.elecY}
              />
              <Input
                label="elecZ"
                value={p.elecZ}
                onChange={(v) => setField("elecZ", v)}
                compact
                error={validation.fieldErrors.elecZ}
              />
              <Input
                label="elecA"
                value={p.elecA}
                onChange={(v) => setField("elecA", v)}
                compact
                error={validation.fieldErrors.elecA}
              />
            </Row>

            <Row cols={3}>
              <Input
                label="elecEi"
                value={p.elecEi}
                onChange={(v) => setField("elecEi", v)}
                compact
                error={validation.fieldErrors.elecEi}
              />
              <Input
                label="elecEf"
                value={p.elecEf}
                onChange={(v) => setField("elecEf", v)}
                compact
                error={validation.fieldErrors.elecEf}
              />
              <Input
                label="elecdE"
                value={p.elecdE}
                onChange={(v) => setField("elecdE", v)}
                compact
                error={validation.fieldErrors.elecdE}
              />
            </Row>
          </Section>
        ) : null}

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
              disabled={!validation.ok}
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
              disabled={!validation.ok}
            >
              {t("runGPU")}
            </button>
          </div>
        </div>
              </div>

      <style>{`
        .ui-hover:hover{
          transform: translateY(-1px);
          box-shadow: 0 14px 30px rgba(0,0,0,0.16);
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
          border-color: var(--line);
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

        /* =========================
              FIX PARAMETER GUIDE DARK
            ========================= */

            div[style*="isolation: isolate"] * {
              color: var(--text-main) !important;
            }

            /* textos secundários */
            div[style*="isolation: isolate"] p,
            div[style*="isolation: isolate"] span,
            div[style*="isolation: isolate"] li {
              color: var(--muted) !important;
            }

            /* títulos */
            div[style*="isolation: isolate"] h1,
            div[style*="isolation: isolate"] h2,
            div[style*="isolation: isolate"] h3,
            div[style*="isolation: isolate"] strong {
              color: var(--text-main) !important;
            }

            /* blocos */
            div[style*="isolation: isolate"] div {
              background: transparent !important;
              border-color: var(--border-color) !important;
            }

            /* código */
            div[style*="isolation: isolate"] code,
            div[style*="isolation: isolate"] pre {
              background: var(--bg-surface-2) !important;
              color: var(--text-main) !important;
              border: 1px solid var(--border-color) !important;
              border-radius: 10px;
              padding: 6px 8px;
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

function Input({
  label,
  helpKey,
  value,
  onChange,
  placeholder,
  compact = false,
  error,
  disabled = false,
}) {
  return (
    <label style={s.field}>
      <div style={s.labelRow}>
        <div style={s.labelGroup}>
          <div style={s.label}>{label}</div>
          {helpKey ? <ParamHelp paramKey={helpKey} /> : null}
        </div>
      </div>

      <input
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...(compact ? s.inputCompact : s.input),
          ...(error ? s.inputError : null),
          ...(disabled ? s.inputDisabled : null),
        }}
        className="setup-input"
        disabled={disabled}
      />

      {error ? <div style={s.fieldError}>{error}</div> : null}
    </label>
  );
}

function SelectField({
  label,
  helpKey,
  value,
  onChange,
  options,
  placeholder,
  compact = false,
  error,
}) {
  return (
    <label style={s.field}>
      <div style={s.labelRow}>
        <div style={s.labelGroup}>
          <div style={s.label}>{label}</div>
          {helpKey ? <ParamHelp paramKey={helpKey} /> : null}
        </div>
      </div>

      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...(compact ? s.inputCompact : s.input),
          ...(error ? s.inputError : null),
        }}
        className="setup-input"
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>

      {error ? <div style={s.fieldError}>{error}</div> : null}
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
  push(lines, "nk", "1");

  lines.push("");

  push(lines, "k11", p.k11);
  push(lines, "k22", p.k22);
  push(lines, "k33", p.k33);

  lines.push("");

  push(lines, "ic", p.ic);
  push(lines, "ic_file", p.ic_file);
  push(lines, "phi_0", p.phi_0);
  push(lines, "theta_0", p.theta_0);
  push(lines, "p0_i", p.p0_i);

  lines.push("");

  push(lines, "geometry", p.geometry);
  push(lines, "boundary_file", p.boundary_file);
  push(lines, "xbound", p.xbound);
  push(lines, "ybound", p.ybound);
  push(lines, "zbound", p.zbound);

  lines.push("");

  push(lines, "evol", p.evol || "thermal");
  push(lines, "first_file_number", p.first_file);

  lines.push("");

  push(lines, "elecX", p.elecX);
  push(lines, "elecY", p.elecY);
  push(lines, "elecZ", p.elecZ);
  push(lines, "elecA", p.elecA);
  push(lines, "elecEi", p.elecEi);
  push(lines, "elecEf", p.elecEf);
  push(lines, "elecdE", p.elecdE);

  const anchors = (p.anchoring || [])
    .map((a, i) => ({ ...a, id: i }))
    .filter((a) => clean(a.type) || clean(a.W) || clean(a.phi_s) || clean(a.theta_s));

  if (anchors.length) {
    lines.push("");

    anchors.forEach((a) => {
      if (clean(a.type)) push3(lines, "anchoring_type", a.id, a.type);
      if (clean(a.W)) push3(lines, "W", a.id, a.W);
      if (clean(a.phi_s)) push3(lines, "phi_s", a.id, a.phi_s);
      if (clean(a.theta_s)) push3(lines, "theta_s", a.id, a.theta_s);
      lines.push("");
    });
  }

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

function normalizeParams(raw) {
  const base = defaultParams();
  const p = { ...base, ...(raw || {}) };

  p.nk = "1";

  if (!Array.isArray(p.anchoring)) p.anchoring = [];
  p.anchoring = p.anchoring.map((a, i) => ({
    id: i,
    type: clean(a?.type || a?.anchoring_type || "homeotropic"),
    W: clean(a?.W),
    phi_s: clean(a?.phi_s),
    theta_s: clean(a?.theta_s),
  }));

  return p;
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
    nk: "1",
    k11: "1",
    k22: "1.0",
    k33: "1",
    ic: "random",
    ic_file: "",
    phi_0: "",
    theta_0: "",
    p0_i: "",
    evol: "thermal",
    geometry: "bulk",
    boundary_file: "",
    xbound: "periodic",
    ybound: "periodic",
    zbound: "periodic",
    first_file: "",
    elecX: "",
    elecY: "",
    elecZ: "",
    elecA: "",
    elecEi: "",
    elecEf: "",
    elecdE: "",
    anchoring: [],
  };
}
function isIntegerString(value) {
  return /^[-+]?\d+$/.test(clean(value));
}

function isNumberString(value) {
  return /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(clean(value));
}

function validateParams(p, lang) {
  const pt = String(lang || "").toLowerCase().startsWith("pt");
  const fieldErrors = {};
  const globalErrors = [];
  const anchorErrors = [];

  const req = (label) => (pt ? `${label} é obrigatório.` : `${label} is required.`);
  const intErr = (label) =>
    pt ? `${label} deve ser um inteiro válido.` : `${label} must be a valid integer.`;
  const intPosErr = (label) =>
    pt
      ? `${label} deve ser um inteiro maior que zero.`
      : `${label} must be an integer greater than zero.`;
  const numErr = (label) =>
    pt ? `${label} deve ser um número válido.` : `${label} must be a valid number.`;
  const optErr = (label, options) =>
    pt
      ? `${label} deve ser uma destas opções: ${options.join(", ")}.`
      : `${label} must be one of: ${options.join(", ")}.`;

  for (const key of INTEGER_FIELDS) {
    const v = clean(p[key]);
    if (!v) {
      fieldErrors[key] = req(key);
    } else if (!isIntegerString(v)) {
      fieldErrors[key] = intErr(key);
    } else if (Number(v) <= 0) {
      fieldErrors[key] = intPosErr(key);
    }
  }

  for (const key of NUMERIC_FIELDS) {
    const v = clean(p[key]);
    if (!v) {
      fieldErrors[key] = req(key);
    } else if (!isNumberString(v)) {
      fieldErrors[key] = numErr(key);
    }
  }

  const firstFile = clean(p.first_file);
  if (firstFile && !isIntegerString(firstFile)) {
    fieldErrors.first_file = intErr("first_file_number");
  }

  for (const key of [
    "phi_0",
    "theta_0",
    "p0_i",
    "elecX",
    "elecY",
    "elecZ",
    "elecA",
    "elecEi",
    "elecEf",
    "elecdE",
  ]) {
    const v = clean(p[key]);
    if (v && !isNumberString(v)) fieldErrors[key] = numErr(key);
  }

    if (clean(p.nk) !== "1") {
      fieldErrors.nk = pt
        ? 'nk deve ser obrigatoriamente "1".'
        : 'nk must be strictly "1".';
    }

  for (const key of ["potential", "ic", "evol", "geometry", "xbound", "ybound", "zbound"]) {
    const options = SELECT_OPTIONS[key];
    const v = clean(p[key]);
    if (!v) fieldErrors[key] = req(key);
    else if (!options.includes(v)) fieldErrors[key] = optErr(key, options);
  }

  if (p.geometry === "custom" && !clean(p.boundary_file)) {
    fieldErrors.boundary_file = pt
      ? "boundary_file é obrigatório quando geometry = custom."
      : "boundary_file is required when geometry = custom.";
  }

  if (p.ic === "ic_file" && !clean(p.ic_file)) {
    fieldErrors.ic_file = pt
      ? "ic_file é obrigatório quando ic = ic_file."
      : "ic_file is required when ic = ic_file.";
  }

  const anchors = Array.isArray(p.anchoring) ? p.anchoring : [];
  anchors.forEach((a, idx) => {
    const entry = {};
    const type = clean(a.type);
    const W = clean(a.W);
    const phi = clean(a.phi_s);
    const theta = clean(a.theta_s);

    if (!type && !W && !phi && !theta) {
      anchorErrors[idx] = entry;
      return;
    }

    if (!type) entry.type = req("anchoring_type");
    else if (!SELECT_OPTIONS.anchoring_type.includes(type)) {
      entry.type = optErr("anchoring_type", SELECT_OPTIONS.anchoring_type);
    }

    if (!W) entry.W = req("W");
    else if (!isNumberString(W)) entry.W = numErr("W");

    if (ANGLE_REQUIRED_TYPES.has(type)) {
      if (!phi) entry.phi_s = req("phi_s");
      else if (!isNumberString(phi)) entry.phi_s = numErr("phi_s");

      if (!theta) entry.theta_s = req("theta_s");
      else if (!isNumberString(theta)) entry.theta_s = numErr("theta_s");
    } else {
      if (phi && !isNumberString(phi)) entry.phi_s = numErr("phi_s");
      if (theta && !isNumberString(theta)) entry.theta_s = numErr("theta_s");
    }

    anchorErrors[idx] = entry;
  });

  Object.values(fieldErrors).forEach((msg) => globalErrors.push(msg));
  anchorErrors.forEach((entry, idx) => {
    Object.values(entry || {}).forEach((msg) =>
      globalErrors.push(`Anchoring #${idx}: ${msg}`)
    );
  });

  const summary = globalErrors.length
    ? pt
      ? `Corrija os campos inválidos antes de continuar:\n\n- ${globalErrors.join("\n- ")}`
      : `Please fix the invalid fields before continuing:\n\n- ${globalErrors.join("\n- ")}`
    : "";

  return { ok: globalErrors.length === 0, fieldErrors, anchorErrors, globalErrors, summary };
}

const s = {
  page: { display: "grid", padding: 20 },
  container: { width: "100%", maxWidth: 1220, margin: "0 auto", display: "grid", gap: 18 },
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
  headerLeft: { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" },
  headerRight: { display: "flex", gap: 10, flexWrap: "wrap" },
  hTitle: { fontSize: 20, fontWeight: 950, letterSpacing: "-0.03em" },
  hSub: { marginTop: 3, fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  section: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    boxShadow: "0 16px 38px rgba(29,29,29,0.06)",
    padding: 18,
    display: "grid",
    gap: 14,
  },
  sectionTitle: { fontWeight: 950, letterSpacing: "-0.02em", fontSize: 16 },

  field: { display: "grid", gap: 7, minWidth: 0 },
  labelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    minHeight: 18,
  },
  label: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 850,
    paddingLeft: 2,
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
  },

  input: {
    width: "100%",
    minWidth: 0,
    height: 46,
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
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
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
    borderRadius: 14,
    padding: "0 12px",
    outline: "none",
    fontWeight: 700,
    fontSize: 14,
    boxSizing: "border-box",
  },
  inputError: {
    border: "1px solid rgba(230,57,70,0.45)",
    boxShadow: "0 0 0 3px rgba(230,57,70,0.10)",
  },
  inputDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  fieldError: {
    fontSize: 11,
    color: "var(--bad)",
    fontWeight: 800,
    lineHeight: 1.4,
  },

  btnGhost: {
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
    borderRadius: 14,
    padding: "10px 13px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },
  btnGhostActive: {
    border: "1px solid rgba(230,57,70,0.22)",
    boxShadow: "0 12px 24px rgba(230,57,70,0.12)",
  },
  btnGhostWide: {
    border: "1px dashed var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
    borderRadius: 16,
    padding: "13px 14px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  anchorWrap: { display: "grid", gap: 12 },
  anchorCard: {
    border: "1px solid var(--border-color)",
    borderRadius: 18,
    padding: 14,
    display: "grid",
    gap: 12,
    background: "var(--bg-surface-2)",
  },
  anchorTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
  },
  anchorActions: { display: "flex", gap: 8, flexWrap: "wrap" },
  anchorTitle: { fontWeight: 950 },
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
    color: "var(--text-main)",
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
    color: "var(--text-main)",
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
  footerLeft: { display: "grid", gap: 3 },
  footerTitle: { fontWeight: 950 },
  footerSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },
  runActions: { display: "flex", gap: 10, flexWrap: "wrap" },
  runCPU: {
    border: "1px solid var(--border-color)",
    background: "var(--bg-surface-2)",
    color: "var(--text-main)",
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

  errorPanel: {
    border: "1px solid rgba(230,57,70,0.24)",
    background: "rgba(230,57,70,0.08)",
    borderRadius: 18,
    padding: 16,
    display: "grid",
    gap: 8,
  },
  errorPanelTitle: { fontWeight: 950, color: "var(--text-main)" },
  errorList: {
    margin: 0,
    paddingLeft: 20,
    color: "var(--text-main)",
    fontWeight: 750,
    lineHeight: 1.55,
  },

  labelGroup: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    flexWrap: "wrap",
  },

  helpGuide: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 22,
    padding: 16,
    boxShadow: "0 16px 38px rgba(29,29,29,0.06)",

    /* 🔥 ISSO AQUI RESOLVE O DARK */
    color: "var(--text-main)",

    /* força herança correta */
    isolation: "isolate",
  },
};