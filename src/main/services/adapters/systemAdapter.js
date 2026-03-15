const { detectPlatformContext, tryReadFile, matchValue, runCommand } = require("../platform");

async function getSystemUpdateState(state, forceRefresh = false) {
  const platform = await detectPlatformContext();

  if (forceRefresh) {
    state.lastSystemCheckAt = new Date().toISOString();
  }

  const detectedVersion = await detectSteamOsVersion(platform);
  const updateProbe = await detectPendingUpdates(platform);

  return {
    platform,
    currentVersion: detectedVersion.version,
    buildId: detectedVersion.buildId,
    source: detectedVersion.source,
    lastCheckedAt: state.lastSystemCheckAt,
    statusMessage: detectedVersion.statusMessage,
    pendingStrategy: updateProbe.strategy,
    pendingSummary: updateProbe.summary,
    availableChannels: [
      {
        id: "stable",
        name: "稳定版",
        targetVersion: "SteamOS Stable",
        summary: "推荐给玩家分发环境，优先稳定和兼容性。",
        commandPreview: "steamos-update check && steamos-update apply --channel stable"
      },
      {
        id: "beta",
        name: "测试版",
        targetVersion: "SteamOS Beta",
        summary: "适合在你的开发 Deck 或测试设备上提前验证。",
        commandPreview: "steamos-update apply --channel beta"
      },
      {
        id: "preview",
        name: "预览版",
        targetVersion: "SteamOS Preview",
        summary: "高风险通道，适合功能验证，不建议普通玩家默认使用。",
        commandPreview: "steamos-update apply --channel preview"
      }
    ]
  };
}

async function runSystemUpdate(channel) {
  const platform = await detectPlatformContext();

  if (platform.isSteamDeck) {
    const commandPlan = {
      stable: ["steamos-update", ["apply", "--channel", "stable"]],
      beta: ["steamos-update", ["apply", "--channel", "beta"]],
      preview: ["steamos-update", ["apply", "--channel", "preview"]]
    };

    const [file, args] = commandPlan[channel] || [];
    if (!file) {
      throw new Error(`Unknown system update channel: ${channel}`);
    }

    const result = await runCommand(file, args);
    return {
      statusMessage: result.ok
        ? `已调用 ${file} ${args.join(" ")}`
        : `Steam Deck 真机命令执行失败，已保留调用计划。${result.stderr}`,
      lastActionAt: new Date().toISOString()
    };
  }

  return {
    statusMessage: `当前不是 Steam Deck 真机环境，已模拟提交 ${channel} 通道更新任务。`,
    lastActionAt: new Date().toISOString()
  };
}

async function detectSteamOsVersion(platform) {
  const osRelease = await tryReadFile("/etc/os-release");
  if (platform.isSteamOs && osRelease) {
    const version = matchValue(osRelease, "VERSION");
    const buildId = matchValue(osRelease, "BUILD_ID") || "unknown";
    return {
      version: version || "SteamOS (unknown)",
      buildId,
      source: "/etc/os-release",
      statusMessage: "已从 SteamOS 系统文件读取版本信息。"
    };
  }

  if (osRelease) {
    const version = matchValue(osRelease, "PRETTY_NAME") || "Linux host";
    return {
      version,
      buildId: matchValue(osRelease, "BUILD_ID") || "host-build",
      source: "/etc/os-release",
      statusMessage: "当前运行在非 SteamOS 环境，展示的是宿主系统信息。"
    };
  }

  return {
    version: "SteamOS 3.x (mock)",
    buildId: "mock-build-20260315",
    source: "mock",
    statusMessage: "当前环境未检测到 SteamOS 版本文件，已使用 mock 数据。"
  };
}

async function detectPendingUpdates(platform) {
  if (!platform.isSteamDeck) {
    return {
      strategy: "mock",
      summary: "当前不是 Steam Deck 真机，更新结果为模拟数据。"
    };
  }

  const probe = await runCommand("steamos-update", ["check"]);
  if (probe.ok) {
    return {
      strategy: "steamos-update",
      summary: probe.stdout.trim() || "已执行 steamos-update check。"
    };
  }

  return {
    strategy: "fallback",
    summary: "未找到 steamos-update 命令，建议在真机上确认系统工具路径和权限。"
  };
}

module.exports = {
  getSystemUpdateState,
  runSystemUpdate
};
