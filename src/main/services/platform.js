const fs = require("fs");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

async function detectPlatformContext() {
  const osRelease = await tryReadFile("/etc/os-release");
  const productName = await tryReadFile("/sys/devices/virtual/dmi/id/product_name");
  const deckMarker = await tryReadFile("/etc/steamos-release");

  const isLinux = process.platform === "linux";
  const isSteamOs = Boolean(
    deckMarker ||
      (osRelease && (/steamos/i.test(osRelease) || /steam\s?deck/i.test(osRelease)))
  );
  const isSteamDeck = Boolean(
    isSteamOs ||
      (productName && /jupiter|galileo|steam deck/i.test(productName))
  );

  return {
    runtimePlatform: process.platform,
    isLinux,
    isSteamOs,
    isSteamDeck,
    productName: productName ? productName.trim() : "Unknown",
    osReleaseSource: osRelease ? "/etc/os-release" : "mock"
  };
}

async function runCommand(file, args, options = {}) {
  try {
    const result = await execFileAsync(file, args, { timeout: 5000, ...options });
    return {
      ok: true,
      stdout: result.stdout,
      stderr: result.stderr
    };
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

module.exports = {
  detectPlatformContext,
  runCommand,
  tryReadFile,
  matchValue
};
