const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const RECENTS_PATH = () => path.join(app.getPath("userData"), "recents.json");

function readRecents() {
  try {
    return JSON.parse(fs.readFileSync(RECENTS_PATH(), "utf8"));
  } catch {
    return [];
  }
}

function writeRecents(items) {
  fs.writeFileSync(RECENTS_PATH(), JSON.stringify(items.slice(0, 5), null, 2));
}

function addRecent(entry) {
  const items = readRecents();
  const filtered = items.filter((x) => x.path !== entry.path);
  filtered.unshift(entry);
  writeRecents(filtered);
  return filtered.slice(0, 5);
}

// Remove comentários /*...*/ e #...
function sanitizeLine(line) {
  // remove inline block comments (simple)
  line = line.replace(/\/\*.*?\*\//g, "");
  // remove hash comments
  const hash = line.indexOf("#");
  if (hash >= 0) line = line.slice(0, hash);
  return line.trim();
}

// parser simples: suporta chaves comuns e anchoring_* com índice
function parseParamText(text) {
  const lines = text.split(/\r?\n/);
  const params = {
    Nx: "", Ny: "", Nz: "",
    MCS: "", MCT: "",
    potential: "",
    Ti: "", Tf: "", dT: "",
    p0: "",
    fn: "",
    nk: "",
    k11: "", k22: "", k33: "",
    ic: "",
    theta_0: "", phi_0: "", p0_i: "",
    geometry: "",
    boundary_file: "",
    xbound: "", ybound: "", zbound: "",
    evol: "",
    anchoring: []
  };

  const anchMap = new Map(); // id -> object

  for (let raw of lines) {
    const line = sanitizeLine(raw);
    if (!line) continue;

    const parts = line.split(/\s+/);
    const key = parts[0];

    // Anchoring format: key id value
    const isAnch = ["anchoring_type", "W", "phi_s", "theta_s"].includes(key);
    if (isAnch) {
      const id = Number(parts[1]);
      const value = parts.slice(2).join(" ");
      if (!Number.isFinite(id)) continue;

      if (!anchMap.has(id)) anchMap.set(id, { id, type: "", W: "", phi_s: "", theta_s: "" });
      const a = anchMap.get(id);

      if (key === "anchoring_type") a.type = value;
      if (key === "W") a.W = value;
      if (key === "phi_s") a.phi_s = value;
      if (key === "theta_s") a.theta_s = value;
      continue;
    }

    // Normal format: key value
    const value = parts.slice(1).join(" ");
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      params[key] = value;
    }
  }

  params.anchoring = [...anchMap.values()].sort((a, b) => a.id - b.id);
  return params;
}

// Writer: gera texto no estilo "key  value" e anchors "key id value"
function buildParamText(p) {
  const lines = [];
  const put = (k, v) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") lines.push(`${k}  ${v}`);
  };

  put("Nx", p.Nx); put("Ny", p.Ny); put("Nz", p.Nz);
  put("MCS", p.MCS); put("MCT", p.MCT);
  put("potential", p.potential);

  put("Ti", p.Ti); put("Tf", p.Tf); put("dT", p.dT);
  put("p0", p.p0);

  put("fn", p.fn);
  put("nk", p.nk);

  put("k11", p.k11); put("k22", p.k22); put("k33", p.k33);

  put("ic", p.ic);
  // estes podem existir dependendo do ic (mas deixamos se tiver preenchido)
  put("theta_0", p.theta_0);
  put("phi_0", p.phi_0);
  put("p0_i", p.p0_i);

  put("geometry", p.geometry);
  put("boundary_file", p.boundary_file);

  put("xbound", p.xbound); put("ybound", p.ybound); put("zbound", p.zbound);

  put("evol", p.evol);

  if (Array.isArray(p.anchoring) && p.anchoring.length) {
    lines.push("");
    for (let i = 0; i < p.anchoring.length; i++) {
      const a = p.anchoring[i];
      const id = i; // renumera 0..N-1 ao exportar
      if (String(a.type || "").trim() !== "") lines.push(`anchoring_type ${id} ${a.type}`);
      if (String(a.W || "").trim() !== "") lines.push(`W ${id} ${a.W}`);
      if (String(a.phi_s || "").trim() !== "") lines.push(`phi_s ${id} ${a.phi_s}`);
      if (String(a.theta_s || "").trim() !== "") lines.push(`theta_s ${id} ${a.theta_s}`);
      lines.push("");
    }
  }

  return lines.join("\n").trim() + "\n";
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 760,
    minWidth: 1000,
    minHeight: 650,
    backgroundColor: "#F1FAEE",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    }
  });

  // dev: Vite
  win.loadURL("http://localhost:5173");
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle("recents:get", async () => readRecents());

  ipcMain.handle("param:open", async () => {
    const result = await dialog.showOpenDialog({
      title: "Open parameter file",
      properties: ["openFile"],
      filters: [{ name: "Text", extensions: ["txt", "dat"] }, { name: "All Files", extensions: ["*"] }]
    });
    if (result.canceled || !result.filePaths?.[0]) return { canceled: true };

    const filePath = result.filePaths[0];
    const text = fs.readFileSync(filePath, "utf8");
    const params = parseParamText(text);

    const recents = addRecent({
      path: filePath,
      name: path.basename(filePath),
      lastOpenedAt: new Date().toISOString()
    });

    return { canceled: false, filePath, params, recents };
  });

  ipcMain.handle("param:export", async (_evt, params) => {
    const result = await dialog.showSaveDialog({
      title: "Export parameter file",
      defaultPath: "param.txt",
      filters: [{ name: "Text", extensions: ["txt"] }]
    });
    if (result.canceled || !result.filePath) return { canceled: true };

    fs.writeFileSync(result.filePath, buildParamText(params), "utf8");
    addRecent({
      path: result.filePath,
      name: path.basename(result.filePath),
      lastOpenedAt: new Date().toISOString()
    });

    return { canceled: false, filePath: result.filePath };
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});