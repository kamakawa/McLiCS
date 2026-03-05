import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logoPng from "../assets/logo.png";

const api = window.mclist;

/* ================== Helpers (PDF export) ================== */

async function assetToDataUrl(assetUrl) {
  const res = await fetch(assetUrl);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(blob);
  });
}

// Captura SVG/Canvas do gráfico (da preview box) e transforma em PNG (dataURL)
async function capturePlotPngFromDom(domEl) {
  const svg = domEl?.querySelector("svg");
  if (svg) {
    const xml = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.src = url;
    await new Promise((r) => (img.onload = r));

    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = Math.round((img.height / img.width) * canvas.width) || 800;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(url);
    return canvas.toDataURL("image/png");
  }

  const canv = domEl?.querySelector("canvas");
  if (canv && typeof canv.toDataURL === "function") {
    return canv.toDataURL("image/png");
  }

  return "";
}

/* ================== Page ================== */

export default function Results() {
  const nav = useNavigate();
  const loc = useLocation();
  const data = loc.state || {};

  const { id, code, mode, workdir, paramPath, exePath, logPath } = data;
  const ok = Number(code) === 0;

  const [tab, setTab] = useState("plots"); // plots | files | notes
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState("");
  const [fileText, setFileText] = useState("");
  const [truncated, setTruncated] = useState(false);

  // Param text (para embutir no PDF)
  const [paramText, setParamText] = useState("");

  // Notes persistidas por run
  const notesKey = useMemo(
    () => `mclist_notes_${id || workdir || "unknown"}`,
    [id, workdir]
  );
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) || "");

  // ref do preview do report (pra capturar PNG do gráfico)
  const plotRef = useRef(null);

  // load file list
  useEffect(() => {
    if (!api || !workdir) return;
    (async () => {
      try {
        const r = await api.listRunFiles(workdir);
        const list = r?.files || [];
        setFiles(list);

        // pré-seleciona po.dat se existir
        const candidate =
          list.find((f) => f.toLowerCase() === "po.dat") ||
          list.find((f) => f.toLowerCase().endsWith("/po.dat")) ||
          list.find((f) => f.toLowerCase().includes("po.dat")) ||
          list.find((f) => isNumericTextFile(f)) ||
          list.find((f) => f.toLowerCase().includes("log")) ||
          list[0] ||
          "";
        setSelected(candidate);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [workdir]);

  // load selected file content
  useEffect(() => {
    if (!api || !workdir || !selected) return;
    (async () => {
      try {
        const r = await api.readRunFile(workdir, selected, 2_000_000);
        setFileText(r?.text || "");
        setTruncated(!!r?.truncated);
      } catch (e) {
        console.error(e);
        setFileText(String(e));
        setTruncated(false);
      }
    })();
  }, [workdir, selected]);

  // load param.txt for PDF
  useEffect(() => {
    if (!api || !workdir) return;
    (async () => {
      try {
        const r = await api.readRunFile(workdir, "param.txt", 2_000_000);
        setParamText(r?.text || "");
      } catch (e) {
        console.error(e);
        setParamText("");
      }
    })();
  }, [workdir]);

  // persist notes
  useEffect(() => {
    localStorage.setItem(notesKey, notes);
  }, [notesKey, notes]);

  // Parse table if possible
  const table = useMemo(() => {
    const t = parseTable(fileText);
    if (!t) return null;
    if (t.cols < 2 || t.rows.length < 2) return null;
    return t;
  }, [fileText]);

  const curves = useMemo(() => {
    if (!table) return [];
    const xs = table.rows.map((r) => r[0]);
    const out = [];
    for (let j = 1; j < table.cols; j++) {
      const name = table.headers?.[j] || `col${j}`;
      out.push({
        name,
        points: table.rows.map((r, i) => ({ x: xs[i], y: r[j] })),
      });
    }
    return out;
  }, [table]);

  const exportPDF = async () => {
    try {
      if (!api) {
        alert("Export works only inside Electron.");
        return;
      }
      if (!workdir) {
        alert("Workdir not found for this run.");
        return;
      }

      // 1) logo (dataURL)
      const logoDataUrl = await assetToDataUrl(logoPng);

      // 2) param.txt (texto)
      let paramText = "";
      try {
        const rr = await api.readRunFile(workdir, "param.txt", 2_000_000);
        paramText = rr?.text || "";
      } catch {
        paramText = "";
      }

      // 3) plot do preview (png)
      const plotPngDataUrl = await capturePlotPngFromDom(plotRef.current);

      // 4) tabela do po.dat (só se o arquivo atual for po.dat e parseou tabela)
      let poTable = null;
      if (selected?.toLowerCase().includes("po.dat") && table?.rows?.length) {
        const headers = table.headers || ["T", "S", "varS", "E", "varE"];
        // formata células pra PDF ficar bonito
        const fmt = (v) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return "";
          const a = Math.abs(n);
          if (a >= 1000 || (a > 0 && a < 0.001)) return n.toExponential(6);
          return n.toFixed(8).replace(/0+$/g, "").replace(/\.$/g, "");
        };
        const rows = table.rows.map((r) => r.map(fmt));
        poTable = { headers, rows };
      }

      const res = await api.exportReportPDF({
        logoDataUrl,
        paramText,
        notes: notes || "",
        plotPngDataUrl,
        poTable, // pode ser null
      });

      if (res?.canceled) return;
      alert(`Saved PDF:\n${res.filePath}`);
    } catch (e) {
      console.error(e);
      alert(`Export report error:\n${String(e)}`);
    }
  };

  return (
    <div style={s.page}>
      <div style={s.top}>
        <div style={s.brand}>
          <div style={s.dot} />
          <div>
            <div style={s.brandTitle}>MClist</div>
            <div style={s.brandSub}>Monte Carlo Simulator</div>
          </div>
        </div>

        <div style={s.topActions}>
          <button style={s.btn} className="ui-hover" onClick={() => nav("/setup")}>
            Back to Setup
          </button>
          <button style={s.btn} className="ui-hover" onClick={() => nav("/")}>
            Home
          </button>
          <button
            style={s.btnPrimary}
            className="ui-hover"
            onClick={() => api?.openRunFolder?.(workdir)}
            disabled={!api || !workdir}
            title="Open the run folder"
          >
            Open Folder
          </button>
        </div>
      </div>

      <div style={s.headerCard}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={s.h1}>
            Results —{" "}
            <span style={{ color: ok ? "var(--ok)" : "var(--bad)" }}>
              {ok ? "Success" : "Failed"}
            </span>
          </div>
          <div style={s.meta}>
            Mode: <b>{mode}</b> • Exit code: <b>{code}</b>
          </div>
          <div style={s.metaSmall}>Workdir: {workdir}</div>
          <div style={s.metaSmall}>Param: {paramPath}</div>
          {logPath ? <div style={s.metaSmall}>Log: {logPath}</div> : null}
          {exePath ? <div style={s.metaSmall}>Exe: {exePath}</div> : null}
        </div>

        <div style={s.tabs}>
          <Tab label="Plots" active={tab === "plots"} onClick={() => setTab("plots")} />
          <Tab label="Files" active={tab === "files"} onClick={() => setTab("files")} />
          <Tab
            label="Notes & Report"
            active={tab === "notes"}
            onClick={() => setTab("notes")}
          />
        </div>
      </div>

      {tab === "plots" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>Data source</div>
            <div style={s.panelSub}>Select an output file (.dat/.txt/.csv) to plot.</div>

            <select
              style={s.select}
              className="ui-hover"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              {files.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            {!isNumericTextFile(selected) ? (
              <div style={s.warn}>
                This file doesn’t look like numeric table data. Choose a{" "}
                <b>.dat / .csv / .txt</b> file.
              </div>
            ) : !table ? (
              <div style={s.warn}>
                Couldn’t parse numeric table. Check if file has numbers separated by
                spaces/tabs/commas.
              </div>
            ) : (
              <div style={s.okBox}>
                Parsed <b>{table.rows.length}</b> rows • <b>{table.cols}</b> columns.
              </div>
            )}
          </div>

          <div style={s.panel}>
            <div style={s.panelTitle}>Plot</div>
            <div style={s.panelSub}>Auto-plot: X = column 0, Y = columns 1..N.</div>

            <div style={s.chartBox}>
              {table && isPoDat(selected, table) ? (
                <PoDatChart table={table} />
              ) : curves.length ? (
                <LineChart curves={curves} />
              ) : (
                <div style={s.chartEmpty}>No plottable numeric data selected.</div>
              )}
            </div>
          </div>

          <div style={s.panelFull}>
            <div style={s.panelTitle}>Preview</div>
            <div style={s.panelSub}>
              {table ? "Table view (first 200 rows)." : "Text view."}
              {truncated ? " (truncated)" : ""}
            </div>

            {table ? (
              <DataTable table={table} maxRows={200} />
            ) : (
              <pre style={s.pre}>{fileText || "(empty)"}</pre>
            )}
          </div>
        </div>
      ) : null}

      {tab === "files" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>Files</div>
            <div style={s.panelSub}>Outputs created by the simulation in this run folder.</div>

            <div style={s.fileList}>
              {files.map((f) => (
                <button
                  key={f}
                  style={{
                    ...s.fileItem,
                    ...(f === selected ? s.fileItemActive : null),
                  }}
                  className="ui-hover"
                  onClick={() => setSelected(f)}
                >
                  <span style={s.fileName}>{f}</span>
                  <span style={s.fileTag}>{tagFor(f)}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={s.panel}>
            <div style={s.panelTitle}>Content</div>
            <div style={s.panelSub}>
              {selected ? selected : "Select a file"} {truncated ? " (truncated)" : ""}
            </div>

            {table ? (
              <DataTable table={table} maxRows={400} />
            ) : (
              <pre style={s.preTall}>{fileText || "(empty)"}</pre>
            )}
          </div>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>Notes</div>
            <div style={s.panelSub}>
              Write anything about this run. Saved locally (per run id/workdir).
            </div>

            <textarea
              style={s.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what you observed, hypotheses, settings, etc."
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                className="ui-hover"
                style={s.btnGhost}
                onClick={() => setNotes("")}
                title="Clear notes (only this run)"
              >
                Clear
              </button>

              <button
                className="ui-hover"
                style={s.btnPrimary}
                onClick={exportPDF}
                disabled={!api}
                title="Generate a PDF report with logo + params + plot + notes"
              >
                Generate PDF
              </button>
            </div>
          </div>

          <div style={s.panel}>
            <div style={s.panelTitle}>Report preview</div>
            <div style={s.panelSub}>
              This preview image will be embedded in the PDF report.
            </div>

            <div ref={plotRef} style={s.reportPreviewBox}>
              {table && isPoDat(selected, table) ? (
                <PoDatChart table={table} />
              ) : curves?.length ? (
                <LineChart curves={curves} />
              ) : (
                <div style={s.muted2}>No plot available to preview.</div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={s.muted2}>
                Tip: select <b>po.dat</b> in Files/Plots before exporting to capture the correct
                chart.
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Hover CSS (inline, pra não depender de achar CSS em outro arquivo) */}
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

/* ================== UI helpers ================== */

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...s.tab,
        ...(active ? s.tabActive : null),
      }}
      className="ui-hover"
    >
      {label}
    </button>
  );
}

/* ================== Table ================== */

function DataTable({ table, maxRows = 200 }) {
  const headers =
    table.headers || Array.from({ length: table.cols }, (_, i) => `col${i}`);

  const [q, setQ] = useState("");
  const [sort, setSort] = useState({ col: 0, dir: "asc" }); // dir: asc|desc
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const base = table.rows.slice(0, Math.min(table.rows.length, 50_000)); // safety
    if (!q.trim()) return base;

    const needle = q.trim().toLowerCase();
    return base.filter((r) =>
      r.some((v) => String(formatCell(v)).toLowerCase().includes(needle))
    );
  }, [table.rows, q]);

  const sorted = useMemo(() => {
    const { col, dir } = sort;
    const arr = filtered.slice();
    arr.sort((a, b) => {
      const av = a[col];
      const bv = b[col];
      const aN = Number.isFinite(av);
      const bN = Number.isFinite(bv);

      if (!aN && !bN) return 0;
      if (!aN) return 1;
      if (!bN) return -1;

      return dir === "asc" ? av - bv : bv - av;
    });
    return arr;
  }, [filtered, sort]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize]);

  useEffect(() => setPage(0), [q, pageSize, sort.col, sort.dir]);

  const toggleSort = (col) => {
    setSort((prev) => {
      if (prev.col !== col) return { col, dir: "asc" };
      return { col, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  const copyCSV = async () => {
    const csv = toCSV(headers, pageRows);
    await navigator.clipboard.writeText(csv);
    alert("CSV copied!");
  };

  const downloadCSV = () => {
    const csv = toCSV(headers, sorted);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "table.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={s.tableShell}>
      <div style={s.tableToolbar}>
        <div style={s.tableToolbarLeft}>
          <div style={s.tablePill}>
            Rows: <b>{sorted.length}</b>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search… (T, S, E, etc.)"
            style={s.tableSearch}
          />

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={s.tableSelect}
          >
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={200}>200 / page</option>
          </select>
        </div>

        <div style={s.tableToolbarRight}>
          <button style={s.smallBtn} className="ui-hover" onClick={copyCSV}>
            Copy CSV
          </button>
          <button style={s.smallBtn} className="ui-hover" onClick={downloadCSV}>
            Download CSV
          </button>
        </div>
      </div>

      <div style={s.tableWrap2}>
        <table style={s.table2}>
          <thead>
            <tr>
              {headers.map((h, i) => {
                const active = sort.col === i;
                const arrow = !active ? "" : sort.dir === "asc" ? " ▲" : " ▼";
                return (
                  <th
                    key={i}
                    style={{
                      ...s.th2,
                      ...(i === 0 ? s.thStickyLeft : null),
                      ...(active ? s.thActive : null),
                    }}
                    onClick={() => toggleSort(i)}
                    title="Click to sort"
                  >
                    {h}{arrow}
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {pageRows.slice(0, maxRows).map((r, ri) => (
              <tr key={ri} style={ri % 2 === 0 ? s.trEven2 : s.trOdd2}>
                {r.map((v, ci) => (
                  <td
                    key={ci}
                    style={{
                      ...s.td2,
                      ...(ci === 0 ? s.tdStickyLeft : null),
                    }}
                  >
                    {formatCell(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={s.tableFooter}>
        <button
          style={s.smallBtn}
          className="ui-hover"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={safePage === 0}
        >
          Prev
        </button>

        <div style={s.tablePill}>
          Page <b>{safePage + 1}</b> / {totalPages}
        </div>

        <button
          style={s.smallBtn}
          className="ui-hover"
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={safePage >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

function toCSV(headers, rows) {
  const esc = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const head = headers.map(esc).join(",");
  const body = rows
    .map((r) => r.map((v) => esc(formatCell(v))).join(","))
    .join("\n");
  return `${head}\n${body}\n`;
}

function formatCell(v) {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a >= 1000 || (a > 0 && a < 0.001)) return v.toExponential(3);
  return v.toFixed(6).replace(/0+$/g, "").replace(/\.$/g, "");
}

function isNumericTextFile(name) {
  if (!name) return false;
  return /\.(dat|txt|csv)$/i.test(name);
}

function tagFor(name) {
  const n = String(name).toLowerCase();
  if (n.endsWith(".log")) return "log";
  if (n.endsWith(".csv")) return "csv";
  if (n.endsWith(".dat")) return "dat";
  if (n.endsWith(".txt")) return "txt";
  return "file";
}

/* ================== parsing ================== */

function normName(s) {
  return String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isPoDat(selected, table) {
  if (!selected || !table) return false;
  if (!selected.toLowerCase().includes("po.dat")) return false;

  const hs = (table.headers || []).map(normName);
  const hasT = hs.includes("t");
  const hasS = hs.includes("s");
  const hasE = hs.includes("e");
  const hasVarS = hs.includes("vars") || hs.includes("varse") || hs.includes("varsigma");
  const hasVarE = hs.includes("vare") || hs.includes("varee");

  const fallback5 = !table.headers && table.cols >= 5;
  return (hasT && hasS && hasE && (hasVarS || hasVarE)) || fallback5;
}

function pickPoColumns(table) {
  if (!table?.rows?.length) return null;
  const hs = (table.headers || []).map(normName);

  const idx = (nameList, fallback) => {
    for (const n of nameList) {
      const i = hs.indexOf(n);
      if (i >= 0) return i;
    }
    return fallback;
  };

  const t = idx(["t"], 0);
  const s = idx(["s"], 1);
  const varS = idx(["vars", "varse"], 2);
  const e = idx(["e"], 3);
  const varE = idx(["vare"], 4);

  return { t, s, varS, e, varE };
}

function parseTable(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");

  let headers = null;
  let startIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;

    const line = raw.startsWith("#") ? raw.slice(1).trim() : raw;
    if (!line) continue;

    const hasLetter = /[A-Za-z]/.test(line);
    const hasDigit = /[0-9]/.test(line);

    if (hasLetter && !hasDigit) {
      headers = line.split(/[,\s]+/).map((x) => x.trim()).filter(Boolean);
      startIdx = i + 1;
    }
    break;
  }

  const rows = [];
  let cols = 0;

  for (let i = startIdx; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw) continue;
    if (raw.startsWith("[") && raw.endsWith("]")) continue;
    if (raw.startsWith("#")) continue;

    const parts = raw.includes(",")
      ? raw.split(",").map((p) => p.trim())
      : raw.split(/\s+/).map((p) => p.trim());

    const nums = parts.map((p) => Number(p));
    const finiteCount = nums.filter((v) => Number.isFinite(v)).length;

    if (finiteCount >= 2) {
      cols = Math.max(cols, nums.length);
      rows.push(nums.map((v) => (Number.isFinite(v) ? v : NaN)));
    }
  }

  if (!rows.length || cols < 2) return null;

  const norm = rows.map((r) => {
    const out = r.slice();
    while (out.length < cols) out.push(NaN);
    return out;
  });

  if (headers) {
    if (headers.length < cols) {
      headers = headers.concat(
        Array.from({ length: cols - headers.length }, (_, k) => `col${headers.length + k}`)
      );
    } else if (headers.length > cols) {
      headers = headers.slice(0, cols);
    }
  }

  return { headers, rows: norm, cols };
}

/* ================== Charts (SVG) ================== */

function LineChart({ curves }) {
  const W = 980;
  const H = 360;
  const pad = 36;

  const all = curves.flatMap((c) => c.points);
  const xs = all.map((p) => p.x).filter((v) => Number.isFinite(v));
  const ys = all.map((p) => p.y).filter((v) => Number.isFinite(v));

  if (!xs.length || !ys.length) return <div style={s.chartEmpty}>No numeric data.</div>;

  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);
  const ymin = Math.min(...ys);
  const ymax = Math.max(...ys);

  const sx = (x) => pad + ((x - xmin) / (xmax - xmin || 1)) * (W - pad * 2);
  const sy = (y) => H - pad - ((y - ymin) / (ymax - ymin || 1)) * (H - pad * 2);

  const gridLines = 5;

  return (
    <div style={{ width: "100%", overflow: "auto" }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <rect x="0" y="0" width={W} height={H} rx="14" fill="rgba(0,0,0,0.02)" />

        {Array.from({ length: gridLines + 1 }).map((_, i) => {
          const t = i / gridLines;
          const y = pad + t * (H - pad * 2);
          const x = pad + t * (W - pad * 2);
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="rgba(0,0,0,0.08)" />
              <line x1={x} y1={pad} x2={x} y2={H - pad} stroke="rgba(0,0,0,0.08)" />
            </g>
          );
        })}

        <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="rgba(0,0,0,0.25)" />
        <line x1={pad} y1={pad} x2={pad} y2={H - pad} stroke="rgba(0,0,0,0.25)" />

        {curves.map((c, idx) => {
          const d = c.points
            .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
            .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
            .join(" ");

          const stroke = idx === 0 ? "var(--red)" : "rgba(29,29,29,0.55)";

          return (
            <path
              key={c.name}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={idx === 0 ? 1 : 0.85}
            />
          );
        })}

        <text x={pad} y={pad - 10} fontSize="12" fill="rgba(29,29,29,0.7)" fontWeight="700">
          y ∈ [{fmt(ymin)} , {fmt(ymax)}]
        </text>
        <text x={pad} y={H - 10} fontSize="12" fill="rgba(29,29,29,0.7)" fontWeight="700">
          x ∈ [{fmt(xmin)} , {fmt(xmax)}]
        </text>
      </svg>

      <div style={s.legend}>
        {curves.map((c, idx) => (
          <div key={c.name} style={s.legendItem}>
            <span
              style={{
                ...s.legendDot,
                background: idx === 0 ? "var(--red)" : "rgba(29,29,29,0.55)",
              }}
            />
            {c.name}
          </div>
        ))}
      </div>
    </div>
  );
}

function PoDatChart({ table }) {
  const cols = pickPoColumns(table);
  if (!cols) return <div style={s.chartEmpty}>No data.</div>;

  const rows = table.rows
    .map((r) => ({
      T: r[cols.t],
      S: r[cols.s],
      varS: r[cols.varS],
      E: r[cols.e],
      varE: r[cols.varE],
    }))
    .filter((p) => [p.T, p.S, p.E].every((v) => Number.isFinite(v)));

  if (!rows.length) return <div style={s.chartEmpty}>Couldn’t parse po.dat columns.</div>;

  rows.sort((a, b) => a.T - b.T);

  const seriesS = rows.map((p) => ({
    x: p.T,
    y: p.S,
    lo: Number.isFinite(p.varS) ? p.S - Math.sqrt(Math.max(0, p.varS)) : null,
    hi: Number.isFinite(p.varS) ? p.S + Math.sqrt(Math.max(0, p.varS)) : null,
  }));

  const seriesE = rows.map((p) => ({
    x: p.T,
    y: p.E,
    lo: Number.isFinite(p.varE) ? p.E - Math.sqrt(Math.max(0, p.varE)) : null,
    hi: Number.isFinite(p.varE) ? p.E + Math.sqrt(Math.max(0, p.varE)) : null,
  }));

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={s.poTitleRow}>
        <div>
          <div style={s.poTitle}>po.dat — Thermodynamics</div>
          <div style={s.poSub}>S(T) and E(T) with uncertainty bands (± √var)</div>
        </div>
      </div>

      <BandChart title="Order parameter S vs Temperature" xLabel="T" yLabel="S" series={seriesS} accent="var(--red)" />
      <BandChart title="Energy E vs Temperature" xLabel="T" yLabel="E" series={seriesE} accent="rgba(29,29,29,0.75)" />
    </div>
  );
}

function BandChart({ title, xLabel, yLabel, series, accent }) {
  const W = 980;
  const H = 300;
  const padL = 54;
  const padR = 20;
  const padT = 34;
  const padB = 40;

  const xs = series.map((p) => p.x).filter(Number.isFinite);
  const ys = series.map((p) => p.y).filter(Number.isFinite);
  const los = series.map((p) => p.lo).filter(Number.isFinite);
  const his = series.map((p) => p.hi).filter(Number.isFinite);

  const xmin = Math.min(...xs);
  const xmax = Math.max(...xs);

  const yMin = Math.min(...ys, ...(los.length ? los : ys));
  const yMax = Math.max(...ys, ...(his.length ? his : ys));

  const sx = (x) => padL + ((x - xmin) / (xmax - xmin || 1)) * (W - padL - padR);
  const sy = (y) => H - padB - ((y - yMin) / (yMax - yMin || 1)) * (H - padT - padB);

  const grid = 5;

  const lineD = series
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .map((p, i) => `${i === 0 ? "M" : "L"} ${sx(p.x).toFixed(2)} ${sy(p.y).toFixed(2)}`)
    .join(" ");

  const bandPtsHi = series.filter((p) => Number.isFinite(p.hi)).map((p) => [sx(p.x), sy(p.hi)]);
  const bandPtsLo = series.filter((p) => Number.isFinite(p.lo)).map((p) => [sx(p.x), sy(p.lo)]).reverse();

  const bandD =
    bandPtsHi.length && bandPtsLo.length
      ? `M ${bandPtsHi[0][0].toFixed(2)} ${bandPtsHi[0][1].toFixed(2)} ` +
        bandPtsHi.slice(1).map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
        " " +
        bandPtsLo.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
        " Z"
      : "";

  return (
    <div style={s.bandCard}>
      <div style={s.bandHeader}>
        <div style={s.bandTitle}>{title}</div>
        <div style={s.bandMeta}>
          x ∈ [{fmt(xmin)}, {fmt(xmax)}] • y ∈ [{fmt(yMin)}, {fmt(yMax)}]
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        <rect x="0" y="0" width={W} height={H} rx="14" fill="rgba(0,0,0,0.02)" />

        {Array.from({ length: grid + 1 }).map((_, i) => {
          const t = i / grid;
          const y = padT + t * (H - padT - padB);
          const x = padL + t * (W - padL - padR);
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="rgba(0,0,0,0.08)" />
              <line x1={x} y1={padT} x2={x} y2={H - padB} stroke="rgba(0,0,0,0.08)" />
            </g>
          );
        })}

        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(0,0,0,0.25)" />
        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(0,0,0,0.25)" />

        <text x={padL} y={18} fontSize="12" fill="rgba(29,29,29,0.70)" fontWeight="800">
          {yLabel}
        </text>
        <text x={W - padR - 18} y={H - 10} fontSize="12" fill="rgba(29,29,29,0.70)" fontWeight="800">
          {xLabel}
        </text>

        {bandD ? <path d={bandD} fill={accent} opacity="0.14" stroke="none" /> : null}

        <path
          d={lineD}
          fill="none"
          stroke={accent}
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function fmt(v) {
  if (!Number.isFinite(v)) return "NaN";
  const a = Math.abs(v);
  if (a >= 1000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return v.toFixed(4);
}

/* ================= styles ================= */

const s = {
  page: { display: "grid", gap: 14, padding: 18 },

  top: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    padding: 14,
  },

  brand: { display: "flex", alignItems: "center", gap: 10 },
  dot: { width: 10, height: 10, borderRadius: 999, background: "var(--red)" },
  brandTitle: { fontWeight: 950, letterSpacing: -0.3 },
  brandSub: { fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  topActions: { display: "flex", gap: 10, flexWrap: "wrap" },

  btn: {
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.85)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.70)",
    color: "var(--black)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  btnPrimary: {
    border: "1px solid rgba(230,57,70,0.30)",
    background: "linear-gradient(180deg, rgba(230,57,70,1), rgba(190,30,44,1))",
    color: "white",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 950,
    transition: "transform 140ms ease, box-shadow 140ms ease",
    boxShadow: "0 14px 30px rgba(230,57,70,0.20)",
  },

  headerCard: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    padding: 16,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },

  h1: { fontSize: 20, fontWeight: 950, letterSpacing: -0.3 },
  meta: { color: "var(--black)", fontWeight: 800 },
  metaSmall: { color: "var(--muted)", fontWeight: 700, fontSize: 12 },

  tabs: { display: "flex", gap: 8, flexWrap: "wrap" },
  tab: {
    border: "1px solid var(--border)",
    background: "transparent",
    color: "var(--black)",
    borderRadius: 999,
    padding: "8px 12px",
    cursor: "pointer",
    fontWeight: 900,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },
  tabActive: {
    borderColor: "rgba(230,57,70,0.25)",
    boxShadow: "0 12px 26px rgba(230,57,70,0.14)",
    transform: "translateY(-1px)",
  },

  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
    alignItems: "start",
  },

  panel: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    padding: 16,
    display: "grid",
    gap: 10,
    minHeight: 220,
  },

  panelFull: {
    gridColumn: "1 / -1",
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    padding: 16,
    display: "grid",
    gap: 10,
  },

  panelTitle: { fontWeight: 950, letterSpacing: -0.2 },
  panelSub: { color: "var(--muted)", fontWeight: 750, fontSize: 12, lineHeight: 1.45 },

  select: {
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "10px 12px",
    background: "transparent",
    color: "var(--black)",
    fontWeight: 800,
    outline: "none",
    cursor: "pointer",
  },

  warn: {
    border: "1px solid rgba(230,57,70,0.25)",
    background: "rgba(230,57,70,0.08)",
    borderRadius: 14,
    padding: 12,
    fontWeight: 800,
    color: "var(--black)",
  },

  okBox: {
    border: "1px solid rgba(30,160,70,0.20)",
    background: "rgba(30,160,70,0.08)",
    borderRadius: 14,
    padding: 12,
    fontWeight: 800,
    color: "var(--black)",
  },

  chartBox: {
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(245,247,248,0.55)",
    minHeight: 420,
  },

  chartEmpty: { color: "var(--muted)", fontWeight: 800, padding: 10 },

  legend: { display: "flex", gap: 10, flexWrap: "wrap", paddingTop: 10 },
  legendItem: { display: "flex", alignItems: "center", gap: 8, fontWeight: 850, color: "var(--black)" },
  legendDot: { width: 10, height: 10, borderRadius: 999 },

  pre: {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 14,
    padding: 12,
    maxHeight: 260,
    overflow: "auto",
  },

  preTall: {
    margin: 0,
    whiteSpace: "pre-wrap",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    background: "rgba(0,0,0,0.03)",
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 14,
    padding: 12,
    height: "66vh",
    overflow: "auto",
  },

  fileList: { display: "grid", gap: 8, maxHeight: "66vh", overflow: "auto", paddingRight: 4 },
  fileItem: {
    textAlign: "left",
    border: "1px solid rgba(29,29,29,0.10)",
    background: "rgba(245,247,248,0.60)",
    borderRadius: 14,
    padding: "10px 12px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },
  fileItemActive: {
    borderColor: "rgba(230,57,70,0.25)",
    boxShadow: "0 14px 30px rgba(230,57,70,0.14)",
    transform: "translateY(-1px)",
  },
  fileName: { fontWeight: 900 },
  fileTag: { fontSize: 12, fontWeight: 900, color: "var(--muted)" },

  textarea: {
    border: "1px solid rgba(29,29,29,0.12)",
    background: "rgba(245,247,248,0.45)",
    borderRadius: 16,
    padding: 12,
    outline: "none",
    color: "var(--black)",
    fontWeight: 750,
    minHeight: "62vh",
    resize: "vertical",
    lineHeight: 1.5,
  },

  reportPreviewBox: {
    marginTop: 10,
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 14,
    padding: 10,
    background: "rgba(255,255,255,0.70)",
  },

  muted2: { color: "var(--muted)", fontWeight: 800, fontSize: 12 },

  /* TABLE */
  tableShell: {
    border: "1px solid rgba(29,29,29,0.10)",
    background: "rgba(245,247,248,0.55)",
    borderRadius: 16,
    overflow: "hidden",
  },

  tableToolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderBottom: "1px solid rgba(29,29,29,0.08)",
    background: "rgba(255,255,255,0.75)",
    backdropFilter: "blur(6px)",
  },

  tableToolbarLeft: { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" },
  tableToolbarRight: { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" },

  tablePill: {
    border: "1px solid rgba(29,29,29,0.10)",
    background: "rgba(255,255,255,0.70)",
    borderRadius: 999,
    padding: "6px 10px",
    fontWeight: 850,
    color: "var(--black)",
  },

  tableSearch: {
    border: "1px solid rgba(29,29,29,0.12)",
    background: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    padding: "8px 10px",
    outline: "none",
    fontWeight: 800,
    minWidth: 220,
    color: "var(--black)",
  },

  tableSelect: {
    border: "1px solid rgba(29,29,29,0.12)",
    background: "rgba(255,255,255,0.75)",
    borderRadius: 12,
    padding: "8px 10px",
    outline: "none",
    fontWeight: 800,
    color: "var(--black)",
    cursor: "pointer",
  },

  tableWrap2: {
    maxHeight: "60vh",
    overflow: "auto",
  },

  table2: {
    width: "100%",
    borderCollapse: "separate",
    borderSpacing: 0,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
  },

  th2: {
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(6px)",
    borderBottom: "1px solid rgba(29,29,29,0.12)",
    padding: "10px 10px",
    textAlign: "left",
    fontWeight: 950,
    cursor: "pointer",
    userSelect: "none",
    whiteSpace: "nowrap",
  },

  thActive: {
    color: "var(--red)",
    borderBottom: "2px solid rgba(230,57,70,0.55)",
  },

  td2: {
    padding: "8px 10px",
    borderBottom: "1px solid rgba(29,29,29,0.06)",
    whiteSpace: "nowrap",
  },

  thStickyLeft: {
    left: 0,
    zIndex: 3,
    boxShadow: "6px 0 18px rgba(29,29,29,0.06)",
  },

  tdStickyLeft: {
    position: "sticky",
    left: 0,
    zIndex: 1,
    background: "inherit",
    boxShadow: "6px 0 18px rgba(29,29,29,0.06)",
    fontWeight: 900,
  },

  trEven2: { background: "rgba(255,255,255,0.55)" },
  trOdd2: { background: "rgba(245,247,248,0.65)" },

  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
    borderTop: "1px solid rgba(29,29,29,0.08)",
    background: "rgba(255,255,255,0.70)",
    backdropFilter: "blur(6px)",
  },

  smallBtn: {
    border: "1px solid rgba(29,29,29,0.12)",
    background: "rgba(255,255,255,0.70)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 850,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },

  poTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  poTitle: { fontWeight: 950, letterSpacing: -0.2 },
  poSub: { fontSize: 12, color: "var(--muted)", fontWeight: 750, marginTop: 2 },

  bandCard: {
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.65)",
  },
  bandHeader: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, paddingBottom: 8 },
  bandTitle: { fontWeight: 950, letterSpacing: -0.2 },
  bandMeta: { fontSize: 12, color: "var(--muted)", fontWeight: 750 },
};