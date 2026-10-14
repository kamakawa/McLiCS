// Shared with Setup.jsx (builds/edits param.txt) and Results.jsx (reads a
// finished run's param.txt to prefill Setup for a "run again with tweaks").
// Lives outside pages/ so it can be a plain module export — mixing a
// component default export with named utility exports in the same file
// breaks Vite's Fast Refresh for that file.
export function defaultParams() {
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

// Inverse of Setup.jsx's buildParamTxt: turns a saved param.txt back into
// the params object Setup edits. Used by Results to prefill Setup when the
// user wants to tweak and re-run an existing simulation. Partial/malformed
// input is fine — Setup's normalizeParams() fills in anything missing.
const ANCHOR_KEYS = new Set(["anchoring_type", "W", "phi_s", "theta_s"]);

export function parseParamTxt(text) {
  const p = defaultParams();
  const anchorsByIndex = new Map();

  String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const parts = line.split(/\s+/);
      const key = parts[0];
      if (!key) return;

      // "<key> <index> <value...>" — one of the per-surface anchoring fields.
      if (ANCHOR_KEYS.has(key) && parts.length >= 3) {
        const idx = Number(parts[1]);
        if (!Number.isFinite(idx)) return;

        const value = parts.slice(2).join(" ");
        const entry =
          anchorsByIndex.get(idx) || { id: idx, type: "", W: "", phi_s: "", theta_s: "" };

        if (key === "anchoring_type") entry.type = value;
        else entry[key] = value;

        anchorsByIndex.set(idx, entry);
        return;
      }

      // "<key> <value...>" (value may itself contain spaces, e.g. a path).
      const value = parts.slice(1).join(" ");

      // buildParamTxt writes this field under the key "first_file_number",
      // but the in-memory/UI field is named "first_file".
      if (key === "first_file_number") {
        p.first_file = value;
        return;
      }

      if (key in p) p[key] = value;
    });

  p.anchoring = [...anchorsByIndex.values()]
    .sort((a, b) => a.id - b.id)
    .map((a, i) => ({ ...a, id: i }));

  return p;
}
