const fs = require("fs");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);
const STATE_FILE = "steamos-control-state.json";

const defaultState = {
  biosChannel: "stable",
  lastSystemCheckAt: null,
  lastPluginRefreshAt: null
};

async function getDashboardSnapshot(userDataPath) {
  const [system, plugins, bios] = await Promise.all([
    getSystemUpdateState(userDataPath),
    getPluginState(userDataPath),
    getBiosState(userDataPath)
  ]);

  return { system, plugins, bios };
}

async function refreshSystemUpdate(userDataPath) {
  const system = await getSystemUpdateState(userDataPath, true);
  return { system };
}

async function runSystemUpdate(userDataPath, channel) {
  const snapshot = await getSystemUpdateState(userDataPath, true);
  const selectedChannel = snapshot.availableChannels.find((item) => item.id === channel);

  if (!selectedChannel) {
    throw new Error(`Unknown system update channel: ${channel}`);
  }

  const state = await readState(userDataPath);
  state.lastSystemCheckAt = new Date().toISOString();
  await writeState(userDataPath, state);

  return {
    system: {
      ...snapshot,
      statusMessage: `已提交 ${selectedChannel.name} 更新任务，建议在真实环境中接入 pkexec 或系统服务。`,
      lastActionAt: new Date().toISOString()
    }
  };
}

async function refreshPlugins(userDataPath) {
  const plugins = await getPluginState(userDataPath, true);
  return { plugins };
}

async function updatePlugin(userDataPath, pluginId) {
  const plugins = await getPluginState(userDataPath, true);
  const updatedPlugins = plugins.items.map((item) => {
    if (item.id !== pluginId) {
      return item;
    }

    return {
      ...item,
      installedVersion: item.latestVersion,
      status: "updated",
      updatedAt: new Date().toISOString()
    };
  });

  return {
    plugins: {
      ...plugins,
      items: updatedPlugins,
      lastActionAt: new Date().toISOString()
    }
  };
}

async function updateAllPlugins(userDataPath) {
  const plugins = await getPluginState(userDataPath, true);
  return {
    plugins: {
      ...plugins,
      items: plugins.items.map((item) => ({
        ...item,
        installedVersion: item.latestVersion,
        status: "updated",
        updatedAt: new Date().toISOString()
      })),
      lastActionAt: new Date().toISOString()
    }
  };
}

async function switchBiosChannel(userDataPath, channel) {
  const state = await readState(userDataPath);
  state.biosChannel = channel;
  await writeState(userDataPath, state);

  const bios = await getBiosState(userDataPath);
  return {
    bios: {
      ...bios,
      selectedChannel: channel,
      planMessage: `已记录 BIOS 目标通道为 ${channel}，真机接入时请在这里调用受控刷写流程。`,
      lastActionAt: new Date().toISOString()
    }
  };
}

async function getSystemUpdateState(userDataPath, forceRefresh = false) {
  const state = await readState(userDataPath);

  if (forceRefresh) {
    state.lastSystemCheckAt = new Date().toISOString();
    await writeState(userDataPath, state);
  }

  const detectedVersion = await detectSteamOsVersion();

  return {
    currentVersion: detectedVersion.version,
    buildId: detectedVersion.buildId,
    source: detectedVersion.source,
    lastCheckedAt: state.lastSystemCheckAt,
    statusMessage: detectedVersion.statusMessage,
    availableChannels: [
      {
        id: "stable",
        name: "稳定版",
        targetVersion: "SteamOS 3.7.2",
        summary: "推荐日常使用，兼顾兼容性与稳定性。"
      },
      {
        id: "beta",
        name: "测试版",
        targetVersion: "SteamOS 3.8.0-beta",
        summary: "适合提前验证新功能，但可能存在兼容性波动。"
      },
      {
        id: "preview",
        name: "预览版",
        targetVersion: "SteamOS 3.8.0-preview.2",
        summary: "面向尝鲜和开发验证，风险更高。"
      }
    ]
  };
}

async function getPluginState(userDataPath, forceRefresh = false) {
  const state = await readState(userDataPath);

  if (forceRefresh) {
    state.lastPluginRefreshAt = new Date().toISOString();
    await writeState(userDataPath, state);
  }

  return {
    source: "mock-adapter",
    lastCheckedAt: state.lastPluginRefreshAt,
    items: [
      {
        id: "decky-loader",
        name: "Decky Loader",
        installedVersion: "2.12.1",
        latestVersion: "2.13.0",
        status: "update-available",
        description: "Steam Deck 常用插件加载器。"
      },
      {
        id: "powertools",
        name: "PowerTools",
        installedVersion: "1.4.0",
        latestVersion: "1.4.0",
        status: "up-to-date",
        description: "性能和功耗相关扩展。"
      },
      {
        id: "vibrantdeck",
        name: "VibrantDeck",
        installedVersion: "0.8.3",
        latestVersion: "0.9.0",
        status: "update-available",
        description: "屏幕色彩饱和度配置插件。"
      }
    ]
  };
}

async function getBiosState(userDataPath) {
  const state = await readState(userDataPath);
  const biosInfo = await detectBiosVersion();

  return {
    currentVersion: biosInfo.version,
    vendor: biosInfo.vendor,
    source: biosInfo.source,
    selectedChannel: state.biosChannel,
    channels: [
      {
        id: "stable",
        name: "Stable",
        note: "优先稳定性，建议大多数设备使用。"
      },
      {
        id: "beta",
        name: "Beta",
        note: "提前验证新 BIOS 行为。"
      },
      {
        id: "preview",
        name: "Preview",
        note: "高风险预览通道，仅建议测试环境使用。"
      }
    ]
  };
}

async function detectSteamOsVersion() {
  const osRelease = await tryReadFile("/etc/os-release");
  if (osRelease) {
    const version = matchValue(osRelease, "VERSION");
    const buildId = matchValue(osRelease, "BUILD_ID") || "unknown";
    return {
      version: version || "SteamOS (unknown)",
      buildId,
      source: "/etc/os-release",
      statusMessage: "已从系统文件读取版本信息。"
    };
  }

  return {
    version: "SteamOS 3.6.19",
    buildId: "mock-build-20260315",
    source: "mock",
    statusMessage: "当前环境未检测到 SteamOS 版本文件，已使用 mock 数据。"
  };
}

async function detectBiosVersion() {
  const biosVersion = await runCommand("cat", ["/sys/class/dmi/id/bios_version"]);
  const biosVendor = await runCommand("cat", ["/sys/class/dmi/id/bios_vendor"]);

  if (biosVersion.ok) {
    return {
      version: biosVersion.stdout.trim(),
      vendor: biosVendor.ok ? biosVendor.stdout.trim() : "Unknown",
      source: "sysfs"
    };
  }

  return {
    version: "F7A0121",
    vendor: "Valve",
    source: "mock"
  };
}

async function runCommand(file, args) {
  try {
    const result = await execFileAsync(file, args, { timeout: 4000 });
    return { ok: true, stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    return {
      ok: false,
      stdout: "",
      stderr: error.message
    };
  }
}

async function tryReadFile(filePath) {
  try {
    return await fs.promises.readFile(filePath, "utf8");
  } catch (_error) {
    return null;
  }
}

function matchValue(content, key) {
  const line = content.split("\n").find((item) => item.startsWith(`${key}=`));
  if (!line) {
    return null;
  }

  return line.split("=").slice(1).join("=").replace(/^"/, "").replace(/"$/, "");
}

async function readState(userDataPath) {
  const filePath = getStateFilePath(userDataPath);

  try {
    const raw = await fs.promises.readFile(filePath, "utf8");
    return { ...defaultState, ...JSON.parse(raw) };
  } catch (_error) {
    return { ...defaultState };
  }
}

async function writeState(userDataPath, state) {
  const filePath = getStateFilePath(userDataPath);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function getStateFilePath(userDataPath) {
  return path.join(userDataPath, STATE_FILE);
}

module.exports = {
  getDashboardSnapshot,
  refreshSystemUpdate,
  runSystemUpdate,
  refreshPlugins,
  updatePlugin,
  updateAllPlugins,
  switchBiosChannel
};
