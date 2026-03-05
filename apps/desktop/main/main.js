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

function safeRelPath(workdir, relPath) {
  const abs = path.resolve(workdir, relPath);
  const base = path.resolve(workdir);
  if (!abs.startsWith(base)) throw new Error("Invalid path.");
  return abs;
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

ipcMain.handle("get-recents", async () => {
  return loadRecents();
});

/* ================= RUN FOLDER / IO ================= */

ipcMain.handle("open-run-folder", async (_event, { workdir }) => {
  if (!workdir) return { ok: false };
  await shell.openPath(workdir);
  return { ok: true };
});

function listFilesRecursive(dir, baseDir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      listFilesRecursive(full, baseDir, out);
    } else if (e.isFile()) {
      out.push(path.relative(baseDir, full));
    }
  }
}

ipcMain.handle("list-run-files", async (_event, { workdir }) => {
  if (!workdir || !fs.existsSync(workdir)) return { files: [] };

  const out = [];
  listFilesRecursive(workdir, workdir, out);

  // ordena: po.dat primeiro (se existir), depois resto
  out.sort((a, b) => {
    const aa = a.toLowerCase();
    const bb = b.toLowerCase();
    const ap = aa.endsWith("po.dat") ? -1 : 0;
    const bp = bb.endsWith("po.dat") ? -1 : 0;
    if (ap !== bp) return ap - bp;
    return aa.localeCompare(bb);
  });

  return { files: out };
});

ipcMain.handle("read-run-file", async (_event, { workdir, relPath, maxBytes = 2_000_000 }) => {
  if (!workdir || !relPath) return { text: "", truncated: false };
  const abs = safeRelPath(workdir, relPath);
  if (!fs.existsSync(abs)) return { text: "", truncated: false };

  const stat = fs.statSync(abs);
  const size = stat.size;

  const fd = fs.openSync(abs, "r");
  try {
    const toRead = Math.min(size, maxBytes);
    const buf = Buffer.alloc(toRead);
    fs.readSync(fd, buf, 0, toRead, 0);
    const text = buf.toString("utf8");
    return { text, truncated: size > maxBytes };
  } finally {
    fs.closeSync(fd);
  }
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

  const backend = backendDir();
  const logPath = path.join(workdir, "run.log");

  const log = (s) => {
    fs.appendFileSync(logPath, s + "\n", "utf8");
  };

  log(`=== MClist run ${id} ===`);
  log(`mode=${mode}`);
  log(`backend=${backend}`);
  log(`param=${paramPath}`);
  log(`workdir=${workdir}`);
  log("");

  // compilar
  log("=== compiling ===");
  const makeArgs = mode === "cpu" ? ["CPU"] : [];
  const compile = spawnSync("make", makeArgs, { cwd: backend, encoding: "utf8" });

  if (compile.stdout) {
    send("sim-log", { id, type: "stdout", data: compile.stdout });
    log(compile.stdout.trimEnd());
  }
  if (compile.stderr) {
    send("sim-log", { id, type: "stderr", data: compile.stderr });
    log(compile.stderr.trimEnd());
  }

  if (compile.status !== 0) {
    log("\n=== compilation FAILED ===");
    throw new Error("Compilation failed. Check run.log in workdir.");
  }

  log("\n=== compilation OK ===\n");

  const exeName = mode === "cpu" ? "mc_sim_cpu" : "mc_sim";
  const exePath = path.join(backend, exeName);

  if (!fs.existsSync(exePath)) {
    log(`Binary not found after compilation: ${exePath}`);
    throw new Error(`Binary not found after compilation: ${exePath}`);
  }

  log("=== starting simulation ===");
  log(`exe=${exePath}`);
  log(`param=${paramPath}`);
  log(`cwd=${workdir}`);
  log("");

  const child = spawn(exePath, [paramPath], { cwd: workdir });

  running = { id, child };

  child.stdout.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stdout", data: s });
    fs.appendFileSync(logPath, s, "utf8");
  });

  child.stderr.on("data", (d) => {
    const s = d.toString();
    send("sim-log", { id, type: "stderr", data: s });
    fs.appendFileSync(logPath, s, "utf8");
  });

  child.on("close", (code) => {
    log(`\n\n=== exit code: ${code} ===`);
    send("sim-done", { id, code, workdir, paramPath, exePath, mode, logPath });
    running = null;
  });

  child.on("error", (err) => {
    log(`\n\n=== spawn error: ${err.message} ===`);
    send("sim-done", { id, code: -1, error: err.message, workdir, paramPath, exePath, mode, logPath });
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

/* ================= REPORT (PDF) ================= */
/**
 * payload esperado:
 * {
 *   logoDataUrl: "data:image/png;base64,...",
 *   paramText: "...",
 *   notes: "...",
 *   plotPngDataUrl: "data:image/png;base64,...",
 *   poTable: { headers: [...], rows: [[...], ...] } // opcional
 * }
 */
ipcMain.handle("export-report-pdf", async (_event, payload) => {
  try {
    const {
      logoDataUrl = "",
      paramText = "",
      notes = "",
      plotPngDataUrl = "",
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

    const tableHtml = (() => {
      if (!poTable || !Array.isArray(poTable.rows) || !poTable.rows.length) return "";

      const headers = Array.isArray(poTable.headers) && poTable.headers.length
        ? poTable.headers
        : poTable.rows[0].map((_, i) => `col${i}`);

      // limita linhas pra não explodir o PDF (ajuste se quiser)
      const maxRows = 400;
      const rows = poTable.rows.slice(0, maxRows);

      return `
        <div class="section">
          <div class="h2">po.dat table</div>
          <div class="hint">Showing ${rows.length}${poTable.rows.length > rows.length ? ` / ${poTable.rows.length}` : ""} rows</div>
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
                      </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </div>
      `;
    })();

    const html = `
      <!doctype html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>MClist Report</title>
        <style>
          @page { margin: 28px; }
          body{
            font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial;
            color:#111;
            background:#fff;
          }
          .header{
            display:flex;
            justify-content:center;
            align-items:center;
            padding: 6px 0 12px 0;
            border-bottom: 1px solid rgba(0,0,0,0.10);
            margin-bottom: 14px;
          }
          .logo{
            height: 84px; /* LOGO MAIOR */
            object-fit: contain;
          }
          .section{
            margin: 14px 0 18px 0;
            break-inside: avoid;
          }
          .h2{
            font-size: 14px;
            font-weight: 900;
            margin: 0 0 6px 0;
            letter-spacing: -0.2px;
          }
          .hint{
            font-size: 11px;
            color: rgba(0,0,0,0.55);
            margin-bottom: 8px;
            font-weight: 600;
          }
          pre{
            margin:0;
            padding: 10px 12px;
            background: rgba(0,0,0,0.03);
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 12px;
            white-space: pre-wrap;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 11px;
            line-height: 1.45;
          }
          .plot{
            width: 100%;
            border: 1px solid rgba(0,0,0,0.10);
            border-radius: 12px;
            padding: 10px;
            background: rgba(0,0,0,0.02);
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
            background: rgba(0,0,0,0.04);
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
        </style>
      </head>
      <body>
        <div class="header">
          ${logoDataUrl ? `<img class="logo" src="${logoDataUrl}" />` : ""}
        </div>

        <div class="section">
          <div class="h2">Parameters</div>
          <pre>${esc(paramText)}</pre>
        </div>

        <div class="section">
          <div class="h2">Notes</div>
          <pre>${esc(notes || "")}</pre>
        </div>

        ${plotPngDataUrl ? `
          <div class="section">
            <div class="h2">po.dat plot</div>
            <div class="plot"><img src="${plotPngDataUrl}" /></div>
          </div>
        ` : ""}

        ${tableHtml}
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