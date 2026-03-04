const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mclist", {
  // recents + param helpers
  getRecents: () => ipcRenderer.invoke("get-recents"),
  openParamFile: () => ipcRenderer.invoke("open-param-file"),
  exportParamFile: (paramText) => ipcRenderer.invoke("export-param-file", { paramText }),

  // run / cancel
  runSim: (payload) => ipcRenderer.invoke("run-sim", payload),
  cancelSim: () => ipcRenderer.invoke("cancel-sim"),

  // run outputs (files)
  listRunFiles: (workdir) => ipcRenderer.invoke("list-run-files", { workdir }),
  readRunFile: (workdir, file, maxBytes) =>
    ipcRenderer.invoke("read-run-file", { workdir, file, maxBytes }),
  openRunFolder: (workdir) => ipcRenderer.invoke("open-run-folder", { workdir }),

  // report
  exportReportPDF: (payload) => ipcRenderer.invoke("export-report-pdf", payload),

  // events (return unsubscribe to avoid leaks)
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