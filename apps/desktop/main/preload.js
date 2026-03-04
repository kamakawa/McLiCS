const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mclist", {
  // recents + files
  getRecents: () => ipcRenderer.invoke("get-recents"),
  openParamFile: () => ipcRenderer.invoke("open-param-file"),
  exportParamFile: (paramText) => ipcRenderer.invoke("export-param-file", { paramText }),

  // run / cancel
  runSim: (payload) => ipcRenderer.invoke("run-sim", payload),
  cancelSim: () => ipcRenderer.invoke("cancel-sim"),

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