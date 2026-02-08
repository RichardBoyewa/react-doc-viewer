const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const pdfjsBase = path.join(
  repoRoot,
  "node_modules",
  "react-pdf",
  "node_modules",
  "pdfjs-dist",
  "build"
);

const pdfJsPath = path.join(pdfjsBase, "pdf.js");
const workerPath = path.join(pdfjsBase, "pdf.worker.js");

function patchPdfJs() {
  if (!fs.existsSync(pdfJsPath)) {
    console.warn(`pdf.js not found at ${pdfJsPath}`);
    return;
  }
  let content = fs.readFileSync(pdfJsPath, "utf8");
  const original = content;

  // Force image smoothing to always be enabled.
  content = content.replace(
    /function getImageSmoothingEnabled\\([^)]*\\) \\{[\\s\\S]*?\\}/m,
    "function getImageSmoothingEnabled(transform, interpolate) {\\n  return true;\\n}"
  );

  if (content !== original) {
    fs.writeFileSync(pdfJsPath, content, "utf8");
    console.log("Patched pdf.js image smoothing.");
  } else {
    console.log("pdf.js patch already applied.");
  }
}

function patchWorker() {
  if (!fs.existsSync(workerPath)) {
    console.warn(`pdf.worker.js not found at ${workerPath}`);
    return;
  }
  let content = fs.readFileSync(workerPath, "utf8");
  const original = content;

  content = content.replace(
    /const interpolate = dict\\.get\\(\"I\", \"Interpolate\"\\);/g,
    "const interpolate = true;"
  );
  content = content.replace(
    /this\\.interpolate = dict\\.get\\(\"I\", \"Interpolate\"\\);/g,
    "this.interpolate = true;"
  );

  if (content !== original) {
    fs.writeFileSync(workerPath, content, "utf8");
    console.log("Patched pdf.worker.js interpolation.");
  } else {
    console.log("pdf.worker.js patch already applied.");
  }
}

function copyWorker() {
  const targets = [
    path.join(repoRoot, "playground", "public", "pdf.worker.js"),
    path.join(repoRoot, "dist", "pdf.worker.js"),
  ];
  if (!fs.existsSync(workerPath)) return;

  for (const target of targets) {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(workerPath, target);
  }
  console.log("Copied pdf.worker.js to playground/public and dist.");
}

patchPdfJs();
patchWorker();
copyWorker();
