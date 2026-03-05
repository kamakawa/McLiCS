const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
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

// normaliza symlinks / caminhos reais
function realPath(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

// garante que child está dentro de parent (considerando realpath/symlinks)
function safeInsideReal(parent, child) {
  const P = realPath(parent);
  const C = realPath(child);

  if (P === C) return true;

  const rel = path.relative(P, C);
  return rel && !rel.startsWith("..") && !path.isAbsolute(rel);
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

  // segurança com realpath (resolve symlinks)
  if (!safeInsideReal(base, workdir)) {
    const msg =
      `Invalid workdir (outside MClistRuns).\n` +
      `base=${base}\n` +
      `workdir=${workdir}\n` +
      `baseReal=${realPath(base)}\n` +
      `workdirReal=${realPath(workdir)}\n`;
    throw new Error(msg);
  }

  const files = walkFiles(workdir).sort((a, b) => a.localeCompare(b));
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

  // segurança: arquivo precisa ficar dentro do workdir
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
  if (!safeInsideReal(base, workdir)) {
    throw new Error("Invalid workdir (outside MClistRuns).");
  }

  await shell.openPath(workdir);
  return { ok: true };
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

  console.log("===== COMPILING BACKEND =====");
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
    throw new Error("Compilation failed. Check logs in Running screen / terminal.");
  }

  console.log("Compilation OK");

  const exeName = mode === "cpu" ? "mc_sim_cpu" : "mc_sim";
  const exePath = path.join(backend, exeName);

  if (!fs.existsSync(exePath)) {
    throw new Error(`Binary not found after compilation: ${exePath}`);
  }

  console.log("===== STARTING SIMULATION =====");
  console.log("Executable:", exePath);
  console.log("Param:", paramPath);
  console.log("Workdir:", workdir);

  // IMPORTANT: passamos só o nome do arquivo, porque cwd=workdir
  // (isso evita caminhos longos e reduz chance de parser quebrar)
  const child = spawn(exePath, ["param.txt"], { cwd: workdir });

  running = { id, child };

  child.stdout.on("data", (d) => {
    send("sim-log", { id, type: "stdout", data: d.toString() });
  });

  child.stderr.on("data", (d) => {
    send("sim-log", { id, type: "stderr", data: d.toString() });
  });

  child.on("close", (code) => {
    send("sim-done", { id, code, workdir, paramPath, exePath, mode });
    running = null;
  });

  child.on("error", (err) => {
    send("sim-done", { id, code: -1, error: err.message, workdir, paramPath, exePath, mode });
    running = null;
  });

  return { id, workdir, paramPath, exePath, mode };
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