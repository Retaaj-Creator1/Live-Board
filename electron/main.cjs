// Electron main process (CommonJS)
const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const http = require("http");
const net = require("net");
const path = require("path");
const fs = require("fs");

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

// Load .env from the app dir (next to package.json) into process.env so the
// spawned Nitro server inherits DATABASE_URL / auth secrets in packaged builds.
// Simple KEY=VALUE parser — no dotenv dependency inside the staged app.
function loadEnvFile(file) {
  if (!fs.existsSync(file)) return;
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}
try {
  loadEnvFile(path.join(app.getAppPath(), ".env"));
} catch {}

// File-based logging (Windows GUI apps don't emit console output reliably).
const logPath = path.join(app.getPath("userData"), "openboard.log");
function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  try {
    fs.appendFileSync(logPath, line);
  } catch {}
  if (isDev) console.log(msg.trim());
}

// Shared window options (native frame retained so users can close/minimize).
function windowOptions() {
  return {
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "OpenBoard",
    autoHideMenuBar: true,
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}

// Resolve the built Nitro server entry for the packaged app.
function resolveServerEntry() {
  const candidates = [
    path.join(process.resourcesPath, "app", ".output", "server", "index.mjs"),
    path.join(__dirname, "..", ".output", "server", "index.mjs"),
  ];
  for (const c of candidates) {
    log(`resolveServerEntry: checking ${c} -> ${fs.existsSync(c)}`);
    if (fs.existsSync(c)) return c;
  }
  return null;
}

// Pick a free port for the in-app Nitro server to listen on.
function freePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, "127.0.0.1", () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

let serverProc = null;

// Poll the server until it accepts HTTP connections (or times out).
function waitForServer(port, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get({ host: "127.0.0.1", port, path: "/", timeout: 1500 }, (res) => {
        res.resume();
        resolve(true);
      });
      req.on("error", () => {
        if (Date.now() >= deadline) resolve(false);
        else setTimeout(check, 300);
      });
    };
    check();
  });
}

async function startServer() {
  const port = await freePort();
  log(`startServer: using port ${port}`);
  const entry = resolveServerEntry();
  if (!entry) {
    log("startServer: FAILED — no server entry found");
    app.exit(1);
    return null;
  }

  // Spawn the Nitro server inside Electron's Node runtime.
  const env = {
    ...process.env,
    NITRO_PORT: String(port),
    NITRO_HOST: "127.0.0.1",
    ELECTRON_RUN_AS_NODE: "1",
  };
  serverProc = spawn(process.execPath, [entry], { env, stdio: "pipe" });
  log(`startServer: spawned server pid=${serverProc.pid}`);
  serverProc.on("exit", (code, signal) => {
    log(`server exited: code=${code} signal=${signal}`);
  });
  serverProc.stdout?.on("data", (data) => log(`[server stdout] ${String(data).trim()}`));
  serverProc.stderr?.on("data", (data) => log(`[server stderr] ${String(data).trim()}`));

  const ready = await waitForServer(port);
  if (!ready) {
    log("startServer: FAILED — server did not respond within timeout");
    app.exit(1);
    return null;
  }
  log(`startServer: server ready on ${port}`);
  return port;
}

async function createWindow() {
  log(`createWindow: isDev=${isDev}`);
  if (isDev) {
    // Development: Vite dev server serves the app on :3000
    const win = new BrowserWindow(windowOptions());

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith("http")) {
        void shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });

    await win.loadURL("http://localhost:3000");
    log("createWindow: dev window loaded");
    return;
  }

  // Production: boot the bundled Nitro server, then load it.
  const port = await startServer();
  if (port === null) return; // startServer already exited the app

  const win = new BrowserWindow(windowOptions());
  log("createWindow: production window created");

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http")) {
      void shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  try {
    await win.loadURL(`http://127.0.0.1:${port}`);
    log("createWindow: production window loaded");
  } catch (err) {
    log(`createWindow: loadURL FAILED: ${err}`);
  }
}

process.on("uncaughtException", (err) => {
  log(`uncaughtException: ${err?.stack || err}`);
});

app.whenReady().then(() => {
  log(`app ready. userData=${app.getPath("userData")}`);
  log(
    `app.isPackaged=${app.isPackaged} resourcesPath=${process.resourcesPath} execPath=${process.execPath}`,
  );
  createWindow().catch((err) => log(`createWindow threw: ${err?.stack || err}`));
});

app.on("before-quit", () => {
  log("before-quit");
  if (serverProc) {
    try {
      serverProc.kill();
    } catch {}
  }
});

app.on("window-all-closed", () => {
  log("window-all-closed");
  if (process.platform !== "darwin") {
    if (serverProc) {
      try {
        serverProc.kill();
      } catch {}
    }
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
