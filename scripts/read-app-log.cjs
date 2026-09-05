// Read the packaged app's log file.
const os = require("os");
const path = require("path");
const fs = require("fs");

const candidates = [
  path.join(os.homedir(), "AppData", "Roaming", "OpenBoard", "openboard.log"),
  path.join(os.homedir(), "AppData", "Roaming", "openboard", "openboard.log"),
  path.join(os.homedir(), "AppData", "Roaming", "Electron", "openboard.log"),
];

let found = false;
for (const p of candidates) {
  if (fs.existsSync(p)) {
    console.log("=== " + p + " ===");
    const lines = fs.readFileSync(p, "utf8").trim().split(/\r?\n/);
    for (const l of lines.slice(-50)) console.log(l);
    found = true;
  }
}
if (!found) {
  console.log("No openboard.log found in candidates:");
  for (const p of candidates) console.log("  " + p);
  // Show what app folders exist
  const roaming = path.join(os.homedir(), "AppData", "Roaming");
  const dirs = fs.readdirSync(roaming).filter((d) => /openboard|electron/i.test(d));
  console.log("Roaming dirs matching:", dirs);
}
