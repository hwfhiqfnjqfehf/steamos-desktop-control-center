const { readState, writeState } = require("./stateStore");
const { getSystemUpdateState, runSystemUpdate: executeSystemUpdate } = require("./adapters/systemAdapter");
const { getPluginState, updatePlugin: executePluginUpdate, updateAllPlugins: executeAllPluginUpdates } = require("./adapters/pluginAdapter");
const { getBiosState, switchBiosChannel: executeBiosSwitch } = require("./adapters/biosAdapter");

async function getDashboardSnapshot(userDataPath) {
  const state = await readState(userDataPath);
  const [system, plugins, bios] = await Promise.all([
    getSystemUpdateState({ ...state }),
    getPluginState({ ...state }),
    getBiosState(state.biosChannel)
  ]);

  return { system, plugins, bios };
}

async function refreshSystemUpdate(userDataPath) {
  const state = await readState(userDataPath);
  const system = await getSystemUpdateState(state, true);
  await writeState(userDataPath, state);
  return { system };
}

async function runSystemUpdate(userDataPath, channel) {
  const state = await readState(userDataPath);
  state.lastSystemCheckAt = new Date().toISOString();
  await writeState(userDataPath, state);

  const snapshot = await getSystemUpdateState(state, false);
  const action = await executeSystemUpdate(channel);

  return {
    system: {
      ...snapshot,
      ...action
    }
  };
}

async function refreshPlugins(userDataPath) {
  const state = await readState(userDataPath);
  const plugins = await getPluginState(state, true);
  await writeState(userDataPath, state);
  return { plugins };
}

async function updatePlugin(userDataPath, pluginId) {
  const state = await readState(userDataPath);
  const plugins = await executePluginUpdate(pluginId);
  return {
    plugins: {
      ...(await getPluginState(state, false)),
      ...plugins
    }
  };
}

async function updateAllPlugins(userDataPath) {
  const state = await readState(userDataPath);
  const plugins = await executeAllPluginUpdates();
  return {
    plugins: {
      ...(await getPluginState(state, false)),
      ...plugins
    }
  };
}

async function switchBiosChannel(userDataPath, channel) {
  const state = await readState(userDataPath);
  state.biosChannel = channel;
  await writeState(userDataPath, state);

  const action = await executeBiosSwitch(channel);
  return {
    bios: {
      ...(await getBiosState(channel)),
      ...action
    }
  };
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
