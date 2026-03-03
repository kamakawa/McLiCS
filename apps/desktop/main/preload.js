const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mclist", {
  getRecents: () => ipcRenderer.invoke("recents:get"),
  openParamFile: () => ipcRenderer.invoke("param:open"),
  exportParamFile: (params) => ipcRenderer.invoke("param:export", params),
});