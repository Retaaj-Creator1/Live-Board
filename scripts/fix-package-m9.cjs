// Normalize package.json for M9 desktop packaging.
// Uses @electron/packager (per plan), removes electron-builder references.
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const pkgPath = path.join(root, "package.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));

// Scripts — @electron/packager only (the plan's chosen tool)
pkg.scripts = {
  dev: "vite dev",
  build: "vite build",
  "build:desktop": "npm run build",
  preview: "vite preview",
  electron: "electron .",
  "electron:dev": 'concurrently "npm run dev" "wait-on http://localhost:3000 && electron ."',
  "dist:win": "npm run build:desktop && node scripts/package-desktop.cjs",
  "package:win": "npm run build:desktop && node scripts/package-desktop.cjs",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  lint: "eslint .",
  format: "prettier --write .",
};

// Remove electron-builder entirely
if (pkg.devDependencies && pkg.devDependencies["electron-builder"]) {
  delete pkg.devDependencies["electron-builder"];
}

// Top-level metadata
pkg.main = "electron/main.cjs";
pkg.productName = "OpenBoard";
if (pkg.build) delete pkg.build;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf8");
console.log("package.json normalized OK");
