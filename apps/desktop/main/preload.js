const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mclist", {
  // recents + files
  getRecents: () => ipcRenderer.invoke("get-recents"),
  openParamFile: () => ipcRenderer.invoke("open-param-file"),
  openRecentProject: (filePath) =>
    ipcRenderer.invoke("open-recent-project", { filePath }),
  exportParamFile: (paramText) =>
    ipcRenderer.invoke("export-param-file", { paramText }),

  // run / cancel / status
  runSim: (payload) => ipcRenderer.invoke("run-sim", payload),
  cancelSim: () => ipcRenderer.invoke("cancel-sim"),
  getSimStatus: (id) => ipcRenderer.invoke("get-sim-status", { id }),

  // run folder + io
  openRunFolder: (workdir) =>
    ipcRenderer.invoke("open-run-folder", { workdir }),
  listRunFiles: (workdir) =>
    ipcRenderer.invoke("list-run-files", { workdir }),
  readRunFile: (workdir, relPath, maxBytes) =>
    ipcRenderer.invoke("read-run-file", { workdir, relPath, maxBytes }),

  // director preview
  renderDirectorPreview: (args) =>
    ipcRenderer.invoke("render-director-preview", args),

  // report
  exportReportPDF: (payload) =>
    ipcRenderer.invoke("export-report-pdf", payload),

  // events
  onSimLog: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on("sim-log", handler);
    return () => ipcRenderer.removeListener("sim-log", handler);
  },

  onSimDone: (cb) => {
    const handler = (_e, msg) => cb(msg);
    ipcRenderer.on("sim-done", handler);
    return () => ipcRenderer.removeListener("sim-done", handler);
  },
});