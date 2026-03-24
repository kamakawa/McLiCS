const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

let mainWindow = null;
let running = null;
const finishedRuns = new Map();
const MAX_FINISHED_RUNS = 30;

/* ================= WINDOW ================= */

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 820,
    backgroundColor: "#fafafa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    const indexPath = path.join(process.resourcesPath, "renderer-dist", "index.html");
    mainWindow.loadFile(indexPath);
  } else {
    mainWindow.loadURL("http://localhost:5173/");
  }
}
app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

/* ================= UTIL ================= */

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function send(channel, payload) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function rememberFinishedRun(id, payload) {
  if (!id) return;
  finishedRuns.set(String(id), payload);

  while (finishedRuns.size > MAX_FINISHED_RUNS) {
    const firstKey = finishedRuns.keys().next().value;
    finishedRuns.delete(firstKey);
  }
}

function getFinishedRun(id) {
  if (!id) return null;
  return finishedRuns.get(String(id)) || null;
}

function projectRoot() {
  return path.resolve(__dirname, "..", "..", "..");
}

function devBackendDir() {
  return path.join(projectRoot(), "backend");
}

function packagedBackendDir() {
  return path.join(process.resourcesPath, "backend", "linux-x64");
}

function backendDir() {
  return app.isPackaged ? packagedBackendDir() : devBackendDir();
}

function backendBinaryName(mode) {
  return mode === "cpu" ? "mc_sim_cpu" : "mc_sim";
}

function runsBaseDir() {
  return path.join(app.getPath("documents"), "MClistRuns");
}

function realPath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

function safeInsideReal(parent, child) {
  const P = realPath(parent);
  const C = realPath(child);

  if (P === C) return true;

  const rel = path.relative(P, C);
  return !!rel && !rel.startsWith("..") && !path.isAbsolute(rel);
}

function pythonExec() {
  return process.env.PYTHON || "python3";
}

function previewCacheDir(workdir) {
  return path.join(workdir, ".mclist_previews");
}

function previewFilePath(workdir, relPath) {
  const safe = path.basename(relPath).replace(/\.csv$/i, ".png");
  return path.join(previewCacheDir(workdir), safe);
}

function renderScriptPath() {
  return path.join(__dirname, "scripts", "render_director_preview.py");
}

/* ================= RECENTS ================= */

const recentsFile = () => path.join(app.getPath("userData"), "mclist_recents.json");

function loadRecents() {
  try {
    if (!fs.existsSync(recentsFile())) return [];
    const data = JSON.parse(fs.readFileSync(recentsFile(), "utf8"));
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function saveRecents(items) {
  try {
    fs.writeFileSync(recentsFile(), JSON.stringify(items, null, 2), "utf8");
  } catch (e) {
    console.error("saveRecents error:", e);
  }
}

function touchRecent(filePath) {
  if (!filePath) return loadRecents();

  const existing = loadRecents().filter((r) => r?.path !== filePath);

  const name = path.basename(filePath);
  const item = {
    name,
    path: filePath,
    lastOpenedAt: Date.now(),
  };

  const next = [item, ...existing].slice(0, 20);
  saveRecents(next);
  return next;
}

function removeRecent(filePath) {
  const next = loadRecents().filter((r) => r?.path !== filePath);
  saveRecents(next);
  return next;
}

ipcMain.handle("get-recents", async () => loadRecents());

ipcMain.handle("open-recent-project", async (_e, { filePath }) => {
  try {
    if (!filePath) {
      return { canceled: true };
    }

    if (!fs.existsSync(filePath)) {
      const recents = removeRecent(filePath);
      return {
        canceled: false,
        missing: true,
        recents,
      };
    }

    const text = fs.readFileSync(filePath, "utf8");
    const params = parseParamText(text);
    const recents = touchRecent(filePath);

    return {
      canceled: false,
      filePath,
      text,
      params,
      recents,
    };
  } catch (e) {
    console.error("open-recent-project error:", e);
    return {
      canceled: false,
      error: String(e),
    };
  }
});
/* ================= PARAM FILE PARSER ================= */

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
    nk: "1",
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
    anchoring: [],
  };
}

function parseParamText(text) {
  const params = defaultParams();
  const lines = String(text || "").replace(/\r/g, "").split("\n");

  const anchoringMap = new Map();

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const parts = line.split(/\s+/);
    const key = parts[0];

    if (!key) continue;

    // Anchoring format:
    // anchoring_type 0 homeotropic
    // W 0 1
    // phi_s 0 0
    // theta_s 0 90
    if (key === "anchoring_type" && parts.length >= 3) {
      const idx = Number(parts[1]);
      const type = parts.slice(2).join(" ");
      if (!Number.isNaN(idx)) {
        const cur = anchoringMap.get(idx) || { id: idx, type: "", W: "", phi_s: "", theta_s: "" };
        cur.type = type;
        anchoringMap.set(idx, cur);
      }
      continue;
    }

    if ((key === "W" || key === "phi_s" || key === "theta_s") && parts.length >= 3) {
      const idx = Number(parts[1]);
      const val = parts.slice(2).join(" ");
      if (!Number.isNaN(idx)) {
        const cur = anchoringMap.get(idx) || { id: idx, type: "", W: "", phi_s: "", theta_s: "" };
        cur[key] = val;
        anchoringMap.set(idx, cur);
      }
      continue;
    }

    const value = parts.slice(1).join(" ");
    if (value === "") continue;

    if (key in params) {
      params[key] = value;
    }
  }

  params.anchoring = Array.from(anchoringMap.values()).sort((a, b) => a.id - b.id);
  params.nk = "1";
  return params;
}

/* ================= PARAM FILE DIALOGS ================= */

ipcMain.handle("open-param-file", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Open parameter file",
    properties: ["openFile"],
    filters: [
      { name: "Parameter files", extensions: ["txt", "dat", "cfg"] },
      { name: "All files", extensions: ["*"] },
    ],
  });

  if (result.canceled || !result.filePaths?.length) {
    return { canceled: true };
  }

  const filePath = result.filePaths[0];
  const text = fs.readFileSync(filePath, "utf8");
  const params = parseParamText(text);
  const recents = touchRecent(filePath);

  return {
    canceled: false,
    filePath,
    text,
    params,
    recents,
  };
});

ipcMain.handle("export-param-file", async (_e, { paramText }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: "Export parameter file",
    defaultPath: path.join(app.getPath("documents"), "param.txt"),
    filters: [{ name: "Text", extensions: ["txt"] }],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  fs.writeFileSync(result.filePath, String(paramText || ""), "utf8");
  const recents = touchRecent(result.filePath);

  return {
    canceled: false,
    filePath: result.filePath,
    recents,
  };
});

/* ================= RUN FILES ================= */

function walkFiles(dir, out = [], base = dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === ".git" || ent.name === "node_modules") continue;
      walkFiles(full, out, base);
    } else {
      out.push(path.relative(base, full));
    }
  }
  return out;
}

ipcMain.handle("list-run-files", async (_e, { workdir }) => {
  if (!workdir) return { files: [] };
  if (!fs.existsSync(workdir)) return { files: [] };

  const base = runsBaseDir();

  if (!safeInsideReal(base, workdir)) {
    const msg =
      `Invalid workdir (outside MClistRuns).\n` +
      `base=${base}\n` +
      `workdir=${workdir}\n` +
      `baseReal=${realPath(base)}\n` +
      `workdirReal=${realPath(workdir)}\n`;
    throw new Error(msg);
  }

  const relFiles = walkFiles(workdir).sort((a, b) => a.localeCompare(b));

  const files = relFiles.map((relPath) => {
    const abs = path.join(workdir, relPath);
    let mtimeMs = 0;

    try {
      mtimeMs = fs.statSync(abs).mtimeMs;
    } catch {}

    return {
      path: relPath,
      mtimeMs,
    };
  });

  return { files };
});

ipcMain.handle("read-run-file", async (_e, { workdir, relPath, maxBytes = 2_000_000 }) => {
  if (!workdir || !relPath) return { text: "", truncated: false };

  const base = runsBaseDir();

  if (!safeInsideReal(base, workdir)) {
    throw new Error(
      `Invalid workdir (outside MClistRuns).\nbase=${base}\nworkdir=${workdir}`
    );
  }

  const abs = path.resolve(workdir, relPath);

  if (!safeInsideReal(workdir, abs)) {
    throw new Error(`Invalid file path.\nworkdir=${workdir}\nabs=${abs}`);
  }

  if (!fs.existsSync(abs)) {
    return { text: "", truncated: false, error: "File not found." };
  }

  const stat = fs.statSync(abs);
  const limit = Math.max(1_000, Number(maxBytes) || 2_000_000);

  const fd = fs.openSync(abs, "r");
    try {
      const size = Math.min(stat.size, limit);
      const buf = Buffer.alloc(size);
      fs.readSync(fd, buf, 0, size, 0);

      // se for imagem, retorna base64
      if (/\.(png|jpg|jpeg)$/i.test(relPath)) {
        return {
          base64: buf.toString("base64"),
          truncated: stat.size > limit,
        };
      }

      const truncated = stat.size > limit;
      let text = buf.toString("utf8");

      if (truncated) {
        text += `\n\n--- TRUNCATED: showing first ${size} bytes of ${stat.size} ---\n`;
      }

      return { text, truncated };
    } finally {
      fs.closeSync(fd);
    }
});

ipcMain.handle("render-director-preview", async (_event, { workdir, relPath, lang }) => {  try {
    if (!workdir || !relPath) {
      throw new Error("Missing workdir or relPath.");
    }

    const inputPath = path.join(workdir, relPath);
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found: ${inputPath}`);
    }

    const outDir = previewCacheDir(workdir);
    ensureDir(outDir);

    const outputPath = previewFilePath(workdir, relPath);
    const script = renderScriptPath();

    const inputStat = fs.statSync(inputPath);
    const outputExists = fs.existsSync(outputPath);

    if (outputExists) {
      const outputStat = fs.statSync(outputPath);
      if (outputStat.mtimeMs >= inputStat.mtimeMs) {
        return { ok: true, imagePath: outputPath };
      }
    }

    const run = spawnSync(pythonExec(), [script, inputPath, outputPath, lang || "en"], {
      encoding: "utf8",
      cwd: workdir,
    });

    if (run.status !== 0) {
      throw new Error(run.stderr || run.stdout || "Preview renderer failed.");
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error("Preview image was not generated.");
    }

    return { ok: true, imagePath: outputPath };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("open-run-folder", async (_e, { workdir }) => {
  if (!workdir) return { ok: false };
  if (!fs.existsSync(workdir)) return { ok: false };

  const base = runsBaseDir();
  if (!safeInsideReal(base, workdir)) {
    throw new Error("Invalid workdir (outside MClistRuns).");
  }

  await shell.openPath(workdir);
  return { ok: true };
});

ipcMain.handle("get-sim-status", async (_event, { id }) => {
  const rid = String(id || "");

  if (!rid) return { found: false };

  if (running?.id === rid) {
    return {
      found: true,
      finished: false,
      id: rid,
      workdir: running.workdir,
      paramPath: running.paramPath,
      exePath: running.exePath,
      mode: running.mode,
    };
  }

  const done = getFinishedRun(rid);
  if (done) {
    return {
      found: true,
      finished: true,
      ...done,
    };
  }

  return { found: false };
});

/* ================= RUN ================= */

ipcMain.handle("run-sim", async (_event, { mode, paramText }) => {
  if (running?.child) {
    throw new Error("A simulation is already running.");
  }

  const id = `${Date.now()}`;

  ensureDir(runsBaseDir());
  const workdir = path.join(runsBaseDir(), `run_${id}`);
  ensureDir(workdir);

  const paramPath = path.join(workdir, "param.txt");
  fs.writeFileSync(paramPath, String(paramText || ""), "utf8");

  const backend = backendDir();
  const exePath = path.join(backend, backendBinaryName(mode));

  const finishRun = (payload) => {
    const donePayload = {
      id,
      workdir,
      paramPath,
      exePath,
      mode,
      ...payload,
    };

    rememberFinishedRun(id, donePayload);
    send("sim-done", donePayload);

    if (running?.id === id) {
      running = null;
    }
  };

  try {
    if (!app.isPackaged) {
      console.log("===== COMPILING BACKEND (DEV MODE) =====");
      console.log("Mode:", mode);
      console.log("Backend:", backend);

      const makeArgs = mode === "cpu" ? ["CPU"] : [];
      const compile = spawnSync("make", makeArgs, {
        cwd: backend,
        encoding: "utf8",
      });

      if (compile.stdout) send("sim-log", { id, type: "stdout", data: compile.stdout });
      if (compile.stderr) send("sim-log", { id, type: "stderr", data: compile.stderr });

      if (compile.status !== 0) {
        const compileError = compile.stderr || compile.stdout || "Compilation failed.";
        finishRun({
          code: compile.status ?? -1,
          error: compileError,
          stage: "compile",
        });
        throw new Error("Compilation failed. Check logs in Running screen / terminal.");
      }

      console.log("Compilation OK");
    } else {
      console.log("===== PACKAGED MODE =====");
      console.log("Using bundled backend from:", backend);
    }

    if (!fs.existsSync(exePath)) {
      const msg = `Binary not found: ${exePath}`;
      finishRun({
        code: -1,
        error: msg,
        stage: "binary",
      });
      throw new Error(msg);
    }

    console.log("===== STARTING SIMULATION =====");
    console.log("Executable:", exePath);
    console.log("Param:", paramPath);
    console.log("Workdir:", workdir);

    const child = spawn(exePath, ["param.txt"], {
      cwd: workdir,
      env: {
        ...process.env,
        PATH: `${backend}${path.delimiter}${process.env.PATH || ""}`,
      },
    });

    running = {
      id,
      child,
      workdir,
      paramPath,
      exePath,
      mode,
      canceled: false,
      lastError: "",
    };

    child.stdout.on("data", (d) => {
      send("sim-log", { id, type: "stdout", data: d.toString() });
    });

    child.stderr.on("data", (d) => {
      const text = d.toString();

      if (running?.id === id) {
        running.lastError = `${running.lastError || ""}${text}`.slice(-12000);
      }

      send("sim-log", { id, type: "stderr", data: text });
    });

    child.on("close", (code, signal) => {
      const wasCanceled = !!running?.canceled;
      const stderrTail = (running?.lastError || "").trim();

      finishRun({
        code,
        signal: signal || null,
        canceled: wasCanceled,
        error:
          Number(code) === 0 || wasCanceled
            ? ""
            : stderrTail || `Backend exited with code ${code}.`,
      });
    });

    child.on("error", (err) => {
      finishRun({
        code: -1,
        error: err?.message || "Failed to start backend process.",
        stage: "spawn",
      });
    });

    return { id, workdir, paramPath, exePath, mode };
  } catch (err) {
    if (!getFinishedRun(id)) {
      finishRun({
        code: -1,
        error: err?.message || String(err),
        stage: "unexpected",
      });
    }
    throw err;
  }
});

/* ================= CANCEL ================= */

ipcMain.handle("cancel-sim", async () => {
  if (!running?.child) return { ok: false };

  try {
    running.canceled = true;
    running.child.kill("SIGTERM");
  } catch {}

  return { ok: true };
});

/* ================= REPORT (PDF) ================= */

ipcMain.handle("export-report-pdf", async (_event, payload) => {
  try {
    const {
      logoDataUrl = "",
      paramText = "",
      notes = "",
      poPlots = [],
      poTable = null,
    } = payload || {};

    const { canceled, filePath } = await dialog.showSaveDialog({
      title: "Save report",
      defaultPath: path.join(app.getPath("documents"), "mclist-report.pdf"),
      filters: [{ name: "PDF", extensions: ["pdf"] }],
    });

    if (canceled || !filePath) return { canceled: true };

    const esc = (s) =>
      String(s ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;");

    const fmt = (v, digits = 4) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return "—";
      const a = Math.abs(n);
      if (a >= 1000 || (a > 0 && a < 0.001)) return n.toExponential(3);
      return n.toFixed(digits).replace(/0+$/g, "").replace(/\.$/g, "");
    };

    const toNum = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : NaN;
    };

    const parseParamRows = (text) => {
      return String(text || "")
        .replace(/\r/g, "")
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => !line.startsWith("#"))
        .map((line) => {
          const parts = line.split(/\s+/).filter(Boolean);
          return {
            key: parts[0] || "",
            value: parts.slice(1).join(" "),
          };
        })
        .filter((r) => r.key);
    };

    const groupParamRows = (rows) => {
      const groups = {
        "System Size": [],
        "Monte Carlo": [],
        "Temperature Schedule": [],
        "Potential & Physics": [],
        "Initialization & Evolution": [],
        "Geometry & Boundaries": [],
        "Anchoring": [],
        "Other": [],
      };

      const mapGroup = (key) => {
        if (["Nx", "Ny", "Nz"].includes(key)) return "System Size";
        if (["MCS", "MCT", "fn", "nk", "first_file_number"].includes(key)) return "Monte Carlo";
        if (["Ti", "Tf", "dT"].includes(key)) return "Temperature Schedule";
        if (["potential", "p0", "p0_i", "k11", "k22", "k33"].includes(key)) return "Potential & Physics";
        if (["ic", "ic_file", "phi_0", "theta_0", "evol"].includes(key)) return "Initialization & Evolution";
        if (["geometry", "boundary_file", "xbound", "ybound", "zbound"].includes(key))
          return "Geometry & Boundaries";
        if (["anchoring_type", "W", "phi_s", "theta_s"].includes(key)) return "Anchoring";
        return "Other";
      };

      for (const row of rows) {
        groups[mapGroup(row.key)].push(row);
      }

      return Object.entries(groups).filter(([, items]) => items.length);
    };

    const buildSummaryFromPo = (poTable) => {
      if (!poTable || !Array.isArray(poTable.rows) || !poTable.rows.length) return null;

      const headers =
        Array.isArray(poTable.headers) && poTable.headers.length
          ? poTable.headers
          : poTable.rows[0].map((_, i) => `col${i}`);

      const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

      const hs = headers.map(norm);

      const idx = (candidates, fallback) => {
        for (const c of candidates) {
          const i = hs.indexOf(c);
          if (i >= 0) return i;
        }
        return fallback;
      };

      const tIdx = idx(["t"], 0);
      const sIdx = idx(["s"], 1);
      const varSIdx = idx(["vars", "varse"], 2);
      const eIdx = idx(["e"], 3);
      const varEIdx = idx(["vare"], 4);

      const rows = poTable.rows
        .map((r) => ({
          T: toNum(r[tIdx]),
          S: toNum(r[sIdx]),
          varS: toNum(r[varSIdx]),
          E: toNum(r[eIdx]),
          varE: toNum(r[varEIdx]),
        }))
        .filter((r) => Number.isFinite(r.T) && Number.isFinite(r.S) && Number.isFinite(r.E))
        .sort((a, b) => a.T - b.T);

      if (!rows.length) return null;

      const avg = (arr) => arr.reduce((acc, v) => acc + v, 0) / arr.length;

      const Ts = rows.map((r) => r.T);
      const Ss = rows.map((r) => r.S);
      const Es = rows.map((r) => r.E);

      const sMean = avg(Ss);
      const eMean = avg(Es);

      let maxSRow = rows[0];
      let minSRow = rows[0];
      let minERow = rows[0];
      let maxERow = rows[0];

      for (const r of rows) {
        if (r.S > maxSRow.S) maxSRow = r;
        if (r.S < minSRow.S) minSRow = r;
        if (r.E < minERow.E) minERow = r;
        if (r.E > maxERow.E) maxERow = r;
      }

      let strongestDeltaS = null;
      for (let i = 1; i < rows.length; i++) {
        const prev = rows[i - 1];
        const curr = rows[i];
        const dS = Math.abs(curr.S - prev.S);
        if (!strongestDeltaS || dS > strongestDeltaS.delta) {
          strongestDeltaS = {
            delta: dS,
            fromT: prev.T,
            toT: curr.T,
          };
        }
      }

      const trendS =
        rows[rows.length - 1].S > rows[0].S
          ? "The order parameter increases as temperature changes across the scanned range."
          : "The order parameter decreases as temperature changes across the scanned range.";

      const trendE =
        rows[rows.length - 1].E < rows[0].E
          ? "The mean energy becomes more negative across the scanned range."
          : "The mean energy increases across the scanned range.";

      let transitionText = "";
      if (strongestDeltaS) {
        transitionText = `The strongest variation in S occurs between T = ${fmt(
          strongestDeltaS.fromT
        )} and T = ${fmt(strongestDeltaS.toT)}, suggesting a relevant structural change in this interval.`;
      }

      return {
        sampleCount: rows.length,
        tMin: Math.min(...Ts),
        tMax: Math.max(...Ts),
        sMean,
        eMean,
        maxSRow,
        minSRow,
        minERow,
        maxERow,
        strongestDeltaS,
        interpretation: [trendS, trendE, transitionText].filter(Boolean),
      };
    };

    const notesTrimmed = String(notes || "").trim();
    const showNotes = notesTrimmed.length > 0;

    const paramRows = parseParamRows(paramText);
    const groupedParams = groupParamRows(paramRows);
    const summary = buildSummaryFromPo(poTable);

    const plotsHtml = Array.isArray(poPlots)
      ? poPlots
          .filter((p) => p?.dataUrl)
          .map(
            (p) => `
              <div class="section keep-together">
                <div class="section-header">
                  <div>
                    <div class="section-kicker">Visualization</div>
                    <div class="h2">${esc(p.title || "Plot")}</div>
                  </div>
                </div>
                <div class="plot">
                  <img src="${p.dataUrl}" />
                </div>
              </div>
            `
          )
          .join("")
      : "";

    const summaryHtml = summary
      ? `
        <div class="section keep-together">
          <div class="section-header">
            <div>
              <div class="section-kicker">Executive Summary</div>
              <div class="h2">Key results extracted from po.dat</div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="metric-card">
              <div class="metric-label">Temperature range</div>
              <div class="metric-value">${esc(fmt(summary.tMin))} → ${esc(fmt(summary.tMax))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Samples</div>
              <div class="metric-value">${esc(summary.sampleCount)}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Mean order parameter ⟨S⟩</div>
              <div class="metric-value">${esc(fmt(summary.sMean, 5))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Mean energy ⟨E⟩</div>
              <div class="metric-value">${esc(fmt(summary.eMean, 5))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Maximum S</div>
              <div class="metric-value">${esc(fmt(summary.maxSRow.S, 5))}</div>
              <div class="metric-sub">at T = ${esc(fmt(summary.maxSRow.T))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Minimum E</div>
              <div class="metric-value">${esc(fmt(summary.minERow.E, 5))}</div>
              <div class="metric-sub">at T = ${esc(fmt(summary.minERow.T))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Minimum S</div>
              <div class="metric-value">${esc(fmt(summary.minSRow.S, 5))}</div>
              <div class="metric-sub">at T = ${esc(fmt(summary.minSRow.T))}</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">Maximum E</div>
              <div class="metric-value">${esc(fmt(summary.maxERow.E, 5))}</div>
              <div class="metric-sub">at T = ${esc(fmt(summary.maxERow.T))}</div>
            </div>
          </div>

          <div class="insight-box">
            <div class="insight-title">Automatic interpretation</div>
            ${summary.interpretation.map((line) => `<p>${esc(line)}</p>`).join("")}
          </div>
        </div>
      `
      : "";

    const notesHtml = showNotes
      ? `
        <div class="section keep-together">
          <div class="section-header">
            <div>
              <div class="section-kicker">Research Notes</div>
              <div class="h2">User observations</div>
            </div>
          </div>
          <pre>${esc(notesTrimmed)}</pre>
        </div>
      `
      : "";

    const paramsHtml = groupedParams.length
      ? `
        <div class="section">
          <div class="section-header">
            <div>
              <div class="section-kicker">Configuration</div>
              <div class="h2">Simulation parameters</div>
            </div>
          </div>

          <div class="param-groups">
            ${groupedParams
              .map(
                ([groupName, items]) => `
                  <div class="param-card keep-together">
                    <div class="param-card-title">${esc(groupName)}</div>
                    <div class="param-list">
                      ${items
                        .map(
                          (row) => `
                            <div class="param-row">
                              <div class="param-key">${esc(row.key)}</div>
                              <div class="param-value">${esc(row.value || "—")}</div>
                            </div>
                          `
                        )
                        .join("")}
                    </div>
                  </div>
                `
              )
              .join("")}
          </div>
        </div>
      `
      : "";

    const tableHtml = (() => {
      if (!poTable || !Array.isArray(poTable.rows) || !poTable.rows.length) return "";

      const headers =
        Array.isArray(poTable.headers) && poTable.headers.length
          ? poTable.headers
          : poTable.rows[0].map((_, i) => `col${i}`);

      const maxRows = 500;
      const rows = poTable.rows.slice(0, maxRows);

      return `
        <div class="section">
          <div class="section-header">
            <div>
              <div class="section-kicker">Technical Appendix</div>
              <div class="h2">Complete po.dat table</div>
            </div>
          </div>

          <div class="hint">
            Showing ${rows.length}${poTable.rows.length > rows.length ? ` / ${poTable.rows.length}` : ""} rows
          </div>

          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  ${headers.map((h) => `<th>${esc(h)}</th>`).join("")}
                </tr>
              </thead>
              <tbody>
                ${rows
                  .map(
                    (r, i) => `
                      <tr class="${i % 2 === 0 ? "even" : "odd"}">
                        ${r.map((v) => `<td>${esc(v)}</td>`).join("")}
                      </tr>
                    `
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    })();

    const exportDate = new Date();
    const exportDateText = exportDate.toLocaleString("en-GB", {
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>MClist Report</title>
        <style>
          @page { margin: 26px; }

          body{
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
            color:#111;
            background:#fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .report-shell{
            display:block;
          }

          .header{
            display:flex;
            align-items:center;
            justify-content:space-between;
            gap:24px;
            padding: 0 0 16px 0;
            border-bottom: 2px solid rgba(0,0,0,0.08);
            margin-bottom: 20px;
          }

          .header-left{
            display:flex;
            align-items:center;
            gap:18px;
          }

          .logo{
            height: 120px;
            max-width: 280px;
            object-fit: contain;
            display:block;
          }

          .header-copy{
            display:grid;
            gap:4px;
          }

          .report-kicker{
            font-size: 11px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: rgba(0,0,0,0.52);
          }

          .report-title{
            font-size: 28px;
            font-weight: 950;
            letter-spacing: -0.6px;
            line-height: 1.05;
            margin:0;
          }

          .report-subtitle{
            font-size: 13px;
            color: rgba(0,0,0,0.68);
            font-weight: 600;
            margin-top: 2px;
          }

          .header-meta{
            text-align:right;
            display:grid;
            gap:5px;
            align-self:flex-start;
            padding-top: 6px;
          }

          .meta-label{
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.06em;
            color: rgba(0,0,0,0.48);
            font-weight: 800;
          }

          .meta-value{
            font-size: 12px;
            font-weight: 700;
            color: rgba(0,0,0,0.78);
          }

          .section{
            margin: 0 0 22px 0;
          }

          .keep-together{
            break-inside: avoid;
          }

          .section-header{
            display:flex;
            justify-content:space-between;
            align-items:flex-end;
            gap:12px;
            margin-bottom: 10px;
          }

          .section-kicker{
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(0,0,0,0.48);
            font-weight: 800;
            margin-bottom: 2px;
          }

          .h2{
            font-size: 16px;
            font-weight: 950;
            margin: 0;
            letter-spacing: -0.25px;
          }

          .hint{
            font-size: 11px;
            color: rgba(0,0,0,0.55);
            margin-bottom: 8px;
            font-weight: 600;
          }

          .summary-grid{
            display:grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
            margin-top: 8px;
          }

          .metric-card{
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 14px;
            padding: 12px;
            background: linear-gradient(180deg, rgba(248,248,248,0.95), rgba(255,255,255,1));
          }

          .metric-label{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: rgba(0,0,0,0.50);
            font-weight: 800;
            margin-bottom: 6px;
          }

          .metric-value{
            font-size: 20px;
            font-weight: 950;
            letter-spacing: -0.35px;
          }

          .metric-sub{
            margin-top: 4px;
            font-size: 11px;
            color: rgba(0,0,0,0.58);
            font-weight: 700;
          }

          .insight-box{
            margin-top: 14px;
            border-left: 4px solid rgba(0,0,0,0.16);
            background: rgba(0,0,0,0.025);
            padding: 12px 14px;
            border-radius: 0 12px 12px 0;
          }

          .insight-title{
            font-size: 12px;
            font-weight: 900;
            margin-bottom: 6px;
          }

          .insight-box p{
            margin: 6px 0;
            font-size: 12px;
            line-height: 1.55;
          }

          .param-groups{
            display:grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 12px;
          }

          .param-card{
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 14px;
            padding: 12px;
            background: rgba(250,250,250,0.85);
          }

          .param-card-title{
            font-size: 12px;
            font-weight: 950;
            margin-bottom: 8px;
            letter-spacing: -0.2px;
          }

          .param-list{
            display:grid;
            gap: 7px;
          }

          .param-row{
            display:grid;
            grid-template-columns: 1fr auto;
            gap: 12px;
            align-items:start;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(0,0,0,0.05);
          }

          .param-row:last-child{
            border-bottom:none;
            padding-bottom:0;
          }

          .param-key{
            font-size: 11px;
            color: rgba(0,0,0,0.58);
            font-weight: 800;
          }

          .param-value{
            font-size: 11px;
            color: rgba(0,0,0,0.90);
            font-weight: 800;
            text-align:right;
            word-break: break-word;
          }

          pre{
            margin:0;
            padding: 12px 14px;
            background: rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 12px;
            white-space: pre-wrap;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11px;
            line-height: 1.5;
          }

          .plot{
            width: 100%;
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 14px;
            padding: 12px;
            background: rgba(0,0,0,0.015);
          }

          .plot img{
            width: 100%;
            height: auto;
            display:block;
          }

          .tableWrap{
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 12px;
            overflow:hidden;
          }

          table{
            width: 100%;
            border-collapse: collapse;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 10.5px;
          }

          thead th{
            text-align:left;
            padding: 8px 8px;
            background: rgba(0,0,0,0.045);
            border-bottom: 1px solid rgba(0,0,0,0.10);
            font-weight: 900;
          }

          tbody td{
            padding: 6px 8px;
            border-bottom: 1px solid rgba(0,0,0,0.06);
            white-space: nowrap;
          }

          tr.even { background: rgba(255,255,255,1); }
          tr.odd  { background: rgba(0,0,0,0.015); }

          .footer{
            margin-top: 18px;
            padding-top: 10px;
            border-top: 1px solid rgba(0,0,0,0.08);
            font-size: 10px;
            color: rgba(0,0,0,0.45);
            display:flex;
            justify-content:space-between;
            gap:12px;
          }
        </style>
      </head>
      <body>
        <div class="report-shell">
          <div class="header">
            <div class="header-left">
              ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
              <div class="header-copy">
                <div class="report-kicker">Scientific Simulation Report</div>
                <h1 class="report-title">MClist Simulation Report</h1>
                <div class="report-subtitle">Monte Carlo analysis for liquid crystal systems</div>
              </div>
            </div>

            <div class="header-meta">
              <div>
                <div class="meta-label">Generated</div>
                <div class="meta-value">${esc(exportDateText)}</div>
              </div>
              <div>
                <div class="meta-label">Primary dataset</div>
                <div class="meta-value">po.dat</div>
              </div>
            </div>
          </div>

          ${summaryHtml}
          ${plotsHtml}
          ${notesHtml}
          ${paramsHtml}
          ${tableHtml}

          <div class="footer">
            <div>Generated by MClist</div>
            <div>Scientific Software for Monte Carlo Liquid Crystal Simulations</div>
          </div>
        </div>
      </body>
      </html>
    `;

    const win = new BrowserWindow({
      show: false,
      webPreferences: { sandbox: false },
    });

    await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      pageSize: "A4",
      marginsType: 0,
    });

    fs.writeFileSync(filePath, pdf);
    win.destroy();

    return { canceled: false, filePath };
  } catch (e) {
    console.error(e);
    throw e;
  }
});