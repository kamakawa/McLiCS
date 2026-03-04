const { app, BrowserWindow, ipcMain, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");

let mainWindow = null;
let running = null;

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

  // DEV (Vite)
  mainWindow.loadURL("http://localhost:5173/");
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

function projectRoot() {
  // apps/desktop/main -> up 3 -> MClist/
  return path.resolve(__dirname, "..", "..", "..");
}

function backendDir() {
  return path.join(projectRoot(), "backend");
}

function runsBaseDir() {
  return path.join(app.getPath("documents"), "MClistRuns");
}

function writeRunLog(logPath, text) {
  fs.appendFileSync(logPath, text, "utf8");
}

/* ================= PARAM SANITIZER ================= */

function sanitizeParamText(paramText) {
  const oneWordKeys = new Set([
    "potential",
    "ic",
    "evol",
    "geometry",
    "xbound",
    "ybound",
    "zbound",
    "boundary_file",
  ]);

  const lines = String(paramText || "").replace(/\r/g, "").split("\n");
  const out = [];

  for (const line of lines) {
    const trimmedRight = String(line).replace(/\s+$/g, "");
    const trimmed = trimmedRight.trim();

    if (!trimmed) {
      out.push("");
      continue;
    }

    if (trimmed.startsWith("#")) {
      out.push(trimmedRight);
      continue;
    }

    const m = trimmedRight.match(/^(\S+)\s+(.*)$/);
    if (!m) {
      out.push(trimmed);
      continue;
    }

    const key = m[1];
    let rest = (m[2] || "").replace(/\r/g, "").replace(/\n+/g, " ").trim();

    if (oneWordKeys.has(key)) {
      rest = rest.split(/\s+/)[0] || "";
    }

    if (!rest) continue;
    out.push(`${key}  ${rest}`);
  }

  return out.join("\n").replace(/\n{3,}/g, "\n\n");
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
  } catch {}
}

function addRecent(filePath) {
  if (!filePath) return;
  const prev = loadRecents();
  const next = [filePath, ...prev.filter((p) => p !== filePath)].slice(0, 20);
  saveRecents(next);
}

ipcMain.handle("get-recents", async () => loadRecents());

/* ================= FILE PICKERS ================= */

ipcMain.handle("open-param-file", async () => {
  const res = await dialog.showOpenDialog(mainWindow, {
    title: "Open parameter file",
    properties: ["openFile"],
    filters: [{ name: "Text", extensions: ["txt"] }, { name: "All files", extensions: ["*"] }],
  });

  if (res.canceled || !res.filePaths?.[0]) return { canceled: true };
  const filePath = res.filePaths[0];
  addRecent(filePath);

  const text = fs.readFileSync(filePath, "utf8");
  return { canceled: false, filePath, text };
});

ipcMain.handle("export-param-file", async (_e, { paramText }) => {
  const res = await dialog.showSaveDialog(mainWindow, {
    title: "Save parameter file",
    defaultPath: path.join(app.getPath("documents"), "param.txt"),
    filters: [{ name: "Text", extensions: ["txt"] }, { name: "All files", extensions: ["*"] }],
  });

  if (res.canceled || !res.filePath) return { canceled: true };

  const clean = sanitizeParamText(paramText);
  fs.writeFileSync(res.filePath, clean, "utf8");
  addRecent(res.filePath);

  return { canceled: false, filePath: res.filePath };
});

/* ================= RESULTS: list/read/open files ================= */

function safeInsideWorkdir(workdir, filename) {
  const full = path.resolve(workdir, filename);
  const root = path.resolve(workdir);
  if (!full.startsWith(root + path.sep)) throw new Error("Invalid path.");
  return full;
}

ipcMain.handle("list-run-files", async (_e, { workdir }) => {
  if (!workdir) throw new Error("Missing workdir.");
  const entries = fs.readdirSync(workdir, { withFileTypes: true });
  const files = entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .sort((a, b) => a.localeCompare(b));
  return { files };
});

ipcMain.handle("read-run-file", async (_e, { workdir, filename, maxBytes = 2_000_000 }) => {
  if (!workdir || !filename) throw new Error("Missing args.");
  const full = safeInsideWorkdir(workdir, filename);
  const buf = fs.readFileSync(full);
  const sliced = buf.length > maxBytes ? buf.slice(0, maxBytes) : buf;
  // tenta utf8; se for binário, pode virar “lixo” — o renderer vai tratar
  return { text: sliced.toString("utf8"), truncated: buf.length > maxBytes };
});

ipcMain.handle("open-run-folder", async (_e, { workdir }) => {
  if (!workdir) throw new Error("Missing workdir.");
  await shell.openPath(workdir);
  return { ok: true };
});

/* ================= RUN ================= */

ipcMain.handle("run-sim", async (_event, { mode, paramText }) => {
  if (running?.child) throw new Error("A simulation is already running.");

  const id = `${Date.now()}`;
  ensureDir(runsBaseDir());
  const workdir = path.join(runsBaseDir(), `run_${id}`);
  ensureDir(workdir);

  const logPath = path.join(workdir, "run.log");
  const backend = backendDir();

  const cleanParamText = sanitizeParamText(paramText);
  const paramPath = path.join(workdir, "param.txt");
  fs.writeFileSync(paramPath, cleanParamText, "utf8");

  writeRunLog(
    logPath,
    `=== MClist run ${id} ===\nmode=${mode}\nbackend=${backend}\nparam=${paramPath}\nworkdir=${workdir}\n\n`
  );

  const makeArgs = mode === "cpu" ? ["CPU"] : [];
  const compile = spawnSync("make", makeArgs, { cwd: backend, encoding: "utf8" });

  if (compile.stdout) {
    send("sim-log", { id, type: "stdout", data: compile.stdout });
    writeRunLog(logPath, compile.stdout);
  }
  if (compile.stderr) {
    send("sim-log", { id, type: "stderr", data: compile.stderr });
    writeRunLog(logPath, compile.stderr);
  }

  if (compile.status !== 0) {
    writeRunLog(logPath, "\n=== compilation FAILED ===\n");
    throw new Error("Compilation failed. Check logs / run.log.");
  }

  writeRunLog(logPath, "\n=== compilation OK ===\n\n");

  const exeName = mode === "cpu" ? "mc_sim_cpu" : "mc_sim";
  const exePath = path.join(backend, exeName);
  if (!fs.existsSync(exePath)) throw new Error(`Binary not found: ${exePath}`);

  writeRunLog(
    logPath,
    `=== starting simulation ===\nexe=${exePath}\nparam=${paramPath}\ncwd=${workdir}\n\n`
  );

  const child = spawn(exePath, [paramPath], { cwd: workdir });
  running = { id, child };

  child.stdout.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stdout", data: s });
    writeRunLog(logPath, s);
  });

  child.stderr.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stderr", data: s });
    writeRunLog(logPath, s);
  });

  child.on("close", (code) => {
    writeRunLog(logPath, `\n\n=== exit code: ${code} ===\n`);
    send("sim-done", { id, code, workdir, paramPath, exePath, mode, logPath });
    running = null;
  });

  child.on("error", (err) => {
    writeRunLog(logPath, `\n\n=== spawn error ===\n${err?.message || String(err)}\n`);
    send("sim-done", { id, code: -1, error: err?.message || String(err), workdir, paramPath, exePath, mode, logPath });
    running = null;
  });

  return { id, workdir, paramPath, exePath, mode, logPath };
});

/* ================= CANCEL ================= */

ipcMain.handle("cancel-sim", async () => {
  if (!running?.child) return { ok: false };
  try { running.child.kill("SIGTERM"); } catch {}
  running = null;
  return { ok: true };
});