// Shared parser for director_field_*.csv snapshots ("x,y,z,nx,ny,nz,S,pt").
//
// The backend (backend/src/io.cpp print_n) always writes one row per lattice
// point, using the raw integer loop indices (i,j,k) as x,y,z — so the lattice
// spacing is always exactly 1, regardless of geometry. That lets consumers
// (the 3D viewer) skip any spacing inference and just use the coordinates as-is.
//
// This produces flat typed arrays instead of an array of row objects, so a
// snapshot with thousands of points can be fed straight into a Three.js
// InstancedMesh without per-point object allocation.

// pt meaning (see backend/src/geometry_*.cpp):
//   0 = outside the simulated domain (never physically meaningful, always excluded)
//   1 = bulk point
//   2, 3 = surface / anchoring point (meaning varies by geometry)
export const PT_OUTSIDE = 0;
export const PT_BULK = 1;

// Matches Scritico in resources/scripts/render_director_preview.py, so the
// 2D and 3D previews agree on what counts as a "defect".
export const DEFECT_THRESHOLD = 0.65;

function normalizeHeader(h) {
  return String(h || "").trim().toLowerCase();
}

export function parseDirectorFieldCSV(text) {
  const raw = String(text || "").replace(/\r/g, "");
  const lines = raw.split("\n");

  let headerLine = "";
  let headerLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim();
    if (l) {
      headerLine = l;
      headerLineIdx = i;
      break;
    }
  }

  if (!headerLine) return { ok: false, reason: "Empty file." };

  const sep = headerLine.includes(",") ? "," : /\s+/;
  const headers = headerLine.split(sep).map(normalizeHeader).filter(Boolean);

  const col = {};
  headers.forEach((h, i) => {
    col[h] = i;
  });

  const required = ["x", "y", "z", "nx", "ny", "nz"];
  for (const key of required) {
    if (!(key in col)) return { ok: false, reason: `Missing column: ${key}` };
  }

  const hasS = "s" in col;
  const hasPt = "pt" in col;

  const rows = [];
  for (let i = headerLineIdx + 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(sep);
    if (parts.length < headers.length) continue;

    const x = Number(parts[col.x]);
    const y = Number(parts[col.y]);
    const z = Number(parts[col.z]);
    const nx = Number(parts[col.nx]);
    const ny = Number(parts[col.ny]);
    const nz = Number(parts[col.nz]);

    if (![x, y, z, nx, ny, nz].every(Number.isFinite)) continue;

    const sRaw = hasS ? Number(parts[col.s]) : 1;
    const ptRaw = hasPt ? Number(parts[col.pt]) : PT_BULK;

    rows.push({
      x,
      y,
      z,
      nx,
      ny,
      nz,
      s: Number.isFinite(sRaw) ? sRaw : 1,
      pt: Number.isFinite(ptRaw) ? ptRaw : PT_BULK,
    });
  }

  if (!rows.length) return { ok: false, reason: "No valid rows found." };

  const n = rows.length;
  const positions = new Float32Array(n * 3);
  const directors = new Float32Array(n * 3);
  const s = new Float32Array(n);
  const pt = new Int8Array(n);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    positions[i * 3 + 0] = r.x;
    positions[i * 3 + 1] = r.y;
    positions[i * 3 + 2] = r.z;
    directors[i * 3 + 0] = r.nx;
    directors[i * 3 + 1] = r.ny;
    directors[i * 3 + 2] = r.nz;
    s[i] = r.s;
    pt[i] = r.pt;

    if (r.x < minX) minX = r.x;
    if (r.x > maxX) maxX = r.x;
    if (r.y < minY) minY = r.y;
    if (r.y > maxY) maxY = r.y;
    if (r.z < minZ) minZ = r.z;
    if (r.z > maxZ) maxZ = r.z;
  }

  return {
    ok: true,
    count: n,
    positions,
    directors,
    s,
    pt,
    bounds: { minX, maxX, minY, maxY, minZ, maxZ },
  };
}

// Sorts the "director_field*.csv" entries of a run's file list into a
// timeline. mtimeMs reflects real write order (each snapshot is fully
// written — fopen→fprintf→fclose — before the backend moves to the next
// temperature/step), which is the only ordering that is robust across every
// evol mode (thermal/step/quench label by value, which isn't always monotonic
// with respect to when the file was written; electric mode reuses the same
// naming scheme).
export function buildDirectorFieldTimeline(files) {
  return (files || [])
    .filter((f) => f && isDirectorFieldPath(typeof f === "string" ? f : f.path))
    .map((f) => (typeof f === "string" ? { path: f, mtimeMs: 0 } : f))
    .sort((a, b) => (a.mtimeMs || 0) - (b.mtimeMs || 0));
}

export function isDirectorFieldPath(name) {
  return /(^|\/)director_field.*\.csv$/i.test(String(name || ""));
}
