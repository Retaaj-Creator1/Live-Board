// Build the web app with the node-server Nitro preset so `.output/server/index.mjs`
// runs as a local listening server (spawned by the Electron shell). The Lovable
// default preset is cloudflare-module, which exports a worker fetch handler and
// cannot be started as a Node server.
const { spawnSync } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");

// On Windows, npm must be run through a shell (npm.cmd cannot be spawned directly).
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const res = spawnSync(npmCmd, ["run", "build"], {
  cwd: root,
  env: {
    ...process.env,
    NITRO_PRESET: "node-server",
  },
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (res.error) {
  console.error("Failed to run build:", res.error.message);
  process.exit(1);
}
process.exit(res.status ?? 1);
