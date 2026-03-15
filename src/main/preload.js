const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("steamosApi", {
  loadDashboard: () => ipcRenderer.invoke("dashboard:load"),
  checkSystemUpdates: () => ipcRenderer.invoke("system:check-updates"),
  runSystemUpdate: (channel) => ipcRenderer.invoke("system:run-update", channel),
  refreshPlugins: () => ipcRenderer.invoke("plugins:refresh"),
  updatePlugin: (pluginId) => ipcRenderer.invoke("plugins:update-one", pluginId),
  updateAllPlugins: () => ipcRenderer.invoke("plugins:update-all"),
  switchBiosChannel: (channel) => ipcRenderer.invoke("bios:switch-channel", channel)
});
