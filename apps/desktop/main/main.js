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
  return path.resolve(__dirname, "..", "..", "..");
}

function backendDir() {
  return path.join(projectRoot(), "backend");
}

function runsBaseDir() {
  return path.join(app.getPath("documents"), "MClistRuns");
}

function safeInside(base, target) {
  const b = path.resolve(base);
  const t = path.resolve(target);
  return t === b || t.startsWith(b + path.sep);
}

function sanitizeRelPath(p) {
  const s = String(p || "").replace(/\\/g, "/");
  if (!s || s.includes("..")) return "";
  return s.replace(/^\/+/, "");
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

ipcMain.handle("get-recents", async () => loadRecents());

/* ================= RUN FILES ================= */

ipcMain.handle("list-run-files", async (_e, { workdir }) => {
  if (!workdir) return { files: [] };

  const base = runsBaseDir();
  if (!safeInside(base, workdir)) throw new Error("Invalid workdir (outside MClistRuns).");
  if (!fs.existsSync(workdir)) return { files: [] };

  const out = [];
  const stack = [workdir];

  while (stack.length) {
    const dir = stack.pop();
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const ent of entries) {
      const abs = path.join(dir, ent.name);
      const rel = path.relative(workdir, abs).replace(/\\/g, "/");
      if (ent.isDirectory()) stack.push(abs);
      else out.push(rel);
    }
  }

  out.sort((a, b) => a.localeCompare(b));
  return { files: out };
});

ipcMain.handle("read-run-file", async (_e, { workdir, file, maxBytes }) => {
  if (!workdir) return { text: "", truncated: false, error: "Missing workdir." };

  const base = runsBaseDir();
  if (!safeInside(base, workdir)) throw new Error("Invalid workdir (outside MClistRuns).");
  if (!fs.existsSync(workdir)) return { text: "", truncated: false, error: "Workdir not found." };

  const rel = sanitizeRelPath(file);
  if (!rel) return { text: "", truncated: false, error: "Invalid file path." };

  const abs = path.join(workdir, rel);
  if (!safeInside(workdir, abs)) throw new Error("Invalid file path (escape attempt).");

  if (!fs.existsSync(abs)) return { text: "", truncated: false, error: "File not found." };

  const stat = fs.statSync(abs);
  const limit = Math.max(1_000, Number(maxBytes) || 2_000_000);

  const fd = fs.openSync(abs, "r");
  try {
    const size = Math.min(stat.size, limit);
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, 0);

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

ipcMain.handle("open-run-folder", async (_e, { workdir }) => {
  if (!workdir) return { ok: false };
  if (!fs.existsSync(workdir)) return { ok: false };

  const base = runsBaseDir();
  if (!safeInside(base, workdir)) throw new Error("Invalid workdir (outside MClistRuns).");

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

  const paramPath = path.join(workdir, "param.txt");
  fs.writeFileSync(paramPath, String(paramText || ""), "utf8");

  const logPath = path.join(workdir, "run.log");
  const log = fs.createWriteStream(logPath, { flags: "a" });

  const backend = backendDir();

  const logLine = (s) => log.write(String(s) + "\n");

  logLine(`=== MClist run ${id} ===`);
  logLine(`mode=${mode}`);
  logLine(`backend=${backend}`);
  logLine(`param=${paramPath}`);
  logLine(`workdir=${workdir}`);
  logLine("");

  console.log("===== COMPILING BACKEND =====");
  console.log("Mode:", mode);
  console.log("Backend:", backend);

  const makeArgs = mode === "cpu" ? ["CPU"] : [];
  const compile = spawnSync("make", makeArgs, { cwd: backend, encoding: "utf8" });

  if (compile.stdout) {
    send("sim-log", { id, type: "stdout", data: compile.stdout });
    logLine(compile.stdout);
  }
  if (compile.stderr) {
    send("sim-log", { id, type: "stderr", data: compile.stderr });
    logLine(compile.stderr);
  }

  if (compile.status !== 0) {
    logLine("=== compilation FAILED ===");
    log.end();
    throw new Error("Compilation failed. Check run.log / Running screen.");
  }

  logLine("=== compilation OK ===");
  logLine("");

  const exeName = mode === "cpu" ? "mc_sim_cpu" : "mc_sim";
  const exePath = path.join(backend, exeName);

  if (!fs.existsSync(exePath)) {
    logLine(`Binary not found: ${exePath}`);
    log.end();
    throw new Error(`Binary not found after compilation: ${exePath}`);
  }

  logLine("=== starting simulation ===");
  logLine(`exe=${exePath}`);
  logLine(`param=${paramPath}`);
  logLine(`cwd=${workdir}`);
  logLine("");

  const child = spawn(exePath, [paramPath], { cwd: workdir });
  running = { id, child, logPath };

  child.stdout.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stdout", data: s });
    log.write(s);
  });

  child.stderr.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stderr", data: s });
    log.write(s);
  });

  child.on("close", (code) => {
    logLine("");
    logLine(`=== exit code: ${code} ===`);
    log.end();

    send("sim-done", { id, code, workdir, paramPath, exePath, mode, logPath });
    running = null;
  });

  child.on("error", (err) => {
    logLine("");
    logLine(`=== error: ${err.message} ===`);
    log.end();

    send("sim-done", {
      id,
      code: -1,
      error: err.message,
      workdir,
      paramPath,
      exePath,
      mode,
      logPath,
    });
    running = null;
  });

  return { id, workdir, paramPath, exePath, mode, logPath };
});

/* ================= CANCEL ================= */

ipcMain.handle("cancel-sim", async () => {
  if (!running?.child) return { ok: false };
  try {
    running.child.kill("SIGTERM");
  } catch {}
  running = null;
  return { ok: true };
});

/* ================= REPORT PDF =================
   Gera PDF sem libs externas:
   - monta um HTML (logo + meta + params + notes + plots)
   - renderiza num BrowserWindow oculto
   - printToPDF + SaveDialog
*/

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

ipcMain.handle("export-report-pdf", async (_e, payload) => {
  const meta = payload?.meta || {};
  const logoDataUrl = payload?.logoDataUrl || "";
  const paramText = payload?.paramText || "";
  const notes = payload?.notes || "";
  const plots = Array.isArray(payload?.plots) ? payload.plots : [];

  // nome padrão em inglês (como você pediu)
  const defaultName = "MClist-report.pdf";

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: "Save report",
    defaultPath: path.join(app.getPath("documents"), defaultName),
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });

  if (canceled || !filePath) return { canceled: true };

  const plotsHtml = plots
    .map((p, i) => {
      const title = escapeHtml(p?.title || `Plot ${i + 1}`);
      const dataUrl = p?.dataUrl || "";
      if (!dataUrl) return "";
      return `
        <div class="card">
          <div class="cardTitle">${title}</div>
          <img class="plot" src="${dataUrl}" />
        </div>
      `;
    })
    .join("\n");

  const html = `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <title>MClist Report</title>
    <style>
      @page { size: A4; margin: 16mm; }
      body{
        font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
        color:#111; background:#fff;
      }
      .top{
        display:flex; align-items:center; justify-content:space-between; gap:16px;
        border-bottom:1px solid rgba(0,0,0,0.10); padding-bottom:12px; margin-bottom:14px;
      }
      .brand{
        display:flex; align-items:center; gap:10px;
      }
      .logo{
        width:42px; height:42px; border-radius:10px; object-fit:contain;
        border:1px solid rgba(0,0,0,0.08); background:#fff;
      }
      .title{
        font-weight:900; letter-spacing:-0.2px; font-size:18px;
      }
      .subtitle{
        color:#555; font-weight:700; font-size:12px;
      }
      .badge{
        border:1px solid rgba(230,57,70,0.35);
        background:rgba(230,57,70,0.08);
        padding:6px 10px; border-radius:999px; font-weight:900; font-size:12px;
      }
      .grid{
        display:grid; grid-template-columns:1fr; gap:12px;
      }
      .card{
        border:1px solid rgba(0,0,0,0.10);
        border-radius:14px;
        padding:12px;
      }
      .cardTitle{
        font-weight:900; margin-bottom:8px;
      }
      .kv{
        font-size:12px; color:#333; line-height:1.5;
      }
      .kv b{ color:#000; }
      pre{
        white-space:pre-wrap;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size:11px;
        background:rgba(0,0,0,0.03);
        border:1px solid rgba(0,0,0,0.08);
        padding:10px;
        border-radius:12px;
        margin:0;
      }
      .plot{
        width:100%;
        border-radius:12px;
        border:1px solid rgba(0,0,0,0.08);
      }
    </style>
  </head>
  <body>
    <div class="top">
      <div class="brand">
        ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
        <div>
          <div class="title">MClist Report</div>
          <div class="subtitle">Monte Carlo Simulator</div>
        </div>
      </div>
      <div class="badge">${escapeHtml(meta?.mode || "run")}</div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="cardTitle">Run metadata</div>
        <div class="kv">
          <div><b>Run ID:</b> ${escapeHtml(meta?.runId || "")}</div>
          <div><b>Mode:</b> ${escapeHtml(meta?.mode || "")}</div>
          <div><b>Exit code:</b> ${escapeHtml(String(meta?.code ?? ""))}</div>
          <div><b>Workdir:</b> ${escapeHtml(meta?.workdir || "")}</div>
          <div><b>Param file:</b> ${escapeHtml(meta?.paramPath || "")}</div>
          <div><b>Executable:</b> ${escapeHtml(meta?.exePath || "")}</div>
        </div>
      </div>

      <div class="card">
        <div class="cardTitle">Parameters (param.txt)</div>
        <pre>${escapeHtml(paramText)}</pre>
      </div>

      <div class="card">
        <div class="cardTitle">Notes</div>
        <pre>${escapeHtml(notes)}</pre>
      </div>

      ${plotsHtml || ""}
    </div>
  </body>
  </html>
  `;

  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
    },
  });

  await win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(html));

  const pdf = await win.webContents.printToPDF({
    pageSize: "A4",
    printBackground: true,
    margins: { top: 0.6, bottom: 0.6, left: 0.6, right: 0.6 },
  });

  fs.writeFileSync(filePath, pdf);
  win.destroy();

  return { canceled: false, filePath };
});