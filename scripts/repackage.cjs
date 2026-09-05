// Clean previous packaging output (with retries for lingering Windows file
// locks), then run the packager. Usage: node scripts/repackage.cjs
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const outDir = path.join(root, "electron-build");

// 1. Kill leftover app processes so files are unlocked.
for (const image of ["OpenBoard.exe"]) {
  try {
    execFileSync("taskkill", ["/F", "/IM", image], { stdio: "ignore" });
    console.log(`killed running ${image}`);
  } catch {
    /* not running */
  }
}

// 2. Remove previous output with retries.
if (fs.existsSync(outDir)) {
  let removed = false;
  for (let i = 0; i < 8 && !removed; i++) {
    try {
      fs.rmSync(outDir, { recursive: true, force: true });
      removed = !fs.existsSync(outDir);
    } catch {
      console.log(`waiting for file locks… (attempt ${i + 1})`);
      execFileSync("powershell", ["-Command", "Start-Sleep 2"], { stdio: "ignore" });
    }
  }
  if (!removed) {
    console.error("Could not remove " + outDir + " — close any running OpenBoard and retry.");
    process.exit(1);
  }
}

// 3. Run the packager.
const res = execFileSync("node", [path.join(__dirname, "package-desktop.cjs")], {
  cwd: root,
  stdio: "inherit",
});
