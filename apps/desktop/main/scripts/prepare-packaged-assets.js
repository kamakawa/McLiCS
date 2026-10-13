const fs = require("fs");
const path = require("path");

const mainDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mainDir, "..", "..", "..");

// Mirrors the platform/arch folder naming used by backend/Makefile (OUT_DIR)
// and by main.js's packagedBackendDir() — keep these three in sync.
const platformArch = process.platform === "win32" ? "win-x64" : "linux-x64";
const exeSuffix = process.platform === "win32" ? ".exe" : "";

// ===== ORIGENS =====
const rendererDist = path.join(repoRoot, "apps", "desktop", "renderer", "dist");
const backendSource = path.join(repoRoot, "backend", "dist", platformArch);

// ===== DESTINOS =====
const outRenderer = path.join(mainDir, "resources", "renderer-dist");
const outBackend = path.join(mainDir, "resources", "backend", platformArch);
const outScripts = path.join(mainDir, "resources", "scripts");

// ===== HELPERS =====
function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmrf(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) {
    throw new Error(`Source folder not found: ${src}`);
  }

  ensureDir(dest);

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function assertExists(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${filePath}`);
  }
}

function makeExecutable(filePath) {
  // No-op on Windows (no POSIX mode bits) — harmless to call regardless.
  if (fs.existsSync(filePath)) {
    fs.chmodSync(filePath, 0o755);
  }
}

// ===== MAIN =====
function main() {
  console.log(`Preparing packaged assets for ${platformArch}...`);

  // limpa renderer e backend (scripts NÃO!)
  rmrf(outRenderer);
  rmrf(outBackend);

  // copia renderer e backend
  copyDir(rendererDist, outRenderer);
  copyDir(backendSource, outBackend);

  // valida renderer
  assertExists(path.join(outRenderer, "index.html"), "renderer index.html");

  // valida backend
  const cpuBin = path.join(outBackend, `mc_sim_cpu${exeSuffix}`);
  const gpuBin = path.join(outBackend, `mc_sim${exeSuffix}`);

  assertExists(cpuBin, "CPU backend binary");

  // GPU (CUDA) build is Linux-only for now — building it on Windows needs
  // MSVC + the CUDA Toolkit, a separate, heavier toolchain than the
  // MinGW-based CPU build. Require it on Linux (unchanged behavior); accept
  // its absence on Windows so a CPU-only package can still be produced.
  if (fs.existsSync(gpuBin)) {
    makeExecutable(gpuBin);
  } else if (platformArch === "win-x64") {
    console.warn(`GPU backend binary not found (${gpuBin}) — packaging Windows build without GPU support.`);
  } else {
    assertExists(gpuBin, "GPU backend binary");
  }

  // valida script python (não copia, só verifica!)
  const pyScript = path.join(outScripts, "render_director_preview.py");
  assertExists(pyScript, "Python render script");

  // permissões
  makeExecutable(cpuBin);
  makeExecutable(pyScript);

  console.log("Packaged assets prepared successfully.");
  console.log("Renderer:", outRenderer);
  console.log("Backend :", outBackend);
  console.log("Scripts :", outScripts);
}

main();
