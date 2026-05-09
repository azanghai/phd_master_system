import { spawnSync } from "node:child_process";

const targetBundles = {
  win: "nsis,msi",
  mac: "dmg,app",
  linux: "deb,rpm,appimage"
};

const platformAliases = {
  win32: "win",
  darwin: "mac",
  linux: "linux",
  windows: "win",
  win: "win",
  macos: "mac",
  mac: "mac",
  osx: "mac"
};

const requestedPlatform = process.argv[2] ?? process.platform;
const platform = platformAliases[requestedPlatform.toLowerCase()];

if (!platform) {
  console.error(`Unsupported desktop build platform: ${requestedPlatform}`);
  process.exit(1);
}

const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
const args = ["tauri", "build", "--bundles", targetBundles[platform]];

console.log(`Building ${platform} desktop bundles: ${targetBundles[platform]}`);

const result = spawnSync(npxBin, args, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
