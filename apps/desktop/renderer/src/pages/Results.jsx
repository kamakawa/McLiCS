import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logoPng from "../assets/logo.png";
import { useUi } from "../components/Shell.jsx";

const api = window.mclist;

/* ================== helpers: assets / capture ================== */

async function assetToDataUrl(assetUrl) {
  const res = await fetch(assetUrl);
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(blob);
  });
}

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

/* ================== Results ================== */

export default function Results() {
  const plotRef = useRef(null);
  const { t } = useUi();
  const nav = useNavigate();
  const loc = useLocation();
  const state = loc.state || {};

  const { id, code, workdir } = state;
  const ok = Number(code) === 0;

  const [tab, setTab] = useState("plots"); // plots | files | notes

  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState("");

  const [fileText, setFileText] = useState("");
  const [truncated, setTruncated] = useState(false);

  // param.txt always loaded
  const [paramText, setParamText] = useState("");

  // po.dat always loaded for plots tab
  const [poFileName, setPoFileName] = useState("");
  const [poText, setPoText] = useState("");
  const [poTruncated, setPoTruncated] = useState(false);

  const notesKey = useMemo(
    () => `mclist_notes_${id || workdir || "unknown"}`,
    [id, workdir]
  );
  const [notes, setNotes] = useState(() => localStorage.getItem(notesKey) || "");

  /* ---------- load file list (files tab) + detect po.dat ---------- */
  useEffect(() => {
    if (!api || !workdir) return;
    (async () => {
      try {
        const r = await api.listRunFiles(workdir);
        const list = r?.files || [];
        setFiles(list);

        const poCandidate =
          list.find((f) => f.toLowerCase() === "po.dat") ||
          list.find((f) => f.toLowerCase().endsWith("/po.dat")) ||
          list.find((f) => f.toLowerCase().includes("po.dat")) ||
          "";

        setPoFileName(poCandidate);

        const fileCandidate =
          poCandidate ||
          list.find((f) => isNumericTextFile(f)) ||
          list.find((f) => f.toLowerCase().includes("log")) ||
          list[0] ||
          "";

        setSelected(fileCandidate);
      } catch (e) {
        console.error(e);
      }
    })();
  }, [workdir]);

  /* ---------- load selected file content (files tab only) ---------- */
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

  /* ---------- load po.dat ALWAYS (plots tab source) ---------- */
  useEffect(() => {
    if (!api || !workdir || !poFileName) {
      setPoText("");
      setPoTruncated(false);
      return;
    }

    (async () => {
      try {
        const r = await api.readRunFile(workdir, poFileName, 2_000_000);
        setPoText(r?.text || "");
        setPoTruncated(!!r?.truncated);
      } catch (e) {
        console.error(e);
        setPoText("");
        setPoTruncated(false);
      }
    })();
  }, [workdir, poFileName]);

  /* ---------- load param.txt ALWAYS (for Parameters table + PDF) ---------- */
  useEffect(() => {
    if (!api || !workdir) return;
    (async () => {
      try {
        const r = await api.readRunFile(workdir, "param.txt", 500_000);
        setParamText(r?.text || "");
      } catch (e) {
        console.error(e);
        setParamText("");
      }
    })();
  }, [workdir]);

  /* ---------- persist notes ---------- */
  useEffect(() => {
    localStorage.setItem(notesKey, notes);
  }, [notesKey, notes]);

  /* ---------- Parse selected file as table (files tab) ---------- */
  const table = useMemo(() => {
    const t = parseTable(fileText);
    if (!t) return null;
    if (t.cols < 2 || t.rows.length < 2) return null;
    return t;
  }, [fileText]);

  /* ---------- Parse po.dat as table (plots tab) ---------- */
  const poTable = useMemo(() => {
    const t = parseTable(poText);
    if (!t) return null;
    if (t.cols < 2 || t.rows.length < 2) return null;
    return t;
  }, [poText]);

  /* ---------- Curves for selected file (files/report fallback only) ---------- */
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

  /* ---------- Curves for po.dat (plots tab) ---------- */
  const poCurves = useMemo(() => {
    if (!poTable) return [];
    const xs = poTable.rows.map((r) => r[0]);
    const out = [];
    for (let j = 1; j < poTable.cols; j++) {
      const name = poTable.headers?.[j] || `col${j}`;
      out.push({
        name,
        points: poTable.rows.map((r, i) => ({ x: xs[i], y: r[j] })),
      });
    }
    return out;
  }, [poTable]);

  /* ---------- parse param.txt into (key,value) rows ---------- */
  const paramKV = useMemo(() => parseParamKV(paramText), [paramText]);

  const exportPDF = async () => {
    try {
      if (!api) {
        alert(t("exportWorksElectron"));
        return;
      }
      if (!workdir) {
        alert(t("workdirNotFound"));
        return;
      }

      const logoDataUrl = await assetToDataUrl(logoPng);

      let paramTextLocal = "";
      try {
        const rr = await api.readRunFile(workdir, "param.txt", 2_000_000);
        paramTextLocal = rr?.text || "";
      } catch {
        paramTextLocal = "";
      }

      const poFile = files.find((f) => f.toLowerCase().includes("po.dat"));
      if (!poFile) {
        alert(t("poDatNotFound"));
        return;
      }

      const poResp = await api.readRunFile(workdir, poFile, 2_000_000);
      const poTextLocal = poResp?.text || "";
      const poParsed = parseTable(poTextLocal);

      if (!poParsed || !poParsed.rows?.length) {
        alert(t("poDatParseError"));
        return;
      }

      const poHeaders =
        poParsed.headers && poParsed.headers.length
          ? poParsed.headers
          : Array.from({ length: poParsed.cols }, (_, i) => `col${i}`);

      const fmtCell = (v) => {
        const n = Number(v);
        if (!Number.isFinite(n)) return "";
        const a = Math.abs(n);
        if (a >= 1000 || (a > 0 && a < 0.001)) return n.toExponential(6);
        return n.toFixed(8).replace(/0+$/g, "").replace(/\.$/g, "");
      };

      const poTableExport = {
        headers: poHeaders,
        rows: poParsed.rows.map((r) => r.map(fmtCell)),
      };

      const poCols = pickPoColumns(poParsed);
      if (!poCols) {
        alert(t("poDatColumnsError"));
        return;
      }

      const poRows = poParsed.rows
        .map((r) => ({
          T: r[poCols.t],
          S: r[poCols.s],
          varS: r[poCols.varS],
          E: r[poCols.e],
          varE: r[poCols.varE],
        }))
        .filter((p) => [p.T, p.S, p.E].every((v) => Number.isFinite(v)))
        .sort((a, b) => a.T - b.T);

      const seriesS = poRows.map((p) => ({
        x: p.T,
        y: p.S,
        lo: Number.isFinite(p.varS) ? p.S - Math.sqrt(Math.max(0, p.varS)) : null,
        hi: Number.isFinite(p.varS) ? p.S + Math.sqrt(Math.max(0, p.varS)) : null,
      }));

      const seriesE = poRows.map((p) => ({
        x: p.T,
        y: p.E,
        lo: Number.isFinite(p.varE) ? p.E - Math.sqrt(Math.max(0, p.varE)) : null,
        hi: Number.isFinite(p.varE) ? p.E + Math.sqrt(Math.max(0, p.varE)) : null,
      }));

      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-99999px";
      host.style.top = "0";
      host.style.width = "1200px";
      host.style.background = "#fff";
      host.style.padding = "20px";
      document.body.appendChild(host);

      const renderBandChartSvg = ({ title, xLabel, yLabel, series, accent }) => {
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

        const bandPtsHi = series
          .filter((p) => Number.isFinite(p.hi))
          .map((p) => [sx(p.x), sy(p.hi)]);
        const bandPtsLo = series
          .filter((p) => Number.isFinite(p.lo))
          .map((p) => [sx(p.x), sy(p.lo)])
          .reverse();

        const bandD =
          bandPtsHi.length && bandPtsLo.length
            ? `M ${bandPtsHi[0][0].toFixed(2)} ${bandPtsHi[0][1].toFixed(2)} ` +
              bandPtsHi.slice(1).map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
              " " +
              bandPtsLo.map(([x, y]) => `L ${x.toFixed(2)} ${y.toFixed(2)}`).join(" ") +
              " Z"
            : "";

        return `
          <div style="border:1px solid rgba(29,29,29,0.10); border-radius:16px; padding:12px; background:rgba(255,255,255,0.65); margin-bottom:16px;">
            <div style="display:flex; justify-content:space-between; align-items:baseline; gap:12px; padding-bottom:8px;">
              <div style="font-weight:950; letter-spacing:-0.2px;">${title}</div>
              <div style="font-size:12px; color:#666; font-weight:750;">
                x ∈ [${fmt(xmin)}, ${fmt(xmax)}] • y ∈ [${fmt(yMin)}, ${fmt(yMax)}]
              </div>
            </div>
            <svg viewBox="0 0 ${W} ${H}" style="width:100%; height:auto;">
              <rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="rgba(0,0,0,0.02)" />
              ${Array.from({ length: grid + 1 })
                .map((_, i) => {
                  const tt = i / grid;
                  const y = padT + tt * (H - padT - padB);
                  const x = padL + tt * (W - padL - padR);
                  return `
                    <g>
                      <line x1="${padL}" y1="${y}" x2="${W - padR}" y2="${y}" stroke="rgba(0,0,0,0.08)" />
                      <line x1="${x}" y1="${padT}" x2="${x}" y2="${H - padB}" stroke="rgba(0,0,0,0.08)" />
                    </g>
                  `;
                })
                .join("")}
              <line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(0,0,0,0.25)" />
              <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(0,0,0,0.25)" />
              <text x="${padL}" y="18" font-size="12" fill="rgba(29,29,29,0.70)" font-weight="800">${yLabel}</text>
              <text x="${W - padR - 18}" y="${H - 10}" font-size="12" fill="rgba(29,29,29,0.70)" font-weight="800">${xLabel}</text>
              ${bandD ? `<path d="${bandD}" fill="${accent}" opacity="0.14" stroke="none" />` : ""}
              <path d="${lineD}" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" />
            </svg>
          </div>
        `;
      };

      host.innerHTML = `
        ${renderBandChartSvg({
          title: t("orderParameterVsTemperature"),
          xLabel: "T",
          yLabel: "S",
          series: seriesS,
          accent: "#E63946",
        })}
        ${renderBandChartSvg({
          title: t("energyVsTemperature"),
          xLabel: "T",
          yLabel: "E",
          series: seriesE,
          accent: "rgba(29,29,29,0.75)",
        })}
      `;

      const chartNodes = Array.from(host.querySelectorAll("svg"));
      const poPlots = [];

      for (let i = 0; i < chartNodes.length; i++) {
        const svg = chartNodes[i];
        const wrapper = document.createElement("div");
        wrapper.appendChild(svg.cloneNode(true));
        const dataUrl = await capturePlotPngFromDom(wrapper);

        poPlots.push({
          title: i === 0 ? "po.dat — S(T)" : "po.dat — E(T)",
          dataUrl,
        });
      }

      document.body.removeChild(host);

      const res = await api.exportReportPDF({
        logoDataUrl,
        paramText: paramTextLocal,
        notes: notes || "",
        poPlots,
        poTable: poTableExport,
      });

      if (res?.canceled) return;
      alert(`${t("savedAt", { path: res.filePath })}`);
    } catch (e) {
      console.error(e);
      alert(t("exportError", { error: String(e) }));
    }
  };

  return (
    <div style={s.page}>
      <div style={s.top}>
        <div style={s.brand}>
          <div style={s.dot} />
          <div>
            <div style={s.brandTitle}>MClist</div>
            <div style={s.brandSub}>{t("appSubtitle")}</div>
          </div>
        </div>

        <div style={s.topActions}>
          <button style={s.btn} className="ui-hover" onClick={() => nav("/setup")}>
            {t("backToSetup")}
          </button>
          <button style={s.btn} className="ui-hover" onClick={() => nav("/")}>
            {t("home")}
          </button>
          <button
            style={s.btnPrimary}
            className="ui-hover"
            onClick={() => api?.openRunFolder?.(workdir)}
            disabled={!api || !workdir}
            title={t("openRunFolder")}
          >
            {t("openFolder")}
          </button>
        </div>
      </div>

      <div style={s.headerCard}>
        <div style={s.headerTitleWrap}>
          <div style={s.h1}>
            {t("results")} —{" "}
            <span style={{ color: ok ? "var(--ok)" : "var(--bad)" }}>
              {ok ? t("success") : t("failed")}
            </span>
          </div>
        </div>

        <div style={s.tabsCentered}>
          <Tab label={t("plots")} active={tab === "plots"} onClick={() => setTab("plots")} />
          <Tab label={t("files")} active={tab === "files"} onClick={() => setTab("files")} />
          <Tab
            label={t("notesReport")}
            active={tab === "notes"}
            onClick={() => setTab("notes")}
          />
        </div>
      </div>

      {tab === "plots" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>{t("dataSource")}</div>
            <div style={s.panelSub}>{t("dataSourceSub")}</div>

            <div style={s.fixedSourceBox}>
              <div style={s.fixedSourceLabel}>po.dat</div>
              <div style={s.fixedSourceSub}>
                {t("plotSourceFixedPoDat") || "Fixed source for plots"}
              </div>
            </div>

            {!poFileName ? (
              <div style={s.warn}>{t("poDatNotFound")}</div>
            ) : !poTable ? (
              <div style={s.warn}>{t("poDatParseError")}</div>
            ) : (
              <div style={s.okBox}>
                {t("parsedTable", { rows: poTable.rows.length, cols: poTable.cols })}
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <div style={s.panelTitle}>{t("parametersParamTxt")}</div>
              <div style={s.panelSub}>{t("parsedParamsSub")}</div>
              {paramKV.length ? (
                <KVTable rows={paramKV} />
              ) : (
                <div style={s.warn}>{t("parseParamWarn")}</div>
              )}
            </div>
          </div>

          <div style={s.panel}>
            <div style={s.panelTitle}>{t("plot")}</div>
            <div style={s.panelSub}>{t("plotSub")}</div>

            <div style={s.chartBox}>
              {poTable && isPoDat(poFileName || "po.dat", poTable) ? (
                <PoDatChart table={poTable} />
              ) : poCurves.length ? (
                <LineChart curves={poCurves} />
              ) : (
                <div style={s.chartEmpty}>{t("noPlotData")}</div>
              )}
            </div>
          </div>

          <div style={s.panelFull}>
            <div style={s.panelTitle}>{t("preview")}</div>
            <div style={s.panelSub}>
              {poTable ? t("tableViewFirstRows") : t("textView")}
              {poTruncated ? ` ${t("truncated")}` : ""}
            </div>

            {poTable ? (
              <DataTable table={poTable} maxRows={200} />
            ) : (
              <pre style={s.pre}>{poText || t("empty")}</pre>
            )}
          </div>
        </div>
      ) : null}

      {tab === "files" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>{t("files")}</div>
            <div style={s.panelSub}>{t("filesSub")}</div>

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
            <div style={s.panelTitle}>{t("content")}</div>
            <div style={s.panelSub}>
              {selected ? selected : "Select a file"} {truncated ? ` ${t("truncated")}` : ""}
            </div>

            {table ? (
              <DataTable table={table} maxRows={400} />
            ) : (
              <pre style={s.preTall}>{fileText || t("empty")}</pre>
            )}
          </div>
        </div>
      ) : null}

      {tab === "notes" ? (
        <div style={s.grid2}>
          <div style={s.panel}>
            <div style={s.panelTitle}>{t("notes")}</div>
            <div style={s.panelSub}>{t("notesSub")}</div>

            <textarea
              style={s.textarea}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t("notesPlaceholder")}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button
                className="ui-hover"
                style={s.btnGhost}
                onClick={() => setNotes("")}
                title={t("clearNotesTitle")}
              >
                {t("clear")}
              </button>

              <button
                className="ui-hover"
                style={s.btnPrimary}
                onClick={exportPDF}
                title={t("generatePdfTitle")}
              >
                {t("generatePdf")}
              </button>
            </div>
          </div>

          <div style={s.panel}>
            <div style={s.panelTitle}>{t("reportPreview")}</div>
            <div style={s.panelSub}>{t("reportPreviewSub")}</div>

            <div ref={plotRef} style={s.reportPreviewBox}>
              {poTable && isPoDat(poFileName || "po.dat", poTable) ? (
                <PoDatChart table={poTable} />
              ) : poCurves?.length ? (
                <LineChart curves={poCurves} />
              ) : (
                <div style={s.muted2}>{t("noPlotPreview")}</div>
              )}
            </div>

            <div style={{ marginTop: 10 }}>
              <div style={s.muted2}>{t("reportTip")}</div>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={s.panelTitle}>{t("parameters")}</div>
              <div style={s.panelSub}>{t("parametersPdfSub")}</div>
              {paramKV.length ? (
                <KVTable rows={paramKV} hideValues />
              ) : (
                <div style={s.warn}>{t("noParameters")}</div>
              )}
            </div>
          </div>
        </div>
      ) : null}

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

function KVTable({ rows, hideValues = false }) {
  const { t } = useUi();

  return (
    <div style={s.tableShell}>
      <div style={{ ...s.tableToolbar, justifyContent: "flex-start" }}>
        <div style={s.tablePill}>
          {t("paramsCount")}: <b>{rows.length}</b>
        </div>
      </div>

      <div style={s.tableWrap2}>
        <table style={s.table2}>
          <thead>
            <tr>
              <th style={{ ...s.th2, ...s.thStickyLeft }}>{t("key")}</th>
              {!hideValues ? <th style={s.th2}>{t("value")}</th> : null}
            </tr>
          </thead>

          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={i % 2 === 0 ? s.trEven2 : s.trOdd2}>
                <td style={{ ...s.td2, ...s.tdStickyLeft }}>{r.key}</td>
                {!hideValues ? <td style={s.td2}>{r.value}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================== DataTable (NO SORT) ================== */

function DataTable({ table, maxRows = 200 }) {
  const { t } = useUi();
  const headers =
    table.headers || Array.from({ length: table.cols }, (_, i) => `col${i}`);

  const [q, setQ] = useState("");
  const [pageSize, setPageSize] = useState(100);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const base = table.rows.slice(0, Math.min(table.rows.length, 50_000));
    if (!q.trim()) return base;

    const needle = q.trim().toLowerCase();
    return base.filter((r) =>
      r.some((v) => String(formatCell(v)).toLowerCase().includes(needle))
    );
  }, [table.rows, q]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages - 1);

  const pageRows = useMemo(() => {
    const start = safePage * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  useEffect(() => setPage(0), [q, pageSize]);

  const copyCSV = async () => {
    const csv = toCSV(headers, pageRows);
    await navigator.clipboard.writeText(csv);
    alert(t("csvCopied"));
  };

  const downloadCSV = () => {
    const csv = toCSV(headers, filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("tableCsvName");
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
            {t("rows")}: <b>{filtered.length}</b>
          </div>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search")}
            style={s.tableSearch}
          />

          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            style={s.tableSelect}
          >
            <option value={50}>{t("perPage50")}</option>
            <option value={100}>{t("perPage100")}</option>
            <option value={200}>{t("perPage200")}</option>
          </select>
        </div>

        <div style={s.tableToolbarRight}>
          <button style={s.smallBtn} className="ui-hover" onClick={copyCSV}>
            {t("copyCsv")}
          </button>
          <button style={s.smallBtn} className="ui-hover" onClick={downloadCSV}>
            {t("downloadCsv")}
          </button>
        </div>
      </div>

      <div style={s.tableWrap2}>
        <table style={s.table2}>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  style={{
                    ...s.th2,
                    ...(i === 0 ? s.thStickyLeft : null),
                    cursor: "default",
                  }}
                  title=""
                >
                  {h}
                </th>
              ))}
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

/* ================== param.txt parsing ================== */

function parseParamKV(text) {
  const lines = String(text || "").replace(/\r/g, "").split("\n");
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("#")) continue;

    const parts = line.split(/\s+/).filter(Boolean);
    if (parts.length < 2) continue;

    const key = parts[0];
    const value = parts.slice(1).join(" ");

    out.push({ key, value });
  }

  return out;
}

/* ================== parsing numeric tables ================== */

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
      headers = line
        .split(/[,\s]+/)
        .map((x) => x.trim())
        .filter(Boolean);
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

/* ================== charts (SVG) ================== */

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
          const tt = i / gridLines;
          const y = pad + tt * (H - pad * 2);
          const x = pad + tt * (W - pad * 2);
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
  const { t } = useUi();
  const cols = pickPoColumns(table);
  if (!cols) return <div style={s.chartEmpty}>{t("noPlotData")}</div>;

  const rows = table.rows
    .map((r) => ({
      T: r[cols.t],
      S: r[cols.s],
      varS: r[cols.varS],
      E: r[cols.e],
      varE: r[cols.varE],
    }))
    .filter((p) => [p.T, p.S, p.E].every((v) => Number.isFinite(v)));

  if (!rows.length) return <div style={s.chartEmpty}>{t("poDatColumnsError")}</div>;

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
          <div style={s.poTitle}>po.dat — {t("results")}</div>
          <div style={s.poSub}>S(T) and E(T) with uncertainty bands (± √var)</div>
        </div>
      </div>

      <BandChart
        title={t("orderParameterVsTemperature")}
        xLabel="T"
        yLabel="S"
        series={seriesS}
        accent="var(--red)"
      />

      <BandChart
        title={t("energyVsTemperature")}
        xLabel="T"
        yLabel="E"
        series={seriesE}
        accent="rgba(29,29,29,0.75)"
      />
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
  const bandPtsLo = series
    .filter((p) => Number.isFinite(p.lo))
    .map((p) => [sx(p.x), sy(p.lo)])
    .reverse();

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
          const tt = i / grid;
          const y = padT + tt * (H - padT - padB);
          const x = padL + tt * (W - padL - padR);
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
        <text
          x={W - padR - 18}
          y={H - 10}
          fontSize="12"
          fill="rgba(29,29,29,0.70)"
          fontWeight="800"
        >
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

  headerCard: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 18,
    boxShadow: "var(--shadow)",
    padding: 18,
    display: "grid",
    gap: 16,
    justifyItems: "center",
  },

  headerTitleWrap: {
    display: "grid",
    justifyItems: "center",
    textAlign: "center",
    width: "100%",
  },

  h1: { fontSize: 20, fontWeight: 950, letterSpacing: -0.3, textAlign: "center" },

  tabsCentered: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
    width: "100%",
  },

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

  fixedSourceBox: {
    border: "1px solid rgba(29,29,29,0.10)",
    background: "rgba(245,247,248,0.65)",
    borderRadius: 14,
    padding: 12,
    display: "grid",
    gap: 4,
  },

  fixedSourceLabel: {
    fontWeight: 950,
    color: "var(--black)",
    letterSpacing: -0.2,
  },

  fixedSourceSub: {
    fontSize: 12,
    color: "var(--muted)",
    fontWeight: 750,
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
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontWeight: 850,
    color: "var(--black)",
  },
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

  reportPreviewBox: {
    marginTop: 10,
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 14,
    padding: 10,
    background: "rgba(255,255,255,0.70)",
  },

  muted2: { color: "var(--muted)", fontWeight: 800, fontSize: 12 },

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
    userSelect: "none",
    whiteSpace: "nowrap",
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

  poTitleRow: { display: "flex", justifyContent: "space-between", alignItems: "flex-end" },
  poTitle: { fontWeight: 950, letterSpacing: -0.2 },
  poSub: { fontSize: 12, color: "var(--muted)", fontWeight: 750, marginTop: 2 },

  bandCard: {
    border: "1px solid rgba(29,29,29,0.10)",
    borderRadius: 16,
    padding: 12,
    background: "rgba(255,255,255,0.65)",
  },
  bandHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: 12,
    paddingBottom: 8,
  },
  bandTitle: { fontWeight: 950, letterSpacing: -0.2 },
  bandMeta: { fontSize: 12, color: "var(--muted)", fontWeight: 750 },

  smallBtn: {
    border: "1px solid var(--border)",
    background: "rgba(245,247,248,0.85)",
    color: "var(--black)",
    borderRadius: 12,
    padding: "8px 10px",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: 12,
    transition: "transform 140ms ease, box-shadow 140ms ease",
  },
};