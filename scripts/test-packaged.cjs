// Launch the packaged exe with a sanitized environment and verify it boots.
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const os = require("os");

const root = path.join(__dirname, "..");
const exe = path.join(root, "electron-build", "OpenBoard-win32-x64", "OpenBoard.exe");
const logPath = path.join(os.homedir(), "AppData", "Roaming", "OpenBoard", "openboard.log");

if (!fs.existsSync(exe)) {
  console.error("exe not found: " + exe);
  process.exit(1);
}

// Start from a clean log so we only see this run.
if (fs.existsSync(logPath)) fs.rmSync(logPath, { force: true });

// CRITICAL: clear ELECTRON_RUN_AS_NODE, otherwise the Electron binary runs as
// plain Node and exits instantly (this dev harness sets it globally).
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
env.ELECTRON_ENABLE_LOGGING = "1";

const child = spawn(exe, [], { env, detached: true, stdio: "ignore", windowsHide: true });
child.unref();
console.log(`launched exe pid=${child.pid}`);

// Poll briefly for the app log (10s), then print it and exit.
const started = Date.now();
const timer = setInterval(() => {
  const logExists = fs.existsSync(logPath);
  const elapsed = Date.now() - started;
  // Consider the run complete once the window has loaded (or after 12s).
  let done = elapsed > 12_000;
  if (logExists) {
    const content = fs.readFileSync(logPath, "utf8");
    if (content.includes("production window loaded")) done = true;
    if (done) {
      clearInterval(timer);
      console.log("--- app log ---");
      console.log(content.trim());
      const hasLooseError = content.includes("sessionSchema.loose");
      console.log(`\n=== RESULT ===`);
      console.log(`auth zod error present: ${hasLooseError ? "YES (still broken)" : "NO (fixed)"}`);
      process.exit(0);
    }
  }
  if (elapsed > 12_000) {
    clearInterval(timer);
    console.log("no 'window loaded' within 12s. Log:");
    console.log(logExists ? fs.readFileSync(logPath, "utf8") : "(none)");
    process.exit(0);
  }
}, 500);
