import { spawnSync } from 'node:child_process';
import { copyFileSync, cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(__dirname, '..');
const repoRoot = resolve(mobileRoot, '..');
const sharedRoot = resolve(repoRoot, 'carloi-v2-shared');
const shortMobileRoot = process.env.CARLOI_SHORT_BUILD_ROOT || 'C:\\v2m';
const shortSharedRoot = resolve(shortMobileRoot, '..', 'carloi-v2-shared');
const outputApkPath = resolve(repoRoot, 'release', 'Carloi-v2-production-final.apk');

const env = {
  ...process.env,
  NODE_ENV: 'production',
  EXPO_PUBLIC_API_BASE_URL: 'https://api.carloi.com',
  CARLOI_ICON_SOURCE: resolve(repoRoot, 'carloi.png'),
};

function shouldSkip(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return [
    'node_modules',
    '.expo',
    'android',
    'dist',
    'release',
    'expo-v2.out.log',
    'expo-v2.err.log',
  ].some((token) => normalized === token || normalized.startsWith(`${token}/`));
}

function copyProject(sourceRoot, targetRoot) {
  rmSync(targetRoot, { recursive: true, force: true });
  cpSync(sourceRoot, targetRoot, {
    recursive: true,
    filter(source) {
      const relPath = relative(sourceRoot, source);
      if (!relPath) {
        return true;
      }
      return !shouldSkip(relPath);
    },
  });
}

function run(command, args, cwd) {
  const executable = process.platform === 'win32' && command === 'npm' ? 'npm.cmd' : command;
  const result = spawnSync(executable, args, {
    cwd,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed in ${cwd}`);
  }
}

copyProject(sharedRoot, shortSharedRoot);
copyProject(mobileRoot, shortMobileRoot);

run('npm', ['install'], shortSharedRoot);
run('npm', ['run', 'build'], shortSharedRoot);
run('npm', ['install'], shortMobileRoot);
run('npx', ['expo', 'prebuild', '--platform', 'android', '--clean'], shortMobileRoot);
run('npm', ['run', 'sync:android-local-properties'], shortMobileRoot);
run('gradlew.bat', ['assembleRelease'], resolve(shortMobileRoot, 'android'));

const builtApkPath = resolve(shortMobileRoot, 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');

if (!existsSync(builtApkPath)) {
  throw new Error(`APK not found at ${builtApkPath}`);
}

mkdirSync(resolve(outputApkPath, '..'), { recursive: true });
copyFileSync(builtApkPath, outputApkPath);

console.log(`[CarloiV2][APK] copied ${builtApkPath} -> ${outputApkPath}`);
