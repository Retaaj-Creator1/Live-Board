// Stage a minimal app folder and package it with @electron/packager.
// Usage: node scripts/package-desktop.cjs
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const stageDir = path.join(root, "build", "stage");
const outDir = path.join(root, "electron-build");

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}
function cp(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

async function main() {
  // 1. Build (node-server preset) if .output is missing or stale.
  const entry = path.join(root, ".output", "server", "index.mjs");
  if (!fs.existsSync(entry)) {
    console.log("[package] Building with NITRO_PRESET=node-server …");
    const res = spawnSync("node", [path.join(__dirname, "build-desktop.cjs")], {
      cwd: root,
      stdio: "inherit",
    });
    if (res.status !== 0) process.exit(res.status ?? 1);
  } else {
    // Sanity check: ensure the entry is a node-server build (sets NITRO_PORT).
    const content = fs.readFileSync(entry, "utf8");
    if (!content.includes("NITRO_PORT")) {
      console.log("[package] .output is a cloudflare build; rebuilding with node-server preset …");
      const res = spawnSync("node", [path.join(__dirname, "build-desktop.cjs")], {
        cwd: root,
        stdio: "inherit",
      });
      if (res.status !== 0) process.exit(res.status ?? 1);
    }
  }

  // 2. Stage minimal app: .output + electron shell + a package.json with `main`.
  rmrf(stageDir);
  fs.mkdirSync(stageDir, { recursive: true });

  const entries = [
    // source               destination file/dir (relative to stageDir)
    ["electron/main.cjs", "electron/main.cjs"],
    ["electron/preload.js", "electron/preload.js"],
    ["electron/icon.ico", "electron/icon.ico"],
  ];
  // Secrets are NEVER bundled by default so the packaged app is safe to
  // distribute. Set INCLUDE_ENV=1 to opt in (personal builds with cloud sync).
  if (process.env.INCLUDE_ENV === "1") {
    entries.push([".env", ".env"]);
  }
  for (const [srcRel, destRel] of entries) {
    const src = path.join(root, srcRel);
    if (fs.existsSync(src)) cp(src, path.join(stageDir, destRel));
  }

  fs.cpSync(path.join(root, ".output"), path.join(stageDir, ".output"), { recursive: true });

  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  fs.writeFileSync(
    path.join(stageDir, "package.json"),
    JSON.stringify(
      {
        name: "openboard",
        productName: "OpenBoard",
        version: pkg.version || "1.0.0",
        main: "electron/main.cjs",
        description: "OpenBoard — a fast, free, self-owned Kanban board.",
        author: "OpenBoard",
        license: "MIT",
      },
      null,
      2,
    ),
  );

  // 3. Run @electron/packager (async API).
  console.log("[package] Running @electron/packager …");
  const packagerModule = require("@electron/packager");
  const packager = packagerModule.packager || packagerModule;
  const appPaths = await packager({
    dir: stageDir,
    out: outDir,
    platform: "win32",
    arch: "x64",
    overwrite: true,
    asar: false,
    icon: path.join(stageDir, "electron", "icon.ico"),
    name: "OpenBoard",
    appVersion: pkg.version || "1.0.0",
    desktopName: "OpenBoard",
  });
  console.log("[package] Done. Outputs:");
  for (const p of appPaths) console.log("  " + p);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
