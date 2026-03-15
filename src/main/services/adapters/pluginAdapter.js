const { detectPlatformContext, runCommand } = require("../platform");

async function getPluginState(state, forceRefresh = false) {
  const platform = await detectPlatformContext();

  if (forceRefresh) {
    state.lastPluginRefreshAt = new Date().toISOString();
  }

  const deckyPlugins = await detectDeckyPlugins(platform);

  return {
    platform,
    source: deckyPlugins.source,
    lastCheckedAt: state.lastPluginRefreshAt,
    items: deckyPlugins.items
  };
}

async function updatePlugin(pluginId) {
  const platform = await detectPlatformContext();
  const current = await detectDeckyPlugins(platform);

  const items = current.items.map((item) => {
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

  if (platform.isSteamDeck) {
    return {
      items,
      source: `${current.source}:planned-action`,
      lastActionAt: new Date().toISOString()
    };
  }

  return {
    items,
    source: current.source,
    lastActionAt: new Date().toISOString()
  };
}

async function updateAllPlugins() {
  const platform = await detectPlatformContext();
  const current = await detectDeckyPlugins(platform);

  return {
    items: current.items.map((item) => ({
      ...item,
      installedVersion: item.latestVersion,
      status: "updated",
      updatedAt: new Date().toISOString()
    })),
    source: platform.isSteamDeck ? `${current.source}:planned-action` : current.source,
    lastActionAt: new Date().toISOString()
  };
}

async function detectDeckyPlugins(platform) {
  if (platform.isSteamDeck) {
    const probe = await runCommand("bash", ["-lc", "ls ~/.local/share/SteamDeckHomebrew/plugins"]);
    if (probe.ok) {
      const entries = probe.stdout
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean);

      return {
        source: "decky-filesystem",
        items: entries.map((entry) => ({
          id: entry.toLowerCase(),
          name: entry,
          installedVersion: "detected",
          latestVersion: "unknown",
          status: "detected",
          description: "已从 Decky 插件目录探测到，后续可接入真实版本仓库。"
        }))
      };
    }
  }

  return {
    source: "mock-adapter",
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

module.exports = {
  getPluginState,
  updatePlugin,
  updateAllPlugins
};
