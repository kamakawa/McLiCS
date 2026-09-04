import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { useUi } from "./Shell.jsx";
import Select from "./Select.jsx";
import {
  parseDirectorFieldCSV,
  DEFECT_THRESHOLD,
  PT_BULK,
  PT_OUTSIDE,
} from "../utils/directorField.js";

/**
 * Interactive WebGL (Three.js) viewer for a single director_field_*.csv
 * snapshot: the whole 3D lattice as headless "rods" (nematic directors have
 * no arrowhead — n ≡ -n physically), orbit/zoom/pan, per-axis slice
 * clipping, bulk/surface filtering, and an S (order parameter) color scale
 * with a fixed "defect" highlight — the same Scritico = 0.65 convention used
 * by the 2D matplotlib preview, so both views agree on what a defect is.
 */

const ROD_RADIUS = 0.045;
const ROD_LENGTH = 0.78;

// Sequential blue ramp for the order-parameter magnitude (validated with the
// dataviz skill's palette validator against light & dark surfaces). Defects
// override to the fixed "critical" status red regardless of their S value,
// so they always read distinctly from the ramp — validated as a pair too.
const SEQUENTIAL_STOPS = [
  { t: 0, hex: 0xcde2fb },
  { t: 1 / 6, hex: 0x9ec5f4 },
  { t: 2 / 6, hex: 0x6da7ec },
  { t: 3 / 6, hex: 0x3987e5 },
  { t: 4 / 6, hex: 0x256abf },
  { t: 5 / 6, hex: 0x184f95 },
  { t: 1, hex: 0x0d366b },
];
const DEFECT_HEX = 0xd03b3b;
const SURFACE_HEX = { light: 0xf4f6f8, dark: 0x1b222c };

const tmpColorA = new THREE.Color();
const tmpColorB = new THREE.Color();
const tmpColorOut = new THREE.Color();

function sequentialColor(t) {
  const c = Math.min(1, Math.max(0, t));
  let i = 0;
  while (i < SEQUENTIAL_STOPS.length - 2 && c > SEQUENTIAL_STOPS[i + 1].t) i++;
  const a = SEQUENTIAL_STOPS[i];
  const b = SEQUENTIAL_STOPS[i + 1];
  const localT = (c - a.t) / (b.t - a.t || 1);
  tmpColorA.setHex(a.hex);
  tmpColorB.setHex(b.hex);
  return tmpColorOut.copy(tmpColorA).lerp(tmpColorB, localT);
}

const UP = new THREE.Vector3(0, 1, 0);
const VIEW_DIR = new THREE.Vector3(1, 0.8, 1).normalize(); // fixed 3/4 viewing angle
const tmpDir = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const tmpQuat = new THREE.Quaternion();
const tmpScale = new THREE.Vector3(1, 1, 1);
const tmpMatrix = new THREE.Matrix4();

function boundsKeyOf(b) {
  return `${b.minX},${b.maxX},${b.minY},${b.maxY},${b.minZ},${b.maxZ}`;
}

export default function DirectorField3DViewer({
  csvText,
  height = 460,
  compact = false,
}) {
  const { t, theme } = useUi();

  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const meshRef = useRef(null);
  const rodGeometryRef = useRef(null);
  const materialRef = useRef(null);
  const planesRef = useRef(null);
  const rafRef = useRef(0);
  const framedKeyRef = useRef("");

  const [filter, setFilter] = useState("all"); // all | bulk | surface
  const [highlightDefects, setHighlightDefects] = useState(true);
  const [clip, setClip] = useState({ x: 1, y: 1, z: 1 }); // fraction of the axis kept, 1 = full volume
  const [pointCount, setPointCount] = useState(0);

  const parsed = useMemo(() => parseDirectorFieldCSV(csvText), [csvText]);

  // Kept fresh on every render so the mount effect's resize handler (set up
  // once, on mount) can always read the latest parsed snapshot without
  // needing to be recreated.
  const parsedRef = useRef(parsed);
  parsedRef.current = parsed;

  const applyClipPlanes = (bounds, clipFrac) => {
    const planes = planesRef.current;
    if (!planes || !bounds) return;
    planes.x.constant = bounds.minX + clipFrac.x * (bounds.maxX - bounds.minX);
    planes.y.constant = bounds.minY + clipFrac.y * (bounds.maxY - bounds.minY);
    planes.z.constant = bounds.minZ + clipFrac.z * (bounds.maxZ - bounds.minZ);
  };

  const frameCamera = (bounds) => {
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    if (!camera || !controls) return;

    const cx = (bounds.minX + bounds.maxX) / 2;
    const cy = (bounds.minY + bounds.maxY) / 2;
    const cz = (bounds.minZ + bounds.maxZ) / 2;
    const dx = bounds.maxX - bounds.minX;
    const dy = bounds.maxY - bounds.minY;
    const dz = bounds.maxZ - bounds.minZ;
    const radius = Math.max(Math.sqrt(dx * dx + dy * dy + dz * dz) / 2, 0.75);

    // Distance needed so the bounding sphere fits inside whichever field of
    // view is tighter — vertical or horizontal, whichever the aspect ratio
    // makes smaller. A fixed multiplier (the previous approach) only looks
    // right for the aspect ratio it was eyeballed against; a short/wide
    // compact viewport has the same vertical FOV as a tall one, so it needs
    // to sit farther back for the same model to fit without cropping.
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * (camera.aspect || 1));
    const tightestFov = Math.min(vFov, hFov);
    const margin = 1.45; // headroom so the model doesn't touch the edges
    const dist = radius / Math.sin(tightestFov / 2) * margin;

    camera.position.set(cx + VIEW_DIR.x * dist, cy + VIEW_DIR.y * dist, cz + VIEW_DIR.z * dist);
    camera.near = Math.max(0.01, dist / 100);
    camera.far = dist * 20;
    camera.updateProjectionMatrix();

    controls.target.set(cx, cy, cz);
    controls.update();
  };

  /* ---- mount once: renderer / scene / camera / controls / lights ---- */
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1000);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.localClippingEnabled = true;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.75;
    controls.minDistance = 0.5;
    controls.maxDistance = 500;

    scene.add(new THREE.HemisphereLight(0xffffff, 0x505860, 1.05));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(6, 10, 8);
    scene.add(dirLight);

    const rodGeometry = new THREE.CylinderGeometry(ROD_RADIUS, ROD_RADIUS, ROD_LENGTH, 8, 1);
    const material = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });

    const planeX = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0);
    const planeY = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);
    material.clippingPlanes = [planeX, planeY, planeZ];

    sceneRef.current = scene;
    cameraRef.current = camera;
    rendererRef.current = renderer;
    controlsRef.current = controls;
    rodGeometryRef.current = rodGeometry;
    materialRef.current = material;
    planesRef.current = { x: planeX, y: planeY, z: planeZ };

    const renderLoop = () => {
      controls.update();
      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);

      // Reframe as soon as we have both a real (measured) viewport size and
      // data, if we haven't framed this exact lattice yet. This guarantees
      // the very first frame is composed with the same correct aspect ratio
      // "reset view" uses (called long after layout has settled), instead
      // of whatever aspect happened to be set at the moment the data first
      // arrived.
      const currentParsed = parsedRef.current;
      if (currentParsed?.ok) {
        const key = boundsKeyOf(currentParsed.bounds);
        if (key !== framedKeyRef.current) {
          framedKeyRef.current = key;
          frameCamera(currentParsed.bounds);
        }
      }
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      controls.dispose();
      if (meshRef.current) scene.remove(meshRef.current);
      rodGeometry.dispose();
      material.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      meshRef.current = null;
    };
  }, []);

  /* ---- background follows the app's light/dark theme ---- */
  useEffect(() => {
    if (!sceneRef.current) return;
    sceneRef.current.background = new THREE.Color(
      theme === "dark" ? SURFACE_HEX.dark : SURFACE_HEX.light
    );
  }, [theme]);

  /* ---- rebuild instances whenever the snapshot or the filter changes ---- */
  useEffect(() => {
    const scene = sceneRef.current;
    const material = materialRef.current;
    const rodGeometry = rodGeometryRef.current;
    if (!scene || !material || !rodGeometry) return;

    if (!parsed.ok) {
      setPointCount(0);
      if (meshRef.current) {
        scene.remove(meshRef.current);
        meshRef.current = null;
      }
      return;
    }

    const { positions, directors, s, pt, bounds, count } = parsed;

    const indices = [];
    for (let i = 0; i < count; i++) {
      const p = pt[i];
      if (p === PT_OUTSIDE) continue;
      if (filter === "bulk" && p !== PT_BULK) continue;
      if (filter === "surface" && p === PT_BULK) continue;
      indices.push(i);
    }

    const n = indices.length;

    if (meshRef.current && meshRef.current.count !== n) {
      scene.remove(meshRef.current);
      meshRef.current = null;
    }

    if (n === 0) {
      setPointCount(0);
      return;
    }

    let mesh = meshRef.current;
    if (!mesh) {
      mesh = new THREE.InstancedMesh(rodGeometry, material, n);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      meshRef.current = mesh;
    }

    for (let k = 0; k < n; k++) {
      const i = indices[k];
      tmpPos.set(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      tmpDir.set(directors[i * 3], directors[i * 3 + 1], directors[i * 3 + 2]);

      if (tmpDir.lengthSq() < 1e-10) {
        tmpQuat.identity();
      } else {
        tmpDir.normalize();
        tmpQuat.setFromUnitVectors(UP, tmpDir);
      }

      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      mesh.setMatrixAt(k, tmpMatrix);

      const isDefect = highlightDefects && s[i] < DEFECT_THRESHOLD;
      const color = isDefect ? tmpColorOut.setHex(DEFECT_HEX) : sequentialColor(s[i]);
      mesh.setColorAt(k, color);
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();

    setPointCount(n);

    // Reframe the camera only when the lattice shape itself changes (a
    // different run/file) — not on every snapshot of the same run, so the
    // user's rotation/zoom survives scrubbing and live playback.
    const key = boundsKeyOf(bounds);
    if (key !== framedKeyRef.current) {
      framedKeyRef.current = key;
      frameCamera(bounds);
    }

    applyClipPlanes(bounds, clip);
    // `clip` is intentionally omitted: dragging a clip slider is handled by
    // the dedicated effect below without rebuilding the whole mesh, and this
    // effect still reads the current `clip` value whenever it runs for a
    // real data/filter change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed, filter, highlightDefects]);

  /* ---- clip sliders only move the existing planes, no rebuild needed ---- */
  useEffect(() => {
    if (parsed.ok) applyClipPlanes(parsed.bounds, clip);
  }, [clip, parsed]);

  const resetView = () => {
    if (!parsed.ok) return;
    framedKeyRef.current = "";
    frameCamera(parsed.bounds);
    framedKeyRef.current = boundsKeyOf(parsed.bounds);
  };

  const canvasHeight = compact ? Math.min(260, height) : height;

  return (
    <div style={s.wrap}>
      <div style={s.toolbar}>
        {!compact ? (
          <div style={s.toolbarGroup}>
            <Select
              value={filter}
              onChange={setFilter}
              size="sm"
              options={[
                { value: "all", label: t("directorFilterAll") },
                { value: "bulk", label: t("directorFilterBulk") },
                { value: "surface", label: t("directorFilterSurface") },
              ]}
            />
          </div>
        ) : null}

        <label style={s.checkboxLabel}>
          <input
            type="checkbox"
            checked={highlightDefects}
            onChange={(e) => setHighlightDefects(e.target.checked)}
          />
          {t("directorHighlightDefects")}
        </label>

        <button type="button" style={s.btnGhost} className="ui-hover" onClick={resetView}>
          {t("directorResetView")}
        </button>

        <span style={s.pointBadge}>{t("directorPointsShown", { count: pointCount })}</span>
      </div>

      <div ref={mountRef} style={{ ...s.canvasMount, height: canvasHeight }}>
        {!parsed.ok ? (
          <div style={s.overlayMessage}>
            <div style={s.overlayTitle}>{t("directorInvalidTitle")}</div>
            <div style={s.overlaySub}>{parsed.reason || t("directorNoDataTitle")}</div>
          </div>
        ) : parsed.ok && pointCount === 0 ? (
          <div style={s.overlayMessage}>
            <div style={s.overlayTitle}>{t("directorFilterEmptyTitle")}</div>
            <div style={s.overlaySub}>{t("directorFilterEmptySub")}</div>
          </div>
        ) : null}
      </div>

      {!compact ? (
        <div style={s.clipRow}>
          <ClipSlider label={t("directorClipX")} value={clip.x} onChange={(v) => setClip((c) => ({ ...c, x: v }))} />
          <ClipSlider label={t("directorClipY")} value={clip.y} onChange={(v) => setClip((c) => ({ ...c, y: v }))} />
          <ClipSlider label={t("directorClipZ")} value={clip.z} onChange={(v) => setClip((c) => ({ ...c, z: v }))} />
        </div>
      ) : null}

      <div style={s.legendRow}>
        <div style={s.legendLabel}>{t("directorLegendOrder")}</div>
        <div style={s.legendGradient} />
        <div style={s.legendEnds}>
          <span>{t("directorLegendLow")}</span>
          <span>{t("directorLegendHigh")}</span>
        </div>
        {highlightDefects ? (
          <div style={s.defectSwatchRow}>
            <span style={s.defectSwatch} />
            <span>{t("directorLegendDefect")}</span>
          </div>
        ) : null}
      </div>

      {!compact ? <div style={s.hint}>{t("director3DHint")}</div> : null}
    </div>
  );
}

function ClipSlider({ label, value, onChange }) {
  return (
    <label style={s.clipSlider}>
      <span style={s.clipSliderLabel}>{label}</span>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(value * 100)}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        style={s.range}
      />
    </label>
  );
}

const s = {
  wrap: { display: "grid", gap: 10 },

  toolbar: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },

  toolbarGroup: { minWidth: 150 },

  checkboxLabel: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 800,
    color: "var(--black)",
    cursor: "pointer",
  },

  btnGhost: {
    border: "1px solid var(--border)",
    background: "var(--bg-surface-2)",
    color: "var(--black)",
    borderRadius: 10,
    padding: "6px 10px",
    cursor: "pointer",
    fontWeight: 800,
    fontSize: 12,
  },

  pointBadge: {
    marginLeft: "auto",
    fontSize: 12,
    fontWeight: 800,
    color: "var(--muted)",
  },

  canvasMount: {
    position: "relative",
    width: "100%",
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid var(--border-soft)",
  },

  overlayMessage: {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    textAlign: "center",
    padding: 16,
    background: "var(--bg-surface-2)",
  },

  overlayTitle: { fontWeight: 900, color: "var(--black)" },
  overlaySub: { marginTop: 6, fontSize: 12, color: "var(--muted)", fontWeight: 700 },

  clipRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: 10,
  },

  clipSlider: { display: "grid", gap: 4 },
  clipSliderLabel: { fontSize: 11, fontWeight: 800, color: "var(--muted)" },
  range: { width: "100%" },

  legendRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    fontSize: 11,
    fontWeight: 800,
    color: "var(--muted)",
  },

  legendLabel: { color: "var(--black)" },

  legendGradient: {
    width: 120,
    height: 10,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, #cde2fb, #9ec5f4, #6da7ec, #3987e5, #256abf, #184f95, #0d366b)",
    border: "1px solid var(--border-soft)",
  },

  legendEnds: { display: "flex", gap: 6 },

  defectSwatchRow: { display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8 },

  defectSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
    background: "#d03b3b",
    display: "inline-block",
  },

  hint: { fontSize: 11, color: "var(--muted)", fontWeight: 700 },
};
