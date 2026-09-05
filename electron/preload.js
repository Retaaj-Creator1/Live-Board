const { contextBridge } = require("electron");

// Expose minimal, safe APIs to the renderer process
contextBridge.exposeInMainWorld("electron", {
  isElectron: true,
  nodeVersion: process.versions.node,
  electronVersion: process.versions.electron,
});
