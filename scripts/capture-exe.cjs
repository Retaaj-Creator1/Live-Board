// Launch the packaged exe with chromium logging enabled and capture output.
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const exe = path.join(root, "electron-build", "OpenBoard-win32-x64", "OpenBoard.exe");

if (!fs.existsSync(exe)) {
  console.error("exe not found: " + exe);
  process.exit(1);
}

const out = path.join(root, "exe-capture.log");
if (fs.existsSync(out)) fs.rmSync(out);

// lazily get electron binary; use ELECTRON_ENABLE_LOGGING so Chromium logs go to stderr
const res = spawnSync(exe, [], {
  env: { ...process.env, ELECTRON_ENABLE_LOGGING: "1" },
  timeout: 20_000,
  encoding: "utf8",
  windowsHide: true,
});

fs.writeFileSync(
  out,
  `exit code: ${res.status}\nsignal: ${res.signal}\n\nSTDOUT:\n${res.stdout}\n\nSTDERR:\n${res.stderr}\n`,
  "utf8",
);
console.log(fs.readFileSync(out, "utf8").split(/\r?\n/).slice(-60).join("\n"));
