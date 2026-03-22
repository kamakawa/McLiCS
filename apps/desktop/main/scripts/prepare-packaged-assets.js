const fs = require("fs");
const path = require("path");

const mainDir = path.resolve(__dirname, "..");
const repoRoot = path.resolve(mainDir, "..", "..", "..");

const rendererDist = path.join(repoRoot, "apps", "desktop", "renderer", "dist");
const backendSource = path.join(repoRoot, "backend", "dist", "linux-x64");

const outRenderer = path.join(mainDir, "resources", "renderer-dist");
const outBackend = path.join(mainDir, "resources", "backend", "linux-x64");

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

function main() {
  rmrf(outRenderer);
  rmrf(outBackend);

  copyDir(rendererDist, outRenderer);
  copyDir(backendSource, outBackend);

  assertExists(path.join(outRenderer, "index.html"), "renderer index.html");
  assertExists(path.join(outBackend, "mc_sim_cpu"), "CPU backend binary");
  assertExists(path.join(outBackend, "mc_sim"), "GPU backend binary");

  console.log("Packaged assets prepared successfully.");
  console.log("Renderer:", outRenderer);
  console.log("Backend :", outBackend);
}

main();