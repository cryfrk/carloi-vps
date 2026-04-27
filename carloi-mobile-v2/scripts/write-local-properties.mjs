import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const androidDir = resolve(projectRoot, 'android');
const localPropertiesPath = resolve(androidDir, 'local.properties');

const sdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  process.env.LOCALAPPDATA ? resolve(process.env.LOCALAPPDATA, 'Android', 'Sdk') : null,
].filter(Boolean);

const sdkDir = sdkCandidates.find((candidate) => existsSync(candidate));

if (!sdkDir) {
  throw new Error(
    `Android SDK not found. Checked: ${sdkCandidates.join(', ') || 'no candidates available'}`,
  );
}

mkdirSync(androidDir, { recursive: true });
const escapedSdkDir = sdkDir.replace(/\\/g, '\\\\');
writeFileSync(localPropertiesPath, `sdk.dir=${escapedSdkDir}\n`, 'utf8');

console.log(`[CarloiV2][Android] wrote ${localPropertiesPath} -> ${sdkDir}`);
