const state = {
  dashboard: null,
  busy: {
    system: false,
    plugins: false,
    bios: false
  }
};

const elements = {
  systemSummary: document.querySelector("#system-summary"),
  systemChannels: document.querySelector("#system-channels"),
  pluginsSummary: document.querySelector("#plugins-summary"),
  pluginsList: document.querySelector("#plugins-list"),
  biosSummary: document.querySelector("#bios-summary"),
  biosChannels: document.querySelector("#bios-channels"),
  refreshSystemBtn: document.querySelector("#refresh-system-btn"),
  refreshPluginsBtn: document.querySelector("#refresh-plugins-btn"),
  updateAllPluginsBtn: document.querySelector("#update-all-plugins-btn"),
  statusTemplate: document.querySelector("#status-item-template")
};

function formatDate(value) {
  if (!value) {
    return "未执行";
  }

  return new Date(value).toLocaleString("zh-CN", {
    hour12: false
  });
}

function setBusy(section, isBusy) {
  state.busy[section] = isBusy;
  elements.refreshSystemBtn.disabled = state.busy.system;
  elements.refreshPluginsBtn.disabled = state.busy.plugins;
  elements.updateAllPluginsBtn.disabled = state.busy.plugins;
  render();
}

function createStatusItem(label, value) {
  const node = elements.statusTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".label").textContent = label;
  node.querySelector(".value").textContent = value;
  return node;
}

function renderStatusGrid(container, items) {
  container.replaceChildren(...items.map((item) => createStatusItem(item.label, item.value)));
}

function renderSystem() {
  const system = state.dashboard.system;
  renderStatusGrid(elements.systemSummary, [
    { label: "当前系统", value: system.currentVersion },
    { label: "Build ID", value: system.buildId },
    { label: "数据来源", value: system.source },
    { label: "上次检查", value: formatDate(system.lastCheckedAt) }
  ]);

  const cards = system.availableChannels.map((channel) => {
    const card = document.createElement("article");
    card.className = "action-card";

    const badge = document.createElement("span");
    badge.className = channel.id === "preview" ? "pill warning" : "pill";
    badge.textContent = channel.name;

    const title = document.createElement("h3");
    title.textContent = channel.targetVersion;

    const desc = document.createElement("p");
    desc.textContent = channel.summary;

    const button = document.createElement("button");
    button.className = "primary-button";
    button.textContent = state.busy.system ? "处理中..." : `更新到${channel.name}`;
    button.disabled = state.busy.system;
    button.addEventListener("click", async () => {
      setBusy("system", true);
      try {
        const result = await window.steamosApi.runSystemUpdate(channel.id);
        if (!result.cancelled) {
          state.dashboard.system = result.system;
        }
      } finally {
        setBusy("system", false);
      }
    });

    card.append(badge, title, desc, button);
    return card;
  });

  elements.systemChannels.replaceChildren(...cards);
}

function renderPlugins() {
  const plugins = state.dashboard.plugins;
  const pendingCount = plugins.items.filter((item) => item.installedVersion !== item.latestVersion).length;

  renderStatusGrid(elements.pluginsSummary, [
    { label: "插件来源", value: plugins.source },
    { label: "插件数量", value: String(plugins.items.length) },
    { label: "待更新", value: String(pendingCount) },
    { label: "上次刷新", value: formatDate(plugins.lastCheckedAt) }
  ]);

  const rows = plugins.items.map((plugin) => {
    const row = document.createElement("article");
    row.className = "plugin-row";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = plugin.name;

    const desc = document.createElement("p");
    desc.textContent = plugin.description;

    const meta = document.createElement("div");
    meta.className = "plugin-meta";
    meta.innerHTML = `
      <span>已安装 ${plugin.installedVersion}</span>
      <span>最新 ${plugin.latestVersion}</span>
      <span>状态 ${plugin.status}</span>
    `;

    left.append(title, desc, meta);

    const button = document.createElement("button");
    button.className = plugin.installedVersion === plugin.latestVersion ? "ghost-button" : "primary-button";
    button.disabled = state.busy.plugins || plugin.installedVersion === plugin.latestVersion;
    button.textContent = plugin.installedVersion === plugin.latestVersion ? "已最新" : "更新插件";
    button.addEventListener("click", async () => {
      setBusy("plugins", true);
      try {
        const result = await window.steamosApi.updatePlugin(plugin.id);
        state.dashboard.plugins = result.plugins;
      } finally {
        setBusy("plugins", false);
      }
    });

    row.append(left, button);
    return row;
  });

  elements.pluginsList.replaceChildren(...rows);
}

function renderBios() {
  const bios = state.dashboard.bios;
  renderStatusGrid(elements.biosSummary, [
    { label: "当前 BIOS", value: bios.currentVersion },
    { label: "厂商", value: bios.vendor },
    { label: "数据来源", value: bios.source },
    { label: "目标通道", value: bios.selectedChannel }
  ]);

  const cards = bios.channels.map((channel) => {
    const card = document.createElement("article");
    card.className = "action-card";

    const badge = document.createElement("span");
    badge.className = channel.id === bios.selectedChannel ? "pill" : "pill warning";
    badge.textContent = channel.id === bios.selectedChannel ? "当前目标" : "可切换";

    const title = document.createElement("h3");
    title.textContent = channel.name;

    const note = document.createElement("p");
    note.textContent = channel.note;

    const button = document.createElement("button");
    button.className = channel.id === bios.selectedChannel ? "ghost-button" : "primary-button";
    button.textContent = channel.id === bios.selectedChannel ? "已选中" : "切换通道";
    button.disabled = state.busy.bios || channel.id === bios.selectedChannel;
    button.addEventListener("click", async () => {
      setBusy("bios", true);
      try {
        const result = await window.steamosApi.switchBiosChannel(channel.id);
        if (!result.cancelled) {
          state.dashboard.bios = result.bios;
        }
      } finally {
        setBusy("bios", false);
      }
    });

    card.append(badge, title, note, button);
    return card;
  });

  elements.biosChannels.replaceChildren(...cards);
}

function render() {
  if (!state.dashboard) {
    return;
  }

  renderSystem();
  renderPlugins();
  renderBios();
}

async function bootstrap() {
  setBusy("system", true);
  setBusy("plugins", true);
  setBusy("bios", true);

  try {
    state.dashboard = await window.steamosApi.loadDashboard();
    render();
  } finally {
    setBusy("system", false);
    setBusy("plugins", false);
    setBusy("bios", false);
  }
}

elements.refreshSystemBtn.addEventListener("click", async () => {
  setBusy("system", true);
  try {
    const result = await window.steamosApi.checkSystemUpdates();
    state.dashboard.system = result.system;
  } finally {
    setBusy("system", false);
  }
});

elements.refreshPluginsBtn.addEventListener("click", async () => {
  setBusy("plugins", true);
  try {
    const result = await window.steamosApi.refreshPlugins();
    state.dashboard.plugins = result.plugins;
  } finally {
    setBusy("plugins", false);
  }
});

elements.updateAllPluginsBtn.addEventListener("click", async () => {
  setBusy("plugins", true);
  try {
    const result = await window.steamosApi.updateAllPlugins();
    state.dashboard.plugins = result.plugins;
  } finally {
    setBusy("plugins", false);
  }
});

bootstrap();
