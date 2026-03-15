const { detectPlatformContext, runCommand } = require("../platform");

async function getBiosState(selectedChannel) {
  const platform = await detectPlatformContext();
  const biosInfo = await detectBiosVersion(platform);

  return {
    platform,
    currentVersion: biosInfo.version,
    vendor: biosInfo.vendor,
    source: biosInfo.source,
    selectedChannel,
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

async function switchBiosChannel(channel) {
  const platform = await detectPlatformContext();

  if (platform.isSteamDeck) {
    return {
      selectedChannel: channel,
      planMessage:
        "已记录 BIOS 目标通道；真机刷写流程应接入受控脚本、签名校验和电量检查。",
      lastActionAt: new Date().toISOString()
    };
  }

  return {
    selectedChannel: channel,
    planMessage: `当前不是 Steam Deck 真机环境，已模拟切换到 ${channel} BIOS 通道。`,
    lastActionAt: new Date().toISOString()
  };
}

async function detectBiosVersion(platform) {
  if (platform.isLinux) {
    const biosVersion = await runCommand("cat", ["/sys/class/dmi/id/bios_version"]);
    const biosVendor = await runCommand("cat", ["/sys/class/dmi/id/bios_vendor"]);

    if (biosVersion.ok) {
      return {
        version: biosVersion.stdout.trim(),
        vendor: biosVendor.ok ? biosVendor.stdout.trim() : "Unknown",
        source: "sysfs"
      };
    }
  }

  return {
    version: "F7A0121",
    vendor: "Valve",
    source: "mock"
  };
}

module.exports = {
  getBiosState,
  switchBiosChannel
};
