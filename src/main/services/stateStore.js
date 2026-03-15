const fs = require("fs");
const path = require("path");

const STATE_FILE = "steamos-control-state.json";

const defaultState = {
  biosChannel: "stable",
  lastSystemCheckAt: null,
  lastPluginRefreshAt: null
};

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
  readState,
  writeState,
  defaultState
};
