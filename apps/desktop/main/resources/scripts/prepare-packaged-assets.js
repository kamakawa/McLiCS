const fs = require("fs");
const path = require("path");

const mainDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mainDir, "..", "..", "..");

// ===== ORIGENS =====
const rendererDist = path.join(repoRoot, "apps", "desktop", "renderer", "dist");
const backendSource = path.join(repoRoot, "backend", "dist", "linux-x64");
const scriptsSource = path.join(mainDir, "scripts"); // <- scripts Python

// ===== DESTINOS =====
const outRenderer = path.join(mainDir, "resources", "renderer-dist");
const outBackend = path.join(mainDir, "resources", "backend", "linux-x64");
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
  if (fs.existsSync(filePath)) {
    fs.chmodSync(filePath, 0o755);
  }
}

// ===== MAIN =====
function main() {
  console.log("Preparing packaged assets...");

  // limpa tudo
  rmrf(outRenderer);
  rmrf(outBackend);
  rmrf(outScripts);

  // copia tudo
  copyDir(rendererDist, outRenderer);
  copyDir(backendSource, outBackend);
  copyDir(scriptsSource, outScripts);

  // valida renderer
  assertExists(path.join(outRenderer, "index.html"), "renderer index.html");

  // valida backend
  const cpuBin = path.join(outBackend, "mc_sim_cpu");
  const gpuBin = path.join(outBackend, "mc_sim");

  assertExists(cpuBin, "CPU backend binary");
  assertExists(gpuBin, "GPU backend binary");

  // valida script python
  const pyScript = path.join(outScripts, "render_director_preview.py");
  assertExists(pyScript, "Python render script");

  // ===== PERMISSÕES (LINUX) =====
  makeExecutable(cpuBin);
  makeExecutable(gpuBin);
  makeExecutable(pyScript);

  console.log("Packaged assets prepared successfully.");
  console.log("Renderer:", outRenderer);
  console.log("Backend :", outBackend);
  console.log("Scripts :", outScripts);
}

// executa
main();