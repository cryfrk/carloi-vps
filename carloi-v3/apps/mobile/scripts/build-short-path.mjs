import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const appRoot = resolve(__dirname, '..');
const v3Root = resolve(appRoot, '..', '..');
const repoRoot = resolve(v3Root, '..');
const requestedShortRoot = process.env.CARLOI_V3_SHORT_BUILD_ROOT || 'C:\\v3mobile';
let shortRoot = requestedShortRoot;
let shortV3Root = resolve(shortRoot, 'carloi-v3');
let shortAppRoot = resolve(shortV3Root, 'apps', 'mobile');
const outputApkPath = resolve(repoRoot, 'release', 'Carloi-v3-mobile.apk');

const env = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.carloi.com',
  EXPO_NO_METRO_WORKSPACE_ROOT: 'true',
  CARLOI_ICON_SOURCE: resolve(repoRoot, 'carloi.png')
};

function shouldSkip(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return [
    'node_modules',
    '.expo',
    'android',
    'dist',
    'release'
  ].some((token) => normalized === token || normalized.startsWith(`${token}/`));
}

function prepareTargetRoot(targetRoot) {
  try {
    mkdirSync(targetRoot, { recursive: true });
    for (const entry of readdirSync(targetRoot, { withFileTypes: true })) {
      if (entry.name === 'node_modules') {
        continue;
      }
      rmSync(resolve(targetRoot, entry.name), { recursive: true, force: true });
    }
  } catch (error) {
    const fallbackRoot = `${requestedShortRoot}-${Date.now()}`;
    shortRoot = fallbackRoot;
    shortV3Root = resolve(shortRoot, 'carloi-v3');
    shortAppRoot = resolve(shortV3Root, 'apps', 'mobile');
    targetRoot = shortV3Root;
    mkdirSync(targetRoot, { recursive: true });
  }
  return targetRoot;
}

function copyWorkspace(sourceRoot, targetRoot) {
  const preparedRoot = prepareTargetRoot(targetRoot);
  cpSync(sourceRoot, preparedRoot, {
    recursive: true,
    filter(source) {
      const relPath = relative(sourceRoot, source);
      if (!relPath) {
        return true;
      }
      return !shouldSkip(relPath);
    }
  });
  return preparedRoot;
}

function run(command, args, cwd) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32'
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
}

copyWorkspace(v3Root, shortV3Root);
if (!existsSync(resolve(shortV3Root, 'node_modules'))) {
  run('npm', ['install', '--no-audit', '--prefer-offline'], shortV3Root);
}
run('npm', ['run', 'build'], shortV3Root);
run('npm', ['run', 'sync:icon', '--workspace', '@carloi-v3/mobile'], shortV3Root);
run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean'], shortAppRoot);
run('npm', ['run', 'sync:android-local-properties', '--workspace', '@carloi-v3/mobile'], shortV3Root);
run('gradlew.bat', ['assembleRelease'], resolve(shortAppRoot, 'android'));

const builtApkPath = resolve(shortAppRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!existsSync(builtApkPath)) {
  throw new Error(`APK not found at ${builtApkPath}`);
}

mkdirSync(resolve(outputApkPath, '..'), { recursive: true });
copyFileSync(builtApkPath, outputApkPath);
console.log(`[CarloiV3][APK] copied ${builtApkPath} -> ${outputApkPath}`);
