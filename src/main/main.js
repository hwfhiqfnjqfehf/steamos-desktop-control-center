const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const {
  getDashboardSnapshot,
  refreshSystemUpdate,
  runSystemUpdate,
  refreshPlugins,
  updatePlugin,
  updateAllPlugins,
  switchBiosChannel
} = require("./services/steamosService");

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 720,
    title: "SteamOS Control Center",
    backgroundColor: "#0b1118",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
}

app.whenReady().then(() => {
  ipcMain.handle("dashboard:load", async () => {
    return getDashboardSnapshot(app.getPath("userData"));
  });

  ipcMain.handle("system:check-updates", async () => {
    return refreshSystemUpdate(app.getPath("userData"));
  });

  ipcMain.handle("system:run-update", async (_event, channel) => {
    const choice = await dialog.showMessageBox({
      type: "warning",
      buttons: ["继续", "取消"],
      defaultId: 0,
      cancelId: 1,
      title: "系统更新确认",
      message: `准备执行 ${channel} 通道的系统更新。`,
      detail: "真实接入后这里应增加权限检查、磁盘空间检查和回滚策略。"
    });

    if (choice.response !== 0) {
      return { cancelled: true };
    }

    return runSystemUpdate(app.getPath("userData"), channel);
  });

  ipcMain.handle("plugins:refresh", async () => {
    return refreshPlugins(app.getPath("userData"));
  });

  ipcMain.handle("plugins:update-one", async (_event, pluginId) => {
    return updatePlugin(app.getPath("userData"), pluginId);
  });

  ipcMain.handle("plugins:update-all", async () => {
    return updateAllPlugins(app.getPath("userData"));
  });

  ipcMain.handle("bios:switch-channel", async (_event, channel) => {
    const choice = await dialog.showMessageBox({
      type: "warning",
      buttons: ["切换通道", "取消"],
      defaultId: 1,
      cancelId: 1,
      title: "BIOS 通道切换确认",
      message: `你将把 BIOS 目标通道切换为 ${channel}。`,
      detail: "当前版本不会直接刷写 BIOS，只会保存配置并模拟后续执行计划。"
    });

    if (choice.response !== 0) {
      return { cancelled: true };
    }

    return switchBiosChannel(app.getPath("userData"), channel);
  });

  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
